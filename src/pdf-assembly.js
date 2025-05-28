"use strict";

import * as PDFLIB from "pdf-lib";
import * as formatUtil from "./format-strings.js";
import * as excelData from "./database-data.js";

function createDataObject(baseConfig, overrides) {
  return { ...baseConfig, ...overrides };
}

// Add image compression function with better error handling
async function compressImage(imageBytes, quality = 0.7) {
  try {
    // Create canvas for image compression
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Create image from bytes
    const blob = new Blob([imageBytes], { type: "image/png" });
    const img = new Image();
    const imageUrl = URL.createObjectURL(blob);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Only reduce size if the image is large enough to benefit
    const reductionFactor = img.width > 200 ? 0.75 : 1.0; // Only compress larger images
    canvas.width = Math.floor(img.width * reductionFactor);
    canvas.height = Math.floor(img.height * reductionFactor);

    // Draw and compress
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Convert back to bytes with compression
    const compressedBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality); // Use JPEG for better compression
    });

    URL.revokeObjectURL(imageUrl);
    const compressedBytes = await compressedBlob.arrayBuffer();

    // Only use compressed version if it's actually smaller
    if (compressedBytes.byteLength < imageBytes.byteLength) {
      console.log(
        `Image compressed: ${imageBytes.byteLength} -> ${compressedBytes.byteLength} bytes`
      );
      return compressedBytes;
    } else {
      console.log("Compression not beneficial, using original");
      return imageBytes;
    }
  } catch (error) {
    console.log("Image compression failed, using original:", error.message);
    return imageBytes;
  }
}

async function fetchImage(TimbreData, imageCache, defaultImageBytes) {
  try {
    // Check if we have pre-cached compressed bytes for this image
    const cachedBytes = imageCache.get(TimbreData.Timbre + "_compressed");
    if (cachedBytes) {
      return cachedBytes;
    }

    // Check if we have default image bytes
    const defaultBytes = imageCache.get("_default_compressed");
    if (defaultBytes) {
      console.error(`Using default image for ${TimbreData.CdgIntRecep}`);
      return defaultBytes;
    }

    // Last resort - try to fetch the image
    const response = await fetch(TimbreData.Timbre);
    if (response.ok) {
      const originalBytes = await response.arrayBuffer();
      // Compress the image before caching
      const compressedBytes = await compressImage(originalBytes, 0.7);
      imageCache.set(TimbreData.Timbre + "_compressed", compressedBytes);
      return compressedBytes;
    } else {
      console.error(`Failed to fetch image: ${TimbreData.Timbre}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching image: ${error.message}`);
    return null;
  }
}

async function drawImageToPdf(TimbreData, imageCache, defaultImageBytes) {
  try {
    // Check if image is already embedded and cached
    if (imageCache.has(TimbreData.Timbre + "_embedded")) {
      const cachedImage = imageCache.get(TimbreData.Timbre + "_embedded");
      const pngDims = cachedImage.scale(0.62);
      TimbreData.page.drawImage(cachedImage, {
        x: TimbreData.TimbreX,
        y: TimbreData.TimbreY,
        width: pngDims.width,
        height: pngDims.height,
      });
      return;
    }

    const imageBytes = await fetchImage(
      TimbreData,
      imageCache,
      defaultImageBytes
    );

    if (!imageBytes) return;

    // Determine image type and embed accordingly
    let embeddedImage;
    try {
      // Try JPEG first for compressed images
      embeddedImage = await TimbreData.pdfDoc.embedJpg(imageBytes);
    } catch (jpegError) {
      try {
        // Fall back to PNG
        embeddedImage = await TimbreData.pdfDoc.embedPng(imageBytes);
      } catch (pngError) {
        console.error("Failed to embed image:", pngError.message);
        return;
      }
    }

    // Cache the embedded image for reuse
    imageCache.set(TimbreData.Timbre + "_embedded", embeddedImage);

    const imageDims = embeddedImage.scale(0.62);
    TimbreData.page.drawImage(embeddedImage, {
      x: TimbreData.TimbreX,
      y: TimbreData.TimbreY,
      width: imageDims.width,
      height: imageDims.height,
    });
  } catch (error) {
    console.log(`Error in drawImageToPdf function: ${error}`);
  }
}
let isSaldoAnterior = false;

async function printTextToPdf(inputData, SaldoAnterior, fontCache) {
  try {
    // Use a standard font with caching
    let linePadding;
    let font;

    // Check if font is already cached
    if (fontCache.has(inputData.fontFamily)) {
      font = fontCache.get(inputData.fontFamily);
    } else {
      font = await inputData.pdfDoc.embedFont(
        PDFLIB.StandardFonts[inputData.fontFamily]
      );
      fontCache.set(inputData.fontFamily, font);
    }

    console.log(SaldoAnterior);
    if (inputData.linePadding !== undefined) {
      linePadding = inputData.linePadding;
    } else
      linePadding =
        inputData.maxHeight / inputData.lines.length - inputData.fontSize;
    let textColor = PDFLIB.rgb(...inputData.textColor.map((val) => val / 255));
    const lineHeight = inputData.fontSize + linePadding;
    inputData.y += lineHeight * ((inputData.lines.length - 1) / 2);
    if (inputData.alignment === "left") {
      inputData.lines.forEach((line) => {
        if (line.includes("$-")) {
          textColor = PDFLIB.rgb(0, 0, 1);
        } else {
          textColor = PDFLIB.rgb(
            ...inputData.textColor.map((val) => val / 255)
          );
        }

        console.log(line);
        inputData.page.drawText(line, {
          x: inputData.x,
          y: inputData.y,
          size: inputData.fontSize,
          font: font,
          color: textColor,
        });
        inputData.y -= lineHeight; // Adjust Y position for next line
      });
    }

    if (inputData.alignment === "center") {
      inputData.lines.forEach((line) => {
        const lineWidth = font.widthOfTextAtSize(line, inputData.fontSize);
        if (line === "Subsidio" || line.includes("$-")) {
          textColor = PDFLIB.rgb(0, 0, 1);
        } else {
          textColor = PDFLIB.rgb(
            ...inputData.textColor.map((val) => val / 255)
          );
        }
        inputData.page.drawText(line, {
          x: inputData.x - lineWidth / 2,
          y: inputData.y,
          size: inputData.fontSize,
          font: font,
          color: textColor,
        });
        inputData.y -= lineHeight; // Adjust Y position for next line
      });
    }

    if (inputData.alignment === "right") {
      inputData.lines.forEach((line, index) => {
        const lineWidth = font.widthOfTextAtSize(line, inputData.fontSize);
        if (line === "Subsidio" || line.includes("$-")) {
          textColor = PDFLIB.rgb(0, 0, 1);
        } else {
          textColor = PDFLIB.rgb(
            ...inputData.textColor.map((val) => val / 255)
          );
        }
        inputData.page.drawText(line, {
          x: inputData.x - lineWidth,
          y: inputData.y,
          size: inputData.fontSize,
          font: font,
          color: textColor,
        });

        inputData.y -= lineHeight; // Adjust Y position for next line
      });
    }
  } catch (error) {
    console.log(`Error in printTextToPdf function: ${error}`);
  }
}

async function getFormattedData(
  inputStringArray,
  pdfDoc,
  fontSize,
  fontFamily,
  maxWidth,
  fontCache
) {
  try {
    let font;

    // Check if font is already cached
    if (fontCache.has(fontFamily)) {
      font = fontCache.get(fontFamily);
    } else {
      font = await pdfDoc.embedFont(PDFLIB.StandardFonts[fontFamily]);
      fontCache.set(fontFamily, font);
    }

    const formattedStringArray = [];

    inputStringArray.forEach((line) => {
      const text = line.trim().split(/\s+/);

      let lineString = "";
      text.reduce((sumOfWidth, cur) => {
        const curWidth = font.widthOfTextAtSize(cur + " ", fontSize);

        if (sumOfWidth + curWidth > maxWidth) {
          formattedStringArray.push(lineString.trim());
          lineString = "";
          sumOfWidth = 0;
        }
        lineString += cur + " ";
        return sumOfWidth + curWidth;
      }, 0);
      formattedStringArray.push(lineString.trim());
    });
    return formattedStringArray;
  } catch (error) {
    console.log(`Error in getFormattedData function: ${error}`);
  }
}

export async function assemblePDF(
  template,
  disableAviso,
  progressManager = null
) {
  try {
    const mainDataObject = excelData.fetchData();
    console.log(mainDataObject);

    // Initialize progress tracking
    const totalPages = mainDataObject.Numero.length;
    let processedPages = 0;

    // Create global caches for maximum reuse
    const imageCache = new Map();
    const fontCache = new Map();

    // Update progress: Starting image pre-loading
    if (progressManager) {
      progressManager.updatePhase(
        "Pre-loading images",
        `Processing ${[...new Set(mainDataObject.Timbre)].length} unique images`
      );
    }

    // Pre-load and cache all unique images with compression
    console.log("Pre-loading and compressing unique images...");
    const uniqueImages = [...new Set(mainDataObject.Timbre)];
    let defaultImageBytes = null;

    for (let i = 0; i < uniqueImages.length; i++) {
      const imagePath = uniqueImages[i];
      try {
        const response = await fetch(imagePath);
        if (response.ok) {
          const originalBytes = await response.arrayBuffer();
          // Compress each unique image
          const compressedBytes = await compressImage(originalBytes, 0.7);
          imageCache.set(imagePath + "_compressed", compressedBytes);
          console.log(`Processed image: ${imagePath}`);

          // Update progress for image processing
          if (progressManager) {
            progressManager.updatePhase(
              "Pre-loading images",
              `${i + 1}/${uniqueImages.length} images processed`
            );
          }
        }
      } catch (error) {
        console.log(`Failed to pre-load image ${imagePath}:`, error.message);
      }
    }

    // Pre-load and compress default fallback image
    try {
      const fallbackResponse = await fetch("/15246448-7.png");
      if (fallbackResponse.ok) {
        const originalBytes = await fallbackResponse.arrayBuffer();
        const compressedBytes = await compressImage(originalBytes, 0.7);
        imageCache.set("_default_compressed", compressedBytes);
      }
    } catch (error) {
      console.log("Failed to load default image:", error.message);
    }

    // Update progress: Loading template
    if (progressManager) {
      progressManager.updatePhase(
        "Loading template",
        "Processing PDF template"
      );
    }

    // fetch template and convert it to raw binary data buffer
    const existingPdfBytes = await fetch(template).then((res) =>
      res.arrayBuffer()
    );
    // create template PDF from buffer
    const templatePdfDoc = await PDFLIB.PDFDocument.load(existingPdfBytes);

    // Create PDF with compression settings
    const pdfDoc = await PDFLIB.PDFDocument.create();

    // Update progress: Pre-embedding fonts
    if (progressManager) {
      progressManager.updatePhase(
        "Initializing fonts",
        "Pre-embedding fonts for reuse"
      );
    }

    // Pre-embed all fonts that will be reused
    console.log("Pre-embedding fonts...");
    const helveticaFont = await pdfDoc.embedFont(
      PDFLIB.StandardFonts.Helvetica
    );
    const helveticaBoldFont = await pdfDoc.embedFont(
      PDFLIB.StandardFonts.HelveticaBold
    );
    fontCache.set("Helvetica", helveticaFont);
    fontCache.set("HelveticaBold", helveticaBoldFont);

    ////////////////////////////////////////////////
    ////////////GET STATIC EXCEL VALUES////////////
    //////////////////////////////////////////////
    const RUTEmisor = "76607412-K";
    const CostoM3Agua = mainDataObject.CostoM3Agua[0];
    const CostoM3AlcantarilladoTratamiento =
      mainDataObject.CostoM3AlcantarilladoTratamiento[0];
    const TipoBoleta = `BOLETA ELECTRONICA`;
    const TimbreTexto = `Timbre electrónico S.I.I`;
    const FchVenc = formatUtil.getShortExpiryDate();
    const FchEmis = formatUtil.getIssueDate();

    // Update progress: Starting page generation
    if (progressManager) {
      progressManager.updatePhase(
        "Generating pages",
        `Processing ${totalPages} boletas`
      );
    }

    // Process pages in smaller batches for better compression
    const batchSize = 20; // Smaller batches

    for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalPages);

      // Update progress for batch
      if (progressManager) {
        const batchNumber = Math.floor(batchStart / batchSize) + 1;
        const totalBatches = Math.ceil(totalPages / batchSize);
        progressManager.updatePhase(
          "Processing batch",
          `Batch ${batchNumber}/${totalBatches} (pages ${
            batchStart + 1
          }-${batchEnd})`
        );
      }

      console.log(
        `Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(
          totalPages / batchSize
        )}: pages ${batchStart + 1}-${batchEnd}`
      );

      // Copy template pages for this batch
      const templatePages = await pdfDoc.copyPages(
        templatePdfDoc,
        Array(batchEnd - batchStart).fill(0)
      );

      for (let i = batchStart; i < batchEnd; i++) {
        const pageIndex = i - batchStart;
        const templatePage = templatePages[pageIndex];

        // Add the template page to main PDF Doc
        pdfDoc.addPage(templatePage);

        // Get current page
        const page = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

        ////////////////////////////////////////////////
        ////////////GET EXCEL COLUMN VALUES////////////
        //////////////////////////////////////////////

        const Folio = mainDataObject.Folio[i];
        const Numero = mainDataObject.Numero[i];
        const CdgIntRecep = mainDataObject.CdgIntRecep[i];
        const RznSocRecep = mainDataObject.RznSocRecep[i];
        const DirRecep = mainDataObject.DirRecep[i];
        const CiudadRecep = mainDataObject.CiudadRecep[i];
        const VlrPagar = mainDataObject.VlrPagar[i];
        const CargoFijo = mainDataObject.CargoFijo[i];
        const CostoTotalAgua = mainDataObject.CostoTotalAgua[i];
        const CostoTotalAlcantarilladoTratamiento =
          mainDataObject.CostoTotalAlcantarilladoTratamiento[i];
        const Repactacion = mainDataObject.Repactacion[i];
        const Multas = mainDataObject.Multas[i];
        const Otros = mainDataObject.Otros[i];
        const MntTotal = mainDataObject.MntTotal[i];
        const LecturaAnterior = mainDataObject.LecturaAnterior[i];
        const LecturaActual = mainDataObject.LecturaActual[i];
        const ConsumoM3 = mainDataObject.ConsumoM3[i];
        const SaldoAnterior = mainDataObject.SaldoAnterior[i];
        const Descuento = mainDataObject.Descuento[i];
        const Subsidio = mainDataObject.Subsidio[i];
        const Aviso = mainDataObject.Aviso[i];
        const Timbre = mainDataObject.Timbre[i];
        const Color = mainDataObject.Color[i];

        ////////////////////////////////////////////////
        //////////////////DATA VALUES//////////////////
        //////////////////////////////////////////////
        const fontSize = {
          small: 12,
          medium: 14,
          large: 16,
          larger: 18,
        };
        const mainFont = "Helvetica";
        const mainFontBold = "HelveticaBold";
        const mainColor = [0, 0, 0];
        const alertColor = [204, 0, 3];
        const titleColor = [32, 44, 100];

        ////////////////////////////////////////////////
        //////////////////COORDINATES//////////////////
        //////////////////////////////////////////////
        const leftSideOfPage = 45;
        const rightSideOfPage = 560;
        const middleOfPageX = 305;
        const rightSideOfPageForCenterAligned = 451;
        //PDF DIMENTIONS: 612 792
        /////////////////////////////////////////////
        const TipoBoletaPos = {
          x: rightSideOfPageForCenterAligned,
          y: 717,
          al: "center",
        };
        const DetalleClientePos = { x: leftSideOfPage, y: 620, al: "left" };
        const NumeroClientePos = {
          x: rightSideOfPageForCenterAligned,
          y: 595,
          al: "center",
        };
        const FchVencPos = { x: leftSideOfPage, y: 545, al: "left" };
        const VlrPagarPos = { x: rightSideOfPage, y: 545, al: "right" };
        const DetalleConsumoTituloPos = {
          x: leftSideOfPage + 7,
          y: 492,
          al: "left",
        };
        const Consumo1Pos = { x: leftSideOfPage + 10, y: 435, al: "left" };
        const ConsumoValores1Pos = { x: 265, y: 435, al: "right" };
        // const Consumo2Pos = { x: 215, y: 435, al: 'left' };
        // const ConsumoValores2Pos = { x: 370, y: 435, al: 'right' };
        const MntTotalTituloPos = {
          x: leftSideOfPage + 10,
          y: 381,
          al: "left",
        };
        const FchEmisTituloPos = { x: leftSideOfPage + 10, y: 367, al: "left" };
        const MntTotalPos = { x: 265, y: 381, al: "right" };
        const FchEmisPos = { x: 265, y: 367, al: "right" };
        const LecturaAnteriorPos = { x: leftSideOfPage, y: 330, al: "left" };
        const LecturaActualPos = { x: middleOfPageX, y: 330, al: "center" };
        const ConsumoM3Pos = { x: rightSideOfPage, y: 330, al: "right" };
        const TimbrePos = { x: 60, y: 210 };
        const TimbreTextoPos = { x: 155, y: 195, al: "center" };
        const DesglosePos = { x: 320, y: 260, al: "left" };
        const DesgloseValoresPos = {
          x: rightSideOfPage - 26,
          y: 260,
          al: "right",
        };
        const VlrPagarTitulo2Pos = { x: 320, y: 200, al: "left" };
        const VlrPagar2Pos = { x: rightSideOfPage - 24, y: 200, al: "right" };
        const AvisoPos = { x: leftSideOfPage, y: 125, al: "left" };

        const textArrays = {
          TipoBoleta: [`RUT: ${RUTEmisor}`, `${TipoBoleta}`, `N° ${Folio}`],
          DetalleCliente: [RznSocRecep, DirRecep, CiudadRecep],
          CdgIntRecep: [`NUMERO CLIENTE: ${CdgIntRecep}`],
          Vencimiento: [`VENCIMIENTO: ${FchVenc}`],
          VlrPagar: [`TOTAL A PAGAR: ${VlrPagar}`],
          DetalleConsumoTitulo: [`DETALLE DE CONSUMO:`],
          Consumo1: [`Cargo Fijo:`, `Agua:`, `Alcantarillado y Tratamiento:`],
          ConsumoValores1: [
            `${CargoFijo}`,
            `${CostoTotalAgua}`,
            `${CostoTotalAlcantarilladoTratamiento}`,
          ],
          // Consumo2: [
          //   ``, // Placeholder String
          //   ``, // Placeholder String
          //   ``, // Placeholder String
          //   ``, // Placeholder String
          // ],
          // ConsumoValores2: [``, ``, ``, ``],
          MntTotalTitulo: [`TOTAL MES:`],
          FchEmisTitulo: [`FECHA EMISION:`],
          MntTotal: [`${MntTotal}`],
          FchEmis: [`${FchEmis}`],
          LecturaAnterior: [`LEC ANTERIOR: ${LecturaAnterior}`],
          LecturaActual: [`LEC ACTUAL: ${LecturaActual}`],
          ConsumoM3: [`CONSUMO: ${ConsumoM3}`],
          TimbreTexto: [TimbreTexto],
          Desglose: [
            `Numero Cliente:`,
            `Vencimiento:`,
            `Total del Mes:`,
            `Saldo Anterior:`,
          ],
          DesgloseValores: [
            `${CdgIntRecep}`,
            `${FchVenc}`,
            `${MntTotal}`,
            `${SaldoAnterior}`,
          ],
          VlrPagarTitulo2: [`TOTAL A PAGAR:`],
          VlrPagar2: [` ${VlrPagar}`],
          Aviso: [`${Aviso}`],
        };
        if (Repactacion !== "$0") {
          textArrays.Desglose.push(`Repactacion`);
          textArrays.DesgloseValores.push(`${Repactacion}`);
        }
        if (Subsidio !== "$0") {
          textArrays.Desglose.push(`Subsidio`);
          textArrays.DesgloseValores.push(`${Subsidio}`);
        }
        // if (Multas !== '$0') {
        //   textArrays.Consumo2.pop();
        //   textArrays.ConsumoValores2.pop();
        //   textArrays.Consumo2.unshift(`Multa`);
        //   textArrays.ConsumoValores2.unshift(`${Multas}`);
        // }
        // if (Descuento !== '$0') {
        //   textArrays.Consumo2.pop();
        //   textArrays.ConsumoValores2.pop();
        //   textArrays.Consumo2.unshift(`Descuento`);
        //   textArrays.ConsumoValores2.unshift(`${Descuento}`);
        // }
        // Create base config for Data Objects
        const baseConfig = {
          textColor: mainColor,
          fontFamily: mainFont,
          pdfDoc,
          page,
          Timbre,
          RznSocRecep,
          CdgIntRecep,
          async formatData() {
            this.formattedData = await getFormattedData(
              this.data,
              this.pdfDoc,
              this.fontSize,
              this.fontFamily,
              this.maxWidth,
              fontCache
            );
          },
        };

        const TipoBoletaData = createDataObject(baseConfig, {
          data: textArrays.TipoBoleta,
          x: TipoBoletaPos.x,
          y: TipoBoletaPos.y,
          maxWidth: 210,
          maxHeight: 60,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: TipoBoletaPos.al,
        });

        const DetalleClienteData = createDataObject(baseConfig, {
          data: textArrays.DetalleCliente,
          x: DetalleClientePos.x,
          y: DetalleClientePos.y,
          maxWidth: 210,
          maxHeight: 60,
          fontSize: fontSize.medium,
          fontFamily: mainFontBold,
          alignment: DetalleClientePos.al,
        });

        const NumeroClienteData = createDataObject(baseConfig, {
          data: textArrays.CdgIntRecep,
          x: NumeroClientePos.x,
          y: NumeroClientePos.y,
          maxWidth: 300,
          maxHeight: 60,
          fontSize: fontSize.larger,
          fontFamily: mainFontBold,
          alignment: NumeroClientePos.al,
        });

        const VencimientoData = createDataObject(baseConfig, {
          data: textArrays.Vencimiento,
          x: FchVencPos.x,
          y: FchVencPos.y,
          maxWidth: 245,
          maxHeight: 35,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: FchVencPos.al,
        });

        const VlrPagarData = createDataObject(baseConfig, {
          data: textArrays.VlrPagar,
          x: VlrPagarPos.x,
          y: VlrPagarPos.y,
          maxWidth: 245,
          maxHeight: 35,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: VlrPagarPos.al,
        });

        const DetalleConsumoTituloData = createDataObject(baseConfig, {
          data: textArrays.DetalleConsumoTitulo,
          x: DetalleConsumoTituloPos.x,
          y: DetalleConsumoTituloPos.y,
          maxWidth: 350,
          maxHeight: 70,
          textColor: titleColor,
          fontSize: fontSize.larger,
          fontFamily: mainFontBold,
          alignment: DetalleConsumoTituloPos.al,
        });

        const consumoData1 = createDataObject(baseConfig, {
          data: textArrays.Consumo1,
          x: Consumo1Pos.x,
          y: Consumo1Pos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.small,
          alignment: Consumo1Pos.al,
        });

        const consumoValoresData1 = createDataObject(baseConfig, {
          data: textArrays.ConsumoValores1,
          x: ConsumoValores1Pos.x,
          y: ConsumoValores1Pos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.small,
          fontFamily: mainFontBold,
          alignment: ConsumoValores1Pos.al,
        });

        // const consumoData2 = createDataObject(baseConfig, {
        //   data: textArrays.Consumo2,
        //   x: Consumo2Pos.x,
        //   y: Consumo2Pos.y,
        //   maxWidth: 250,
        //   maxHeight: 70,
        //   fontSize: fontSize.small,
        //   alignment: Consumo2Pos.al,
        // });

        // const consumoValoresData2 = createDataObject(baseConfig, {
        //   data: textArrays.ConsumoValores2,
        //   x: ConsumoValores2Pos.x,
        //   y: ConsumoValores2Pos.y,
        //   maxWidth: 250,
        //   maxHeight: 70,
        //   fontSize: fontSize.small,
        //   fontFamily: mainFontBold,
        //   alignment: ConsumoValores2Pos.al,
        // });

        const MntTotalTituloData = createDataObject(baseConfig, {
          data: textArrays.MntTotalTitulo,
          x: MntTotalTituloPos.x,
          y: MntTotalTituloPos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.medium,
          fontFamily: mainFontBold,
          alignment: MntTotalTituloPos.al,
        });

        const FchEmisTituloData = createDataObject(baseConfig, {
          data: textArrays.FchEmisTitulo,
          x: FchEmisTituloPos.x,
          y: FchEmisTituloPos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.small,
          fontFamily: mainFontBold,
          alignment: FchEmisTituloPos.al,
        });
        const MntTotalData = createDataObject(baseConfig, {
          data: textArrays.MntTotal,
          x: MntTotalPos.x,
          y: MntTotalPos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.medium,
          fontFamily: mainFontBold,
          alignment: MntTotalPos.al,
        });

        const FchEmisData = createDataObject(baseConfig, {
          data: textArrays.FchEmis,
          x: FchEmisPos.x,
          y: FchEmisPos.y,
          maxWidth: 250,
          maxHeight: 70,
          fontSize: fontSize.small,
          fontFamily: mainFontBold,
          alignment: FchEmisPos.al,
        });

        const LecturaAnteriorData = createDataObject(baseConfig, {
          data: textArrays.LecturaAnterior,
          x: LecturaAnteriorPos.x,
          y: LecturaAnteriorPos.y,
          maxWidth: 180,
          maxHeight: 26,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: LecturaAnteriorPos.al,
        });

        const LecturaActualData = createDataObject(baseConfig, {
          data: textArrays.LecturaActual,
          x: LecturaActualPos.x,
          y: LecturaActualPos.y,
          maxWidth: 180,
          maxHeight: 26,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: LecturaActualPos.al,
        });

        const ConsumoM3Data = createDataObject(baseConfig, {
          data: textArrays.ConsumoM3,
          x: ConsumoM3Pos.x,
          y: ConsumoM3Pos.y,
          maxWidth: 180,
          maxHeight: 26,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: ConsumoM3Pos.al,
        });

        const TimbreData = createDataObject(baseConfig, {
          data: textArrays.TimbreTexto,
          Numero,
          RznSocRecep,
          Timbre,
          x: TimbreTextoPos.x,
          y: TimbreTextoPos.y,
          TimbreX: TimbrePos.x,
          TimbreY: TimbrePos.y,
          maxWidth: 252,
          maxHeight: 80,
          fontSize: fontSize.large,
          alignment: TimbreTextoPos.al,
        });

        const DesgloseData = createDataObject(baseConfig, {
          data: textArrays.Desglose,
          x: DesglosePos.x,
          y: DesglosePos.y,
          maxWidth: 252,
          maxHeight: 80,
          fontFamily: mainFont,
          fontSize: fontSize.small,
          alignment: DesglosePos.al,
        });

        const DesgloseValoresData = createDataObject(baseConfig, {
          data: textArrays.DesgloseValores,
          x: DesgloseValoresPos.x,
          y: DesgloseValoresPos.y,
          maxWidth: 252,
          maxHeight: 80,
          fontSize: fontSize.small,
          fontFamily: mainFontBold,
          alignment: DesgloseValoresPos.al,
        });

        const VlrPagarTituloData2 = createDataObject(baseConfig, {
          data: textArrays.VlrPagarTitulo2,
          x: VlrPagarTitulo2Pos.x,
          y: VlrPagarTitulo2Pos.y,
          maxWidth: 152,
          maxHeight: 22,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: VlrPagarTitulo2Pos.al,
        });

        const VlrPagarData2 = createDataObject(baseConfig, {
          data: textArrays.VlrPagar2,
          x: VlrPagar2Pos.x,
          y: VlrPagar2Pos.y,
          maxWidth: 252,
          maxHeight: 22,
          fontSize: fontSize.large,
          fontFamily: mainFontBold,
          alignment: VlrPagar2Pos.al,
        });

        const AvisoData = createDataObject(baseConfig, {
          textColor: Color,
          data: textArrays.Aviso,
          x: AvisoPos.x,
          y: AvisoPos.y,
          maxWidth: 530,
          maxHeight: 90,
          fontSize: fontSize.medium,
          alignment: AvisoPos.al,
          linePadding: 3,
        });

        // Create Array with all Objects to use in initilization loop
        const dataObjects = [
          TipoBoletaData,
          DetalleClienteData,
          NumeroClienteData,
          VencimientoData,
          VlrPagarData,
          DetalleConsumoTituloData,
          consumoData1,
          consumoValoresData1,
          // consumoData2,
          // consumoValoresData2,
          MntTotalTituloData,
          FchEmisTituloData,
          MntTotalData,
          FchEmisData,
          LecturaAnteriorData,
          LecturaActualData,
          ConsumoM3Data,
          TimbreData,
          DesgloseData,
          DesgloseValoresData,
          VlrPagarData2,
          VlrPagarTituloData2,
          // AvisoData, // AvisoData will be handled conditionally
        ];
        console.log(TimbreData);
        // Initilize key:values for formatted text in Objects (lines)
        for (const dataObject of dataObjects) {
          // Initialize formattedData
          await dataObject.formatData();
          dataObject.lines = [...dataObject.formattedData];
          await printTextToPdf(dataObject, SaldoAnterior, fontCache);
        }

        // Conditionally process and print AvisoData
        if (
          !disableAviso &&
          mainDataObject.Aviso[i] &&
          String(mainDataObject.Aviso[i]).trim() !== ""
        ) {
          await AvisoData.formatData();
          AvisoData.lines = [...AvisoData.formattedData];
          await printTextToPdf(AvisoData, SaldoAnterior, fontCache);
        }

        await drawImageToPdf(TimbreData, imageCache, defaultImageBytes);

        // Update progress for each page
        processedPages++;
        if (progressManager) {
          const statusMessage = `Processing page ${processedPages} (Client: ${CdgIntRecep})`;
          progressManager.updateProgress(processedPages, statusMessage);
        }
      }

      // More aggressive memory management between batches
      if (typeof window !== "undefined" && window.gc) {
        window.gc(); // Force garbage collection if available
      }

      // Clear compressed image cache more frequently to save memory
      if ((batchStart / batchSize) % 2 === 0) {
        for (const [key, value] of imageCache.entries()) {
          if (key.endsWith("_compressed") && !key.startsWith("_default")) {
            imageCache.delete(key);
          }
        }
        console.log("Cleared compressed image cache to free memory");
      }
    }

    // Update progress: Finalizing PDF
    if (progressManager) {
      progressManager.updatePhase(
        "Finalizing PDF",
        "Applying compression and saving"
      );
    }

    // Save PDF with maximum compression options
    console.log("Saving PDF with maximum compression...");
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 10, // Even more aggressive compression
      updateFieldAppearances: false,
      // Additional compression options
      compress: true,
      fastWebView: true,
    });

    // Update progress: Creating blob and displaying
    if (progressManager) {
      progressManager.updatePhase(
        "Completing",
        "Creating PDF blob and displaying"
      );
    }

    // Create a blob with the bytes as type PDF
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    // Create URL from blob
    const pdfUrl = URL.createObjectURL(blob);
    // Assign URL to src of iFrame
    document.getElementById("pdfIframe").src = pdfUrl;

    // Log final file size
    const fileSizeMB = (pdfBytes.byteLength / (1024 * 1024)).toFixed(2);
    console.log(`PDF generation completed! Final file size: ${fileSizeMB} MB`);

    if (progressManager) {
      progressManager.updatePhase(
        "Complete",
        `PDF generated successfully (${fileSizeMB} MB)`
      );
    }
  } catch (error) {
    console.log(`Error in PDF Assembly Function: ${error}`);
    if (progressManager) {
      progressManager.error(
        error.message || "An error occurred during PDF generation"
      );
    }
    throw error;
  }
}
