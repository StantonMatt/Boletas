"use strict";

const getGeneratedPdfFileName = function (billingPeriod, folios = []) {
  const shortYear = String(billingPeriod.year).slice(-2).padStart(2, "0");
  const month = String(billingPeriod.month).padStart(2, "0");
  const generatedFolios = folios
    .filter((folio) => folio !== null && folio !== "")
    .map((folio) => Number(folio))
    .filter((folio) => Number.isFinite(folio));

  if (!generatedFolios.length) {
    return `${shortYear}-${month} F_sin-folios.pdf`;
  }

  const firstFolio = generatedFolios[0];
  const lastFolio = generatedFolios[generatedFolios.length - 1];

  return `${shortYear}-${month} F_${firstFolio}-${lastFolio}.pdf`;
};

export { getGeneratedPdfFileName };
