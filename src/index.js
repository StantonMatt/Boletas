'use strict';

import './main.scss';
import * as dateUtil from './format-strings.js';
import * as userInput from './user-input.js';
import * as buttonUtil from './button-style.js';
import createDomVariables from './global-variables.js';
import boletaTemplate from './assets/boletaTemplate.pdf';
import { assemblePDF, fillPdfForm } from './pdf-assembly.js';
import * as excelData from './database-data.js';
import * as XLSX from 'xlsx';

// EventListener for DOMContentLoaded to make sure the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  let dataObject = {};
  // Create variable names for DOM elements
  createDomVariables();
  // Assigning boletaTemplate.pdf to iframe source
  pdfIframe.src = boletaTemplate;
  // Create workbook variable to hold Excel Data
  let workbook;
  let reader;
  let excelFile;

  const readExcel = function (e) {
    // Assign first file selected to excelFile
    excelFile = e.target.files[0];
    // if nothing was selected exit function and hide dropdown list
    if (excelFile === undefined || excelFile.length === 0) {
      buttonUtil.setInputButtonNotClicked(fileInputButton, sheetList);
      buttonUtil.setButtonNotClicked(fetchDataButton);

      return;
    }

    // Create a FileReader()
    reader = new FileReader();

    // on reader load, read excel file and assign
    reader.onload = function (e) {
      // Create variable and assign it the excel data as Uint8Array
      const data = new Uint8Array(e.target.result);

      // Assign the Uint8Array data as type 'array' to workbook variable
      workbook = XLSX.read(data, { type: 'array' });

      // Delete all sheets from sheetList before populating again
      while (sheetList.firstChild) {
        sheetList.removeChild(sheetList.firstChild);
      }

      // Loop through all sheets in workbook and push them into sheetList
      workbook.SheetNames.forEach(sheet => {
        const option = document.createElement('option');
        option.text = sheet;
        sheetList.add(option);
      });

      buttonUtil.setInputButtonClicked(fileInputButton, excelFile, sheetList);
      buttonUtil.revealButton(fetchDataButton);
    };
    // Call reader as array buffer with input excel file
    reader.readAsArrayBuffer(excelFile);
    fetchDataButton.disabled = false;
  };

  sheetList.addEventListener('change', function () {
    fetchDataButton.disabled = false;
    buttonUtil.revealButton(fetchDataButton);
  });

  // Click hidden fileInput when fileInputButton is clicked by user (because fileInput is ugly)
  fileInputButton.addEventListener('click', function () {
    fileInput.click();
  });

  // Event Listener for wehn a file is selected by the User
  fileInput.addEventListener('change', readExcel);
  fileInput.addEventListener('cancel', readExcel);

  // Generate Boletas from sheet data (DataBase)
  fetchDataButton.addEventListener('click', function () {
    // Get Data from selected sheet as json
    dataObject = {
      ...excelData.compileData(
        XLSX.utils.sheet_to_json(workbook.Sheets[sheetList.value])
      ),
    };
    buttonUtil.setButtonClicked(sheetList);
    buttonUtil.setButtonClicked(fetchDataButton);
    buttonUtil.revealButton(generateBoletasButton);
    optionsContainer.style.display = 'inline';
    buttonUtil.revealButton(addAvisoButton);
    fetchDataButton.disabled = true;
    console.log('test');
  });

  // Generate Boletas from sheet data (DataBase)
  generateBoletasButton.addEventListener('click', function () {
    // Assigning the selected sheet as an object to a variable
    // const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetList.value]);
    assemblePDF(boletaTemplate).catch(err => console.error(err));
  });

  let avisoCount = 0;
  addAvisoButton.addEventListener('click', function () {
    const avisoInjectButtonId = `avisoInjectButton${avisoCount}`;
    const avisoTextInputId = `avisoTextInput${avisoCount}`;
    const clientNumberInputId = `clientNumberInput${avisoCount}`;
    const avisoTextColorId = `avisoTextColor${avisoCount}`;
    avisoInputContainer.insertAdjacentHTML(
      'afterbegin',
      `
    <div class="aviso">
          <div class="aviso-header-container">
            <button id="${avisoInjectButtonId}" class="btn">Inject Text</button>
            <div class="client-input-container">
              <label for="${clientNumberInputId}" class="client-input-label">Input client numbers here:</label>
              <input id="${clientNumberInputId}" class="client-input-field" type="text"</input>
            </div>
            <div class="color-input-container">
              <label for="avisoTextColor" class="color-input-label">Select Color</label>
              <input type="color" id="${avisoTextColorId}" class="color-input-field" value="#000000">
            </div>
          </div> 
          <div>
            <textarea id="${avisoTextInputId}" class="text-input" type="text" name="aviso" placeholder="Write custom aviso message here.\nEnter client numbers in the input box above.\nExamples:\nFor a custom message for one particular client, type: 111310\nSeprate by comma \',\' for multiple clients: 110070,111710,120170\nUse a dash \'-\' to select a range of clients: 110020-110660"></textarea>
          </div>
        </div>    
    `
    );
    const avisoInjectButton = document.getElementById(avisoInjectButtonId);
    const avisoTextInput = document.getElementById(avisoTextInputId);
    const clientNumberInput = document.getElementById(clientNumberInputId);
    const avisoTextColor = document.getElementById(avisoTextColorId);

    avisoInjectButton.addEventListener('click', function () {
      const hex = avisoTextColor.value;
      const r = parseInt(hex.substr(1, 2), 16); // Extracts and converts the RR part of #RRGGBB to decimal
      const g = parseInt(hex.substr(3, 2), 16); // Extracts and converts the GG part
      const b = parseInt(hex.substr(5, 2), 16); // Extracts and converts the BB part

      userInput.injectAviso(dataObject, avisoTextInput, clientNumberInput, [r, g, b]);
      buttonUtil.setButtonClicked(avisoInjectButton);
    });

    avisoTextInput.addEventListener('input', function () {
      buttonUtil.revealButton(avisoInjectButton);
    });

    avisoCount++;
  });
});
