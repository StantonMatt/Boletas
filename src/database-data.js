"use strict";
import * as formatUtil from "./format-strings.js";
require.context("./assets/timbres", true, /\.png$/);

let mainDataObject = {};

const fetchData = () => mainDataObject;

const compileData = function (excelData) {
  let primerFolio;

  if (
    Object.keys(mainDataObject).length > 0 &&
    mainDataObject.constructor === Object
  ) {
    for (const [key, value] of Object.entries(mainDataObject)) {
      delete mainDataObject[key];
      console.log("deleting");
    }
  }
  console.log("in compileData function");
  mainDataObject = {
    Folio: [],
    // RUTEmisor: [],
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
    Aviso: [],
    Timbre: [],
    Color: [],
  };

  for (const data of excelData) {
    if (isFinite(data["Folio"])) primerFolio = data["Folio"];
    if (Number(data[`Recibe Factura`]) == 1) continue;
    if (!isFinite(data["N#"])) continue;
    console.log(data);

    // if (data.RUTEmisor) {
    //   mainDataObject.RUTEmisor.push(formatUtil.getFormattedRut(data.RUTEmisor));
    // }
    mainDataObject.Timbre.push(`/${data["RUT"]}.png`);
    console.log(data["RUT"]);
    mainDataObject.Folio.push(primerFolio++);
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
    mainDataObject.Aviso.push(String(data["Aviso"]));
    mainDataObject.Color.push(
      data["Color"]
        .trim()
        .split(",")
        .map((num) => Number(num.trim()))
    );
  }
  console.log(mainDataObject.Timbre);
  console.log(mainDataObject.Color);
  return mainDataObject;
};
export { compileData, fetchData };
