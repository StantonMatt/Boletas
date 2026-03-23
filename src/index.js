"use strict";

import "./main.scss";
import * as userInput from "./user-input.js";
import * as buttonUtil from "./button-style.js";
import createDomVariables from "./global-variables.js";
import boletaTemplate from "./assets/boletaTemplate.pdf";
import { assemblePDF } from "./pdf-assembly.js";
import { buildGenerationData, compileData } from "./database-data.js";
import * as XLSX from "xlsx";
import progressManager from "./progress-manager.js";

const SHEET_PERIOD_REGEX = /^(\d{4})-(\d{2})\s+Planilla Boleta Gen(?:\.(xlsx|xls))?$/i;
const MANUAL_PERIOD_REGEX = /^(\d{4})-(\d{2})$/;

const getBillingPeriodFromText = function (value) {
  const matches = String(value ?? "").trim().match(SHEET_PERIOD_REGEX);

  if (!matches) {
    return null;
  }

  const year = Number(matches[1]);
  const month = Number(matches[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const getBillingPeriod = function (sheetName, fileName) {
  return (
    getBillingPeriodFromText(sheetName) || getBillingPeriodFromText(fileName)
  );
};

const getBillingPeriodFromManualInput = function (manualPeriodValue) {
  const matches = String(manualPeriodValue ?? "")
    .trim()
    .match(MANUAL_PERIOD_REGEX);

  if (!matches) {
    return null;
  }

  const year = Number(matches[1]);
  const month = Number(matches[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const hideManualPeriodPicker = function () {
  manualPeriodContainer.style.display = "none";
};

const showManualPeriodPicker = function () {
  manualPeriodContainer.style.display = "flex";
};

const resetManualPeriodPicker = function () {
  manualPeriodInput.value = "";
  hideManualPeriodPicker();
};

// EventListener for DOMContentLoaded to make sure the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  let dataObject = {};
  createDomVariables();
  pdfIframe.src = boletaTemplate;

  let workbook;
  let reader;
  let excelFile;

  const readExcel = function (e) {
    excelFile = e.target.files[0];

    if (excelFile === undefined || excelFile.length === 0) {
      buttonUtil.setInputButtonNotClicked(fileInputButton, sheetList);
      buttonUtil.setButtonNotClicked(fetchDataButton);
      buttonUtil.hideButton(generateBoletasButton);
      generationFilterContainer.style.display = "none";
      resetManualPeriodPicker();
      return;
    }

    reader = new FileReader();

    reader.onload = function (loadEvent) {
      const data = new Uint8Array(loadEvent.target.result);
      workbook = XLSX.read(data, { type: "array" });

      while (sheetList.firstChild) {
        sheetList.removeChild(sheetList.firstChild);
      }

      workbook.SheetNames.forEach((sheet) => {
        const option = document.createElement("option");
        option.text = sheet;
        sheetList.add(option);
      });

      buttonUtil.setInputButtonClicked(fileInputButton, excelFile, sheetList);
      buttonUtil.revealButton(fetchDataButton);
      generationFilterContainer.style.display = "none";
      resetManualPeriodPicker();
    };

    reader.readAsArrayBuffer(excelFile);
    fetchDataButton.disabled = false;
  };

  sheetList.addEventListener("change", function () {
    fetchDataButton.disabled = false;
    buttonUtil.revealButton(fetchDataButton);
    resetManualPeriodPicker();
  });

  fileInputButton.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", readExcel);
  fileInput.addEventListener("cancel", readExcel);

  fetchDataButton.addEventListener("click", function () {
    dataObject = {
      ...compileData(XLSX.utils.sheet_to_json(workbook.Sheets[sheetList.value])),
    };

    buttonUtil.setButtonClicked(sheetList);
    buttonUtil.setButtonClicked(fetchDataButton);
    buttonUtil.revealButton(generateBoletasButton);
    generationFilterContainer.style.display = "flex";
    optionsContainer.style.display = "inline";
    buttonUtil.revealButton(addAvisoButton);
    fetchDataButton.disabled = true;
    resetManualPeriodPicker();
  });

  generateBoletasButton.addEventListener("click", async function () {
    const disableAviso = global.disableAvisoCheckbox.checked;

    try {
      const selectedClients = userInput.parseClientSelection(
        dataObject.CdgIntRecep ?? [],
        generationClientInput.value,
        { allowEmptySelection: true }
      );

      if (!selectedClients.isValid) {
        alert(selectedClients.errorMessage);
        return;
      }

      let billingPeriod = getBillingPeriod(sheetList.value, excelFile?.name);

      if (!billingPeriod) {
        showManualPeriodPicker();
        billingPeriod = getBillingPeriodFromManualInput(manualPeriodInput.value);

        if (!billingPeriod) {
          alert(
            "Year and month were not identified from the sheet name. Please select the billing period from the month picker."
          );
          return;
        }
      } else {
        hideManualPeriodPicker();
      }

      const generationData = buildGenerationData({
        billingPeriod,
        selectedClientIndexes: selectedClients.selectedIndexes,
      });

      const totalPages = generationData?.Numero?.length || 0;

      if (totalPages === 0) {
        alert(
          "No data found. Please make sure you have loaded an Excel file with data."
        );
        return;
      }

      progressManager.show(totalPages);
      await assemblePDF(
        boletaTemplate,
        disableAviso,
        progressManager,
        generationData
      );
      progressManager.hide();
    } catch (error) {
      console.error("PDF Generation Error:", error);
      progressManager.error(
        error.message || "An error occurred during PDF generation"
      );
    }
  });

  let avisoCount = 0;
  addAvisoButton.addEventListener("click", function () {
    const avisoInjectButtonId = `avisoInjectButton${avisoCount}`;
    const avisoTextInputId = `avisoTextInput${avisoCount}`;
    const clientNumberInputId = `clientNumberInput${avisoCount}`;
    const avisoTextColorId = `avisoTextColor${avisoCount}`;

    avisoInputContainer.insertAdjacentHTML(
      "afterbegin",
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
            <textarea id="${avisoTextInputId}" class="text-input" type="text" name="aviso" placeholder="Write custom aviso message here.\nEnter client numbers in the input box above.\nExamples:\nFor a custom message for one particular client, type: 111310\nSeprate by comma ',' for multiple clients: 110070,111710,120170\nUse a dash '-' to select a range of clients: 110020-110660"></textarea>
          </div>
        </div>    
    `
    );

    const avisoInjectButton = document.getElementById(avisoInjectButtonId);
    const avisoTextInput = document.getElementById(avisoTextInputId);
    const clientNumberInput = document.getElementById(clientNumberInputId);
    const avisoTextColor = document.getElementById(avisoTextColorId);

    avisoInjectButton.addEventListener("click", function () {
      const hex = avisoTextColor.value;
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);

      const injectResult = userInput.injectAviso(
        dataObject,
        avisoTextInput,
        clientNumberInput,
        [r, g, b]
      );

      if (!injectResult.isValid) {
        alert(injectResult.errorMessage);
        return;
      }

      buttonUtil.setButtonClicked(avisoInjectButton);
    });

    avisoTextInput.addEventListener("input", function () {
      buttonUtil.revealButton(avisoInjectButton);
    });

    avisoCount++;
  });
});
