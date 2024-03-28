'use strict';

import * as PDFLIB from 'pdf-lib';
import * as formatUtil from './format-strings.js';
import * as excelData from './database-data.js';
import * as userInput from './user-input.js';

function createDataObject(baseConfig, overrides) {
  return { ...baseConfig, ...overrides };
}

async function fetchImage(TimbreData) {
  try {
    const response = await fetch(TimbreData.Timbre);
    if (response.ok) {
      // console.log('response OK: ');
      return await response.arrayBuffer();
    } else if (response.status === 404) {
      console.error(
        `Client ${TimbreData.Numero} S.I.I Timbre image not found. ${TimbreData.RznSocRecep} - ${TimbreData.Timbre}`
      );
      console.error(`Returning default placeholder Timbre /Timbre.png`);
      return await fetch(`/Timbre.png`).then(res => res.arrayBuffer());
    }
  } catch (error) {
    console.error(`There was a problem fetching the image ${error.message}`);
    return null;
  }
}

async function drawImageToPdf(TimbreData) {
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
}

async function printTextToPdf(inputData) {
  // Use a standard font
  let linePadding;
  const font = await inputData.pdfDoc.embedFont(
    PDFLIB.StandardFonts[inputData.fontFamily]
  );
  console.log('linePadding: ', inputData.linePadding);

  if (inputData.linePadding !== undefined) {
    console.log('linePadding IF LOOP: ', inputData.linePadding);
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
        Color: textColor,
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
        Color: textColor,
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
        Color: textColor,
      });
      inputData.y -= lineHeight; // Adjust Y position for next line
    });
  }
}

async function getFormattedData(
  inputStringArray,
  pdfDoc,
  fontSize,
  fontFamily,
  maxWidth
) {
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
}

export async function assemblePDF(template) {
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
  const rutEmpresa = mainDataObject.rutEmpresa[0];
  const costoM3Agua = mainDataObject.costoM3Agua[0];
  const costoM3Alcantarillado = mainDataObject.costoM3Alcantarillado[0];
  const costoM3Tratamiento = mainDataObject.costoM3Tratamiento[0];
  const tipoBoleta = `BOLETA ELECTRONICA`;
  const TimbreTexto = `Timbre electrónico S.I.I`;
  const fechaVencimiento = formatUtil.getShortExpiryDate();
  const fechaEmision = formatUtil.getIssueDate();

  // Loop through all rows in excel sheet
  // for (let i = 0; i < mainDataObject.Numero.length; i++) {
  for (let i = 0; i < 10; i++) {
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

    const Folio = mainDataObject.Folio[i];
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
    const NumeroClientePos = { x: rightSideOfPageForCenterAligned, y: 595, al: 'center' };
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
    const DesgloseValoresPos = { x: rightSideOfPage - 32, y: 260, al: 'right' };
    const VlrPagar2Pos = { x: 320, y: 200, al: 'left' };
    const AvisoPos = { x: leftSideOfPage, y: 125, al: 'left' };

    const textArrays = {
      tipoBoleta: [`RUT: ${rutEmpresa}`, `${tipoBoleta}`, `N° ${Folio}`],
      detalleCliente: [RznSocRecep, DirRecep, CiudadRecep],
      CdgIntRecep: [`NUMERO CLIENTE: ${CdgIntRecep}`],
      vencimiento: [`VENCIMIENTO: ${fechaVencimiento}`],
      totalPagar: [`TOTAL A PAGAR: ${VlrPagar}`],
      detalleConsumoTitulo: [`DETALLE DE CONSUMO:`],
      consumo1: [`Cargo Fijo:`, `Agua:`, `Alcantarillado:`, `Tratamiento:`],
      consumoValores1: [
        `${CargoFijo}`,
        `${CostoTotalAgua}`,
        `${CostoTotalAlcantarillado}`,
        `${CostoTotalTratamiento}`,
      ],
      consumo2: [
        `Repactacion:`,
        `Multas:`,
        `Otros Cargos:`,
        ``, // Placeholder String
      ],
      consumoValores2: [`${Repactacion}`, `${Multas}`, `${Otros}`, ``],
      MntTotal: [`TOTAL DEL MES: ${MntTotal}`],
      fechaEmision: [`FECHA DE EMISION: ${fechaEmision}`],
      LecturaAnterior: [`LEC.ANTERIOR:${LecturaAnterior}`],
      LecturaActual: [`LEC.ACTUAL:${LecturaActual}`],
      ConsumoM3: [`CONSUMO M3:${ConsumoM3}`],
      TimbreTexto: [TimbreTexto],
      desglose: [
        `Numero Cliente:`,
        `Vencimiento:`,
        `Total del Mes:`,
        `Saldo Anterior:`,
        `Descuento:`,
        `Subsidio:`,
      ],
      desgloseValores: [
        `${CdgIntRecep}`,
        `${fechaVencimiento}`,
        `${MntTotal}`,
        `${SaldoAnterior}`,
        `${Descuento}`,
        `${Subsidio}`,
      ],
      Aviso: [`${Aviso}`],
    };

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
          this.maxWidth
        );
      },
    };

    const tipoBoletaData = createDataObject(baseConfig, {
      data: textArrays.tipoBoleta,
      x: TipoBoletaPos.x,
      y: TipoBoletaPos.y,
      maxWidth: 210,
      maxHeight: 60,
      fontSize: fontSize.large,
      fontFamily: mainFontBold,
      alignment: TipoBoletaPos.al,
    });

    const detalleClienteData = createDataObject(baseConfig, {
      data: textArrays.detalleCliente,
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

    const vencimientoData = createDataObject(baseConfig, {
      data: textArrays.vencimiento,
      x: FchVencPos.x,
      y: FchVencPos.y,
      maxWidth: 245,
      maxHeight: 35,
      fontSize: fontSize.large,
      fontFamily: mainFontBold,
      alignment: FchVencPos.al,
    });

    const totalPagarData = createDataObject(baseConfig, {
      data: textArrays.totalPagar,
      x: VlrPagarPos.x,
      y: VlrPagarPos.y,
      maxWidth: 245,
      maxHeight: 35,
      fontSize: fontSize.large,
      fontFamily: mainFontBold,
      alignment: VlrPagarPos.al,
    });

    const detalleConsumoTituloData = createDataObject(baseConfig, {
      data: textArrays.detalleConsumoTitulo,
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
      data: textArrays.consumo1,
      x: Consumo1Pos.x,
      y: Consumo1Pos.y,
      maxWidth: 250,
      maxHeight: 70,
      fontSize: fontSize.small,
      alignment: Consumo1Pos.al,
    });

    const consumoValoresData1 = createDataObject(baseConfig, {
      data: textArrays.consumoValores1,
      x: ConsumoValores1Pos.x,
      y: ConsumoValores1Pos.y,
      maxWidth: 250,
      maxHeight: 70,
      fontSize: fontSize.small,
      fontFamily: mainFontBold,
      alignment: ConsumoValores1Pos.al,
    });

    const consumoData2 = createDataObject(baseConfig, {
      data: textArrays.consumo2,
      x: Consumo2Pos.x,
      y: Consumo2Pos.y,
      maxWidth: 250,
      maxHeight: 70,
      fontSize: fontSize.small,
      alignment: Consumo2Pos.al,
    });

    const consumoValoresData2 = createDataObject(baseConfig, {
      data: textArrays.consumoValores2,
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

    const fechaEmisionData = createDataObject(baseConfig, {
      data: textArrays.fechaEmision,
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

    const desgloseData = createDataObject(baseConfig, {
      data: textArrays.desglose,
      x: DesglosePos.x,
      y: DesglosePos.y,
      maxWidth: 252,
      maxHeight: 80,
      fontFamily: mainFont,
      fontSize: fontSize.small,
      alignment: DesglosePos.al,
    });

    const desgloseValoresData = createDataObject(baseConfig, {
      data: textArrays.desgloseValores,
      x: DesgloseValoresPos.x,
      y: DesgloseValoresPos.y,
      maxWidth: 252,
      maxHeight: 80,
      fontSize: fontSize.small,
      fontFamily: mainFontBold,
      alignment: DesgloseValoresPos.al,
    });

    const totalPagarData2 = createDataObject(baseConfig, {
      data: textArrays.totalPagar,
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
      tipoBoletaData,
      detalleClienteData,
      NumeroClienteData,
      vencimientoData,
      totalPagarData,
      detalleConsumoTituloData,
      consumoData1,
      consumoValoresData1,
      consumoData2,
      consumoValoresData2,
      MntTotalData,
      fechaEmisionData,
      LecturaAnteriorData,
      LecturaActualData,
      ConsumoM3Data,
      TimbreData,
      desgloseData,
      desgloseValoresData,
      totalPagarData2,
      AvisoData,
    ];

    // Initilize key:values for formatted text in Objects (lines)
    for (const dataObject of dataObjects) {
      // Initialize formattedData
      await dataObject.formatData();
      dataObject.lines = [...dataObject.formattedData];
      await printTextToPdf(dataObject);
    }
    await drawImageToPdf(TimbreData);
  }

  // Save PDF Doc in bytes
  const pdfBytes = await pdfDoc.save();
  // Create a blob with the bytes as type PDF
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  // Create URL from blob
  const pdfUrl = URL.createObjectURL(blob);
  // Assign URL to src of iFrame
  document.getElementById('pdfIframe').src = pdfUrl;
}
