'use strict';

const createDomVariables = function () {
  global.fileInputButton = document.getElementById('fileInputButton');
  global.fileInput = document.getElementById('fileInput');
  global.sheetList = document.getElementById('sheetList');
  global.pdfIframe = document.getElementById('pdfIframe');
  global.generateBoletasButton = document.getElementById('generateBoletasButton');
  global.optionsContainer = document.querySelector('.options-container');
  global.addAviso = document.getElementById('addAvisoButton');
  global.avisoInputContainer = document.getElementById('avisoInputContainer');
};

export default createDomVariables;
