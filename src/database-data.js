"use strict";
import * as formatUtil from "./format-strings.js";
require.context("./assets/timbres", true, /\.png$/);

let mainDataObject = {};

const createEmptyDataObject = function () {
  return {
    SourceFolioStart: null,
    SourceFolio: [],
    TotalSubsidiadoRaw: [],
    HasFolio: [],
    Folio: [],
    TipoBoleta: [],
    FchVenc: [],
    FchEmis: [],
    CostoM3Agua: [],
    CostoM3AlcantarilladoTratamiento: [],
    RUTRecep: [],
    Numero: [],
    CdgIntRecep: [],
    RznSocRecep: [],
    DirRecep: [],
    CiudadRecep: [],
    VlrPagar: [],
    CargoFijo: [],
    CostoTotalAgua: [],
    CostoTotalAlcantarilladoTratamiento: [],
    Repactacion: [],
    Multas: [],
    Otros: [],
    MntTotal: [],
    LecturaAnterior: [],
    LecturaActual: [],
    ConsumoM3: [],
    SaldoAnterior: [],
    Descuento: [],
    Subsidio: [],
    Reposicion: [],
    Aviso: [],
    Timbre: [],
    Color: [],
  };
};

const getNumericValue = function (value) {
  if (Number.isFinite(value)) {
    return Number(value);
  }

  if (typeof value !== "string") {
    return 0;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const normalizedValue = trimmedValue
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const shouldApplyConditionalFolioRule = function (billingPeriod) {
  if (!billingPeriod) {
    return false;
  }

  if (billingPeriod.year > 2026) {
    return true;
  }

  return billingPeriod.year === 2026 && billingPeriod.month >= 2;
};

const getSelectedIndexes = function (selectedClientIndexes, totalRows) {
  if (!Array.isArray(selectedClientIndexes) || !selectedClientIndexes.length) {
    return Array.from({ length: totalRows }, (_, index) => index);
  }

  return [...new Set(selectedClientIndexes)].sort((a, b) => a - b);
};

const fetchData = () => mainDataObject;

const compileData = function (excelData) {
  mainDataObject = createEmptyDataObject();

  for (const data of excelData) {
    const sourceFolio = getNumericValue(data["Folio"]);

    if (
      mainDataObject.SourceFolioStart === null &&
      Number.isFinite(sourceFolio) &&
      sourceFolio > 0
    ) {
      mainDataObject.SourceFolioStart = sourceFolio;
    }

    if (Number(data["Recibe Factura"]) == 1) continue;
    if (!Number.isFinite(Number(data["N#"]))) continue;

    mainDataObject.Timbre.push(`/${data["RUT"]}.png`);
    mainDataObject.SourceFolio.push(sourceFolio > 0 ? sourceFolio : null);
    mainDataObject.Folio.push(null);
    mainDataObject.HasFolio.push(false);
    mainDataObject.TipoBoleta.push(`BOLETA ELECTRONICA`);
    mainDataObject.FchVenc.push(formatUtil.getShortExpiryDate());
    mainDataObject.FchEmis.push(formatUtil.getIssueDate());
    mainDataObject.CostoM3Agua.push(String(data["Costo M3 Agua"]));
    mainDataObject.CostoM3AlcantarilladoTratamiento.push(
      String(data["Costo M3 Alcantarillado Tratamiento"])
    );
    mainDataObject.RUTRecep.push(formatUtil.getFormattedRut(data["RUT"]));
    mainDataObject.Numero.push(data["N#"]);
    mainDataObject.CdgIntRecep.push(data["Numero Cliente"]);
    mainDataObject.RznSocRecep.push(String(data["Nombre"]));
    mainDataObject.DirRecep.push(String(data["Direccion"]));
    mainDataObject.CiudadRecep.push(String(data["Ciudad"]));
    mainDataObject.VlrPagar.push(
      formatUtil.getFormattedAsCurrecy(data["Total Pagar"])
    );
    mainDataObject.CargoFijo.push(
      formatUtil.getFormattedAsCurrecy(data["Cargo Fijo"])
    );
    mainDataObject.CostoTotalAgua.push(
      formatUtil.getFormattedAsCurrecy(data["Costo Total Agua"])
    );
    mainDataObject.CostoTotalAlcantarilladoTratamiento.push(
      formatUtil.getFormattedAsCurrecy(
        data["Costo Total Alcantarillado Tratamiento"]
      )
    );
    mainDataObject.Repactacion.push(
      formatUtil.getFormattedAsCurrecy(data["Repactacion"])
    );
    mainDataObject.Multas.push(formatUtil.getFormattedAsCurrecy(data["Multa"]));
    mainDataObject.Otros.push(formatUtil.getFormattedAsCurrecy(data["Otros"]));
    mainDataObject.MntTotal.push(
      formatUtil.getFormattedAsCurrecy(data["Total Mes"])
    );
    mainDataObject.LecturaAnterior.push(String(data["Lectura Anterior"]));
    mainDataObject.LecturaActual.push(String(data["Lectura Actual"]));
    mainDataObject.ConsumoM3.push(String(data["Consumo M3"]));
    mainDataObject.SaldoAnterior.push(
      formatUtil.getFormattedAsCurrecy(data["Saldo Anterior"])
    );
    mainDataObject.Descuento.push(
      formatUtil.getFormattedAsCurrecy(data["Descuento"])
    );
    mainDataObject.Subsidio.push(
      formatUtil.getFormattedAsCurrecy(data["Subsidio"])
    );
    mainDataObject.TotalSubsidiadoRaw.push(
      getNumericValue(data["Total Subsidiado"])
    );
    mainDataObject.Reposicion.push(
      formatUtil.getFormattedAsCurrecy(data["Reposicion"])
    );
    mainDataObject.Aviso.push(String(data["Aviso"] ?? ""));
    mainDataObject.Color.push(
      String(data["Color"] ?? "0,0,0")
        .trim()
        .split(",")
        .map((num) => Number(num.trim()))
    );
  }

  return mainDataObject;
};

const buildGenerationData = function ({
  billingPeriod,
  selectedClientIndexes = [],
} = {}) {
  const totalRows = mainDataObject.Numero.length;
  const allEffectiveFolios = new Array(totalRows).fill(null);
  const allHasFolio = new Array(totalRows).fill(false);
  const applyConditionalFolioRule =
    shouldApplyConditionalFolioRule(billingPeriod);
  let nextFolio = mainDataObject.SourceFolioStart;

  for (let index = 0; index < totalRows; index++) {
    const totalSubsidiado = mainDataObject.TotalSubsidiadoRaw[index];
    const rowShouldReceiveFolio =
      Number.isFinite(nextFolio) &&
      (!applyConditionalFolioRule || totalSubsidiado > 0);

    if (rowShouldReceiveFolio) {
      allEffectiveFolios[index] = nextFolio;
      allHasFolio[index] = true;
      nextFolio += 1;
    }
  }

  const indexesToGenerate = getSelectedIndexes(selectedClientIndexes, totalRows);
  const generationData = {
    SourceFolioStart: mainDataObject.SourceFolioStart,
    TipoBoleta: [],
    FchVenc: [],
    FchEmis: [],
    CostoM3Agua: [],
    CostoM3AlcantarilladoTratamiento: [],
    RUTRecep: [],
    Numero: [],
    CdgIntRecep: [],
    RznSocRecep: [],
    DirRecep: [],
    CiudadRecep: [],
    VlrPagar: [],
    CargoFijo: [],
    CostoTotalAgua: [],
    CostoTotalAlcantarilladoTratamiento: [],
    Repactacion: [],
    Multas: [],
    Otros: [],
    MntTotal: [],
    LecturaAnterior: [],
    LecturaActual: [],
    ConsumoM3: [],
    SaldoAnterior: [],
    Descuento: [],
    Subsidio: [],
    TotalSubsidiadoRaw: [],
    Reposicion: [],
    Aviso: [],
    Timbre: [],
    Color: [],
    Folio: [],
    HasFolio: [],
  };

  indexesToGenerate.forEach((index) => {
    generationData.TipoBoleta.push(mainDataObject.TipoBoleta[index]);
    generationData.FchVenc.push(mainDataObject.FchVenc[index]);
    generationData.FchEmis.push(mainDataObject.FchEmis[index]);
    generationData.CostoM3Agua.push(mainDataObject.CostoM3Agua[index]);
    generationData.CostoM3AlcantarilladoTratamiento.push(
      mainDataObject.CostoM3AlcantarilladoTratamiento[index]
    );
    generationData.RUTRecep.push(mainDataObject.RUTRecep[index]);
    generationData.Numero.push(mainDataObject.Numero[index]);
    generationData.CdgIntRecep.push(mainDataObject.CdgIntRecep[index]);
    generationData.RznSocRecep.push(mainDataObject.RznSocRecep[index]);
    generationData.DirRecep.push(mainDataObject.DirRecep[index]);
    generationData.CiudadRecep.push(mainDataObject.CiudadRecep[index]);
    generationData.VlrPagar.push(mainDataObject.VlrPagar[index]);
    generationData.CargoFijo.push(mainDataObject.CargoFijo[index]);
    generationData.CostoTotalAgua.push(mainDataObject.CostoTotalAgua[index]);
    generationData.CostoTotalAlcantarilladoTratamiento.push(
      mainDataObject.CostoTotalAlcantarilladoTratamiento[index]
    );
    generationData.Repactacion.push(mainDataObject.Repactacion[index]);
    generationData.Multas.push(mainDataObject.Multas[index]);
    generationData.Otros.push(mainDataObject.Otros[index]);
    generationData.MntTotal.push(mainDataObject.MntTotal[index]);
    generationData.LecturaAnterior.push(mainDataObject.LecturaAnterior[index]);
    generationData.LecturaActual.push(mainDataObject.LecturaActual[index]);
    generationData.ConsumoM3.push(mainDataObject.ConsumoM3[index]);
    generationData.SaldoAnterior.push(mainDataObject.SaldoAnterior[index]);
    generationData.Descuento.push(mainDataObject.Descuento[index]);
    generationData.Subsidio.push(mainDataObject.Subsidio[index]);
    generationData.TotalSubsidiadoRaw.push(
      mainDataObject.TotalSubsidiadoRaw[index]
    );
    generationData.Reposicion.push(mainDataObject.Reposicion[index]);
    generationData.Aviso.push(mainDataObject.Aviso[index]);
    generationData.Timbre.push(mainDataObject.Timbre[index]);
    generationData.Color.push(mainDataObject.Color[index]);
    generationData.Folio.push(allEffectiveFolios[index]);
    generationData.HasFolio.push(allHasFolio[index]);
  });

  return generationData;
};

export { buildGenerationData, compileData, fetchData };
