"use strict";

const createDomVariables = function () {
  global.fileInputButton = document.getElementById("fileInputButton");
  global.fileInput = document.getElementById("fileInput");
  global.sheetList = document.getElementById("sheetList");
  global.pdfIframe = document.getElementById("pdfIframe");
  global.generateBoletasButton = document.getElementById(
    "generateBoletasButton"
  );
  global.optionsContainer = document.querySelector(".options-container");
  global.addAviso = document.getElementById("addAvisoButton");
  global.avisoInputContainer = document.getElementById("avisoInputContainer");
  global.disableAvisoCheckbox = document.getElementById("disableAvisoCheckbox");
  global.generationFilterContainer = document.getElementById(
    "generationFilterContainer"
  );
  global.generationClientInput = document.getElementById(
    "generationClientInput"
  );
  global.manualPeriodContainer = document.getElementById(
    "manualPeriodContainer"
  );
  global.manualPeriodInput = document.getElementById("manualPeriodInput");
};

export default createDomVariables;
