'use strict';

import * as PDFLIB from 'pdf-lib';
import * as formatUtil from './format-strings.js';
import * as excelData from './database-data.js';

function createDataObject(baseConfig, overrides) {
  return { ...baseConfig, ...overrides };
}

async function fetchImage(TimbreData) {
  try {
    const response = await fetch(TimbreData.Timbre);
    if (response.ok) {
      return await response.arrayBuffer();
    } else if (response.status === 404) {
      console.error(`Client ${TimbreData.CdgIntRecep} S.I.I Timbre image not found. ${TimbreData.RznSocRecep} - ${TimbreData.Timbre}`);
      console.error(`Returning default placeholder Timbre /Timbre.png`);
      return await fetch(`/15246448-7.png`).then(res => res.arrayBuffer());
    }
  } catch (error) {
    console.error(`There was a problem fetching the image ${error.message}`);
    return null;
  }
}

async function drawImageToPdf(TimbreData) {
  try {
    const pngImageBytes = await fetchImage(TimbreData);

    if (!pngImageBytes) return;
    const pngImage = await TimbreData.pdfDoc.embedPng(pngImageBytes);
    const pngDims = pngImage.scale(0.62);
    TimbreData.page.drawImage(pngImage, {
      x: TimbreData.TimbreX,
      y: TimbreData.TimbreY,
      width: pngDims.width,
      height: pngDims.height,
    });
  } catch (error) {
    console.log(`Error in drawImageToPdf function: ${error}`);
  }
}

async function printTextToPdf(inputData) {
  try {
    // Use a standard font
    let linePadding;
    const font = await inputData.pdfDoc.embedFont(PDFLIB.StandardFonts[inputData.fontFamily]);

    if (inputData.linePadding !== undefined) {
      linePadding = inputData.linePadding;
    } else linePadding = inputData.maxHeight / inputData.lines.length - inputData.fontSize;
    const textColor = PDFLIB.rgb(...inputData.textColor.map(val => val / 255));
    const lineHeight = inputData.fontSize + linePadding;
    inputData.y += lineHeight * ((inputData.lines.length - 1) / 2);
    if (inputData.alignment === 'left') {
      inputData.lines.forEach(line => {
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

    if (inputData.alignment === 'center') {
      inputData.lines.forEach(line => {
        const lineWidth = font.widthOfTextAtSize(line, inputData.fontSize);

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

    if (inputData.alignment === 'right') {
      inputData.lines.forEach(line => {
        const lineWidth = font.widthOfTextAtSize(line, inputData.fontSize);

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

async function getFormattedData(inputStringArray, pdfDoc, fontSize, fontFamily, maxWidth) {
  try {
    const font = await pdfDoc.embedFont(PDFLIB.StandardFonts[fontFamily]);
    const formattedStringArray = [];

    inputStringArray.forEach(line => {
      const text = line.trim().split(/\s+/);

      let lineString = '';
      text.reduce((sumOfWidth, cur) => {
        const curWidth = font.widthOfTextAtSize(cur + ' ', fontSize);

        if (sumOfWidth + curWidth > maxWidth) {
          formattedStringArray.push(lineString.trim());
          lineString = '';
          sumOfWidth = 0;
        }
        lineString += cur + ' ';
        return sumOfWidth + curWidth;
      }, 0);
      formattedStringArray.push(lineString.trim());
    });
    return formattedStringArray;
  } catch (error) {
    console.log(`Error in getFormattedData function: ${error}`);
  }
}

export async function assemblePDF(template) {
  try {
    const mainDataObject = excelData.fetchData();
    console.log(mainDataObject);
    // fetch template and convert it to raw binary data buffer
    const existingPdfBytes = await fetch(template).then(res => res.arrayBuffer());
    // create template PDF from buffer
    const templatePdfDoc = await PDFLIB.PDFDocument.load(existingPdfBytes);
    // create empty PDF
    const pdfDoc = await PDFLIB.PDFDocument.create();

    ////////////////////////////////////////////////
    ////////////GET STATIC EXCEL VALUES////////////
    //////////////////////////////////////////////
    const RUTEmisor = '76607412-K';
    let Folio = 13316;
    const CostoM3Agua = mainDataObject.CostoM3Agua[0];
    const CostoM3Alcantarillado = mainDataObject.CostoM3Alcantarillado[0];
    const CostoM3Tratamiento = mainDataObject.CostoM3Tratamiento[0];
    const TipoBoleta = `BOLETA ELECTRONICA`;
    const TimbreTexto = `Timbre electrónico S.I.I`;
    const FchVenc = formatUtil.getShortExpiryDate();
    const FchEmis = formatUtil.getIssueDate();

    // Loop through all rows in excel sheet
    for (let i = 0; i < mainDataObject.Numero.length; i++) {
      // for (let i = 0; i < 80; i++) {
      // Check data on 'Numero' column and see if is a number
      //skip current iteration of loop if not a number

      // Copy first page from template.pdf
      const [templatePage] = await pdfDoc.copyPages(templatePdfDoc, [0]);

      // Add previously copied page to main PDF Doc
      pdfDoc.addPage(templatePage);

      // Get current page index
      const currentPdfPage = pdfDoc.getPageCount() - 1;

      // Select current page
      const page = pdfDoc.getPages()[currentPdfPage];

      ////////////////////////////////////////////////
      ////////////GET EXCEL COLUMN VALUES////////////
      //////////////////////////////////////////////

      const Numero = mainDataObject.Numero[i];
      const CdgIntRecep = mainDataObject.CdgIntRecep[i];
      const RznSocRecep = mainDataObject.RznSocRecep[i];
      const DirRecep = mainDataObject.DirRecep[i];
      const CiudadRecep = mainDataObject.CiudadRecep[i];
      const VlrPagar = mainDataObject.VlrPagar[i];
      const CargoFijo = mainDataObject.CargoFijo[i];
      const CostoTotalAgua = mainDataObject.CostoTotalAgua[i];
      const CostoTotalAlcantarillado = mainDataObject.CostoTotalAlcantarillado[i];
      const CostoTotalTratamiento = mainDataObject.CostoTotalTratamiento[i];
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
      //////////////DATA VALUES//////////////
      //////////////////////////////////////////////
      const fontSize = {
        small: 12,
        medium: 14,
        large: 16,
        larger: 18,
      };
      const mainFont = 'Helvetica';
      const mainFontBold = 'HelveticaBold';
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
      const TipoBoletaPos = { x: rightSideOfPageForCenterAligned, y: 717, al: 'center' };
      const DetalleClientePos = { x: leftSideOfPage, y: 620, al: 'left' };
      const NumeroClientePos = {
        x: rightSideOfPageForCenterAligned,
        y: 595,
        al: 'center',
      };
      const FchVencPos = { x: leftSideOfPage, y: 545, al: 'left' };
      const VlrPagarPos = { x: rightSideOfPage, y: 545, al: 'right' };
      const DetalleConsumoTituloPos = { x: leftSideOfPage, y: 492, al: 'left' };
      const Consumo1Pos = { x: leftSideOfPage, y: 435, al: 'left' };
      const ConsumoValores1Pos = { x: 200, y: 435, al: 'right' };
      const Consumo2Pos = { x: 215, y: 435, al: 'left' };
      const ConsumoValores2Pos = { x: 370, y: 435, al: 'right' };
      const MntTotalPos = { x: 370, y: 381, al: 'right' };
      const FchEmisPos = { x: 370, y: 367, al: 'right' };
      const LecturaAnteriorPos = { x: leftSideOfPage, y: 330, al: 'left' };
      const LecturaActualPos = { x: middleOfPageX, y: 330, al: 'center' };
      const ConsumoM3Pos = { x: rightSideOfPage, y: 330, al: 'right' };
      const TimbrePos = { x: 60, y: 210 };
      const TimbreTextoPos = { x: 155, y: 195, al: 'center' };
      const DesglosePos = { x: 320, y: 260, al: 'left' };
      const DesgloseValoresPos = { x: rightSideOfPage - 26, y: 260, al: 'right' };
      const VlrPagarTitulo2Pos = { x: 320, y: 200, al: 'left' };
      const VlrPagar2Pos = { x: rightSideOfPage - 24, y: 200, al: 'right' };
      const AvisoPos = { x: leftSideOfPage, y: 125, al: 'left' };

      const textArrays = {
        TipoBoleta: [`RUT: ${RUTEmisor}`, `${TipoBoleta}`, `N° ${Folio}`],
        DetalleCliente: [RznSocRecep, DirRecep, CiudadRecep],
        CdgIntRecep: [`NUMERO CLIENTE: ${CdgIntRecep}`],
        Vencimiento: [`VENCIMIENTO: ${FchVenc}`],
        VlrPagar: [`TOTAL A PAGAR: ${VlrPagar}`],
        DetalleConsumoTitulo: [`DETALLE DE CONSUMO:`],
        Consumo1: [`Cargo Fijo:`, `Agua:`, `Alcantarillado:`, `Tratamiento:`],
        ConsumoValores1: [`${CargoFijo}`, `${CostoTotalAgua}`, `${CostoTotalAlcantarillado}`, `${CostoTotalTratamiento}`],
        Consumo2: [
          ``, // Placeholder String
          ``, // Placeholder String
          ``, // Placeholder String
          ``, // Placeholder String
        ],
        ConsumoValores2: [``, ``, ``, ``],
        MntTotal: [`TOTAL DEL MES: ${MntTotal}`],
        FchEmis: [`FECHA DE EMISION: ${FchEmis}`],
        LecturaAnterior: [`LEC.ANTERIOR:${LecturaAnterior}`],
        LecturaActual: [`LEC.ACTUAL:${LecturaActual}`],
        ConsumoM3: [`CONSUMO M3:${ConsumoM3}`],
        TimbreTexto: [TimbreTexto],
        Desglose: [`Numero Cliente:`, `Vencimiento:`, `Total del Mes:`, `Saldo Anterior:`],
        DesgloseValores: [`${CdgIntRecep}`, `${FchVenc}`, `${MntTotal}`, `${SaldoAnterior}`],
        VlrPagarTitulo2: [`TOTAL A PAGAR:`],
        VlrPagar2: [` ${VlrPagar}`],
        Aviso: [`${Aviso}`],
      };
      if (Repactacion !== '$0') {
        textArrays.Desglose.push(`Repactacion`);
        textArrays.DesgloseValores.push(`${Repactacion}`);
      }
      if (Subsidio !== '$0') {
        textArrays.Desglose.push(`Subsidio`);
        textArrays.DesgloseValores.push(`${Subsidio}`);
      }
      if (Multas !== '$0') {
        textArrays.Consumo2.pop();
        textArrays.ConsumoValores2.pop();
        textArrays.Consumo2.unshift(`Multa`);
        textArrays.ConsumoValores2.unshift(`${Multas}`);
      }
      if (Descuento !== '$0') {
        textArrays.Consumo2.pop();
        textArrays.ConsumoValores2.pop();
        textArrays.Consumo2.unshift(`Descuento`);
        textArrays.ConsumoValores2.unshift(`${Descuento}`);
      }
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
          this.formattedData = await getFormattedData(this.data, this.pdfDoc, this.fontSize, this.fontFamily, this.maxWidth);
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

      const consumoData2 = createDataObject(baseConfig, {
        data: textArrays.Consumo2,
        x: Consumo2Pos.x,
        y: Consumo2Pos.y,
        maxWidth: 250,
        maxHeight: 70,
        fontSize: fontSize.small,
        alignment: Consumo2Pos.al,
      });

      const consumoValoresData2 = createDataObject(baseConfig, {
        data: textArrays.ConsumoValores2,
        x: ConsumoValores2Pos.x,
        y: ConsumoValores2Pos.y,
        maxWidth: 250,
        maxHeight: 70,
        fontSize: fontSize.small,
        fontFamily: mainFontBold,
        alignment: ConsumoValores2Pos.al,
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
        consumoData2,
        consumoValoresData2,
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
        AvisoData,
      ];
      console.log(TimbreData);
      // Initilize key:values for formatted text in Objects (lines)
      for (const dataObject of dataObjects) {
        // Initialize formattedData
        await dataObject.formatData();
        dataObject.lines = [...dataObject.formattedData];
        await printTextToPdf(dataObject);
      }
      await drawImageToPdf(TimbreData);
      Folio++;
    }

    // Save PDF Doc in bytes
    const pdfBytes = await pdfDoc.save();
    // Create a blob with the bytes as type PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    // Create URL from blob
    const pdfUrl = URL.createObjectURL(blob);
    // Assign URL to src of iFrame
    document.getElementById('pdfIframe').src = pdfUrl;
  } catch (error) {
    console.log(`Error in PDF Assembly Function: ${error}`);
  }
}
