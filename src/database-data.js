'use strict';
import * as formatUtil from './format-strings.js';
require.context('./assets/Timbres', true, /\.png$/);

let mainDataObject = {};

const fetchData = () => mainDataObject;

const compileData = function (excelData) {
  let primerFolio;

  if (Object.keys(mainDataObject).length > 0 && mainDataObject.constructor === Object) {
    for (const [key, value] of Object.entries(mainDataObject)) {
      delete mainDataObject[key];
      console.log('deleting');
    }
  }

  mainDataObject = {
    Folio: [],
    RUTEmisor: [],
    TipoBoleta: [],
    FchVenc: [],
    fechaEmision: [],
    CostoM3Agua: [],
    CostoM3Alcantarillado: [],
    CostoM3Tratamiento: [],
    RUTRecep: [],
    Numero: [],
    CdgIntRecep: [],
    RznSocRecep: [],
    DirRecep: [],
    CiudadRecep: [],
    VlrPagar: [],
    CargoFijo: [],
    CostoTotalAgua: [],
    CostoTotalAlcantarillado: [],
    CostoTotalTratamiento: [],
    Repactacion: [],
    Multas: [],
    OtrosCargos: [],
    MntTotal: [],
    LecturaAnterior: [],
    LecturaActual: [],
    ConsumoM3: [],
    SaldoAnterior: [],
    Descuento: [],
    Subsidio: [],
    Aviso: [],
    Timbre: [],
    Color: [],
  };

  for (const data of excelData) {
    if (!isFinite(data.Numero)) continue;
    if (isFinite(data.Folio)) primerFolio = data.Folio;

    if (data.RUTEmisor) {
      mainDataObject.RUTEmisor.push(formatUtil.getFormattedRut(data.RUTEmisor));
    }
    mainDataObject.Timbre.push(`/${data.RUTRecep}.png`);
    mainDataObject.Folio.push(primerFolio++);
    mainDataObject.TipoBoleta.push(`BOLETA ELECTRONICA`);
    mainDataObject.FchVenc.push(formatUtil.getShortExpiryDate());
    mainDataObject.fechaEmision.push(formatUtil.getIssueDate());
    mainDataObject.CostoM3Agua.push(String(data.CostoM3Agua));
    mainDataObject.CostoM3Alcantarillado.push(String(data.CostoM3Alcantarillado));
    mainDataObject.CostoM3Tratamiento.push(String(data.CostoM3Tratamiento));
    mainDataObject.RUTRecep.push(formatUtil.getFormattedRut(data.RUTRecep));
    mainDataObject.Numero.push(data.Numero);
    mainDataObject.CdgIntRecep.push(data.codigo);
    mainDataObject.RznSocRecep.push(String(data.RznSocRecep));
    mainDataObject.DirRecep.push(String(data.DirRecep));
    mainDataObject.CiudadRecep.push(String(data.CiudadRecep));
    mainDataObject.VlrPagar.push(formatUtil.getFormattedAsCurrecy(data.VlrPagar));
    mainDataObject.CargoFijo.push(formatUtil.getFormattedAsCurrecy(data.CargoFijo));
    mainDataObject.CostoTotalAgua.push(
      formatUtil.getFormattedAsCurrecy(data.CostoTotalAgua)
    );
    mainDataObject.CostoTotalAlcantarillado.push(
      formatUtil.getFormattedAsCurrecy(data.CostoTotalAlcantarillado)
    );
    mainDataObject.CostoTotalTratamiento.push(
      formatUtil.getFormattedAsCurrecy(data.CostoTotalTratamiento)
    );
    mainDataObject.Repactacion.push(formatUtil.getFormattedAsCurrecy(data.Repactacion));
    mainDataObject.Multas.push(formatUtil.getFormattedAsCurrecy(data.Multas));
    mainDataObject.OtrosCargos.push(formatUtil.getFormattedAsCurrecy(data.OtrosCargos));
    mainDataObject.MntTotal.push(formatUtil.getFormattedAsCurrecy(data.MntTotal));
    mainDataObject.LecturaAnterior.push(String(data.LecturaAnterior));
    mainDataObject.LecturaActual.push(String(data.LecturaActual));
    mainDataObject.ConsumoM3.push(String(data.ConsumoM3));
    mainDataObject.SaldoAnterior.push(
      formatUtil.getFormattedAsCurrecy(data.SaldoAnterior)
    );
    mainDataObject.Descuento.push(formatUtil.getFormattedAsCurrecy(data.Descuento));
    mainDataObject.Subsidio.push(formatUtil.getFormattedAsCurrecy(data.Subsidio));
    mainDataObject.Aviso.push(String(data.Aviso));
    mainDataObject.Color.push(
      data.Color.trim()
        .split(',')
        .map(num => Number(num.trim()))
    );
  }
  console.log(mainDataObject.Timbre);
  console.log(mainDataObject.Color);
  return mainDataObject;
};
export { compileData, fetchData };
