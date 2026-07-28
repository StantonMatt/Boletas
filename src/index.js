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
const ISSUE_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

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

const getDefaultIssueDateInputValue = function (billingPeriod) {
  if (!billingPeriod) {
    return "";
  }

  const issueDate = new Date(billingPeriod.year, billingPeriod.month, 0);
  const year = issueDate.getFullYear();
  const month = String(issueDate.getMonth() + 1).padStart(2, "0");
  const day = String(issueDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getIssueDateFromInput = function (issueDateValue) {
  const matches = String(issueDateValue ?? "")
    .trim()
    .match(ISSUE_DATE_REGEX);

  if (!matches) {
    return null;
  }

  const year = Number(matches[1]);
  const month = Number(matches[2]);
  const day = Number(matches[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${matches[1]}-${matches[2]}-${matches[3]}`;
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

const hideIssueDatePicker = function () {
  issueDateContainer.style.display = "none";
};

const showIssueDatePicker = function (
  billingPeriod,
  { forceDefault = false } = {}
) {
  const defaultIssueDate = getDefaultIssueDateInputValue(billingPeriod);

  issueDateContainer.style.display = "flex";

  if (forceDefault || (!issueDateInput.value && defaultIssueDate)) {
    issueDateInput.value = defaultIssueDate;
  }
};

const resetIssueDatePicker = function () {
  issueDateInput.value = "";
  hideIssueDatePicker();
};

const ensureIssueDateDefault = function (billingPeriod) {
  showIssueDatePicker(billingPeriod);
};

// EventListener for DOMContentLoaded to make sure the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  let dataObject = {};
  createDomVariables();
  pdfIframe.src = boletaTemplate;

  let workbook;
  let reader;
  let excelFile;
  let avisoCount = 0;
  let originalAvisos = [];
  let originalAvisoColors = [];
  const avisoApplications = new Map();

  const resetCustomAvisos = function () {
    avisoInputContainer.replaceChildren();
    avisoApplications.clear();
    originalAvisos = [];
    originalAvisoColors = [];
    avisoCount = 0;
  };

  const resetLoadedSheetState = function () {
    dataObject = {};
    resetCustomAvisos();
    buttonUtil.hideButton(generateBoletasButton);
    buttonUtil.hideButton(addAvisoButton);
    generationFilterContainer.style.display = "none";
    resetManualPeriodPicker();
    resetIssueDatePicker();
  };

  const readExcel = function (e) {
    excelFile = e.target.files[0];
    resetLoadedSheetState();

    if (excelFile === undefined || excelFile.length === 0) {
      buttonUtil.setInputButtonNotClicked(fileInputButton, sheetList);
      buttonUtil.setButtonNotClicked(fetchDataButton);
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
    };

    reader.readAsArrayBuffer(excelFile);
    fetchDataButton.disabled = false;
  };

  sheetList.addEventListener("change", function () {
    resetLoadedSheetState();
    fetchDataButton.disabled = false;
    buttonUtil.revealButton(fetchDataButton);
  });

  manualPeriodInput.addEventListener("change", function () {
    const billingPeriod = getBillingPeriodFromManualInput(manualPeriodInput.value);
    showIssueDatePicker(billingPeriod, { forceDefault: true });
  });

  fileInputButton.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", readExcel);

  fetchDataButton.addEventListener("click", function () {
    dataObject = {
      ...compileData(XLSX.utils.sheet_to_json(workbook.Sheets[sheetList.value])),
    };
    originalAvisos = [...dataObject.Aviso];
    originalAvisoColors = dataObject.Color.map((color) => [...color]);

    buttonUtil.setButtonClicked(sheetList);
    buttonUtil.setButtonClicked(fetchDataButton);
    buttonUtil.revealButton(generateBoletasButton);
    generationFilterContainer.style.display = "flex";
    optionsContainer.style.display = "inline";
    buttonUtil.revealButton(addAvisoButton);
    fetchDataButton.disabled = true;
    resetManualPeriodPicker();
    showIssueDatePicker(getBillingPeriod(sheetList.value, excelFile?.name), {
      forceDefault: true,
    });
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

      ensureIssueDateDefault(billingPeriod);

      const issueDate = getIssueDateFromInput(issueDateInput.value);

      if (!issueDate) {
        alert("Please select a valid fecha emisión.");
        return;
      }

      const generationData = buildGenerationData({
        billingPeriod,
        issueDate,
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

  addAvisoButton.addEventListener("click", function () {
    const avisoApplicationId = avisoCount;
    const avisoInjectButtonId = `avisoInjectButton${avisoCount}`;
    const avisoTextInputId = `avisoTextInput${avisoCount}`;
    const clientNumberInputId = `clientNumberInput${avisoCount}`;
    const avisoTextColorId = `avisoTextColor${avisoCount}`;
    const avisoScopeName = `avisoScope${avisoCount}`;
    const allClientsScopeId = `allClientsScope${avisoCount}`;
    const specificClientsScopeId = `specificClientsScope${avisoCount}`;
    const specificClientsContainerId = `specificClientsContainer${avisoCount}`;
    const avisoStatusId = `avisoStatus${avisoCount}`;

    avisoInputContainer.insertAdjacentHTML(
      "afterbegin",
      `
    <div class="aviso" aria-labelledby="${avisoTextInputId}Label">
          <div class="aviso-title-row">
            <div>
              <p class="aviso-eyebrow">CUSTOM AVISO</p>
              <h2 id="${avisoTextInputId}Label">Message shown on the boleta</h2>
            </div>
            <div class="color-input-container">
              <label for="${avisoTextColorId}" class="color-input-label">Text color</label>
              <input type="color" id="${avisoTextColorId}" class="color-input-field" value="#000000">
            </div>
          </div>
          <fieldset class="aviso-scope">
            <legend>Who should receive this message?</legend>
            <label class="scope-option" for="${allClientsScopeId}">
              <input
                type="radio"
                id="${allClientsScopeId}"
                name="${avisoScopeName}"
                value="all"
                checked
              >
              <span>
                <strong>All clients</strong>
                <small>Replace the existing aviso on every boleta.</small>
              </span>
            </label>
            <label class="scope-option" for="${specificClientsScopeId}">
              <input
                type="radio"
                id="${specificClientsScopeId}"
                name="${avisoScopeName}"
                value="specific"
              >
              <span>
                <strong>Specific clients</strong>
                <small>Replace it only for the client numbers you enter.</small>
              </span>
            </label>
          </fieldset>
          <div id="${specificClientsContainerId}" class="client-input-container" hidden>
            <label for="${clientNumberInputId}" class="client-input-label">Client numbers</label>
            <input
              id="${clientNumberInputId}"
              class="client-input-field"
              type="text"
              placeholder="111310, 111710 or 110020-110660"
            >
            <p class="client-input-help">Use a comma-separated list or one dash range.</p>
          </div>
          <div class="aviso-message-container">
            <label for="${avisoTextInputId}">Custom message</label>
            <textarea
              id="${avisoTextInputId}"
              class="text-input"
              name="aviso"
              maxlength="600"
              placeholder="Write the message that should replace the current aviso..."
            ></textarea>
          </div>
          <div class="aviso-header-container">
            <button id="${avisoInjectButtonId}" class="btn aviso-apply-button">Apply custom aviso</button>
            <p id="${avisoStatusId}" class="aviso-status" role="status" aria-live="polite"></p>
          </div>
        </div>    
    `
    );

    const avisoInjectButton = document.getElementById(avisoInjectButtonId);
    const avisoTextInput = document.getElementById(avisoTextInputId);
    const clientNumberInput = document.getElementById(clientNumberInputId);
    const avisoTextColor = document.getElementById(avisoTextColorId);
    const allClientsScope = document.getElementById(allClientsScopeId);
    const specificClientsScope = document.getElementById(
      specificClientsScopeId
    );
    const specificClientsContainer = document.getElementById(
      specificClientsContainerId
    );
    const avisoStatus = document.getElementById(avisoStatusId);

    const markAvisoAsChanged = function () {
      avisoStatus.textContent = "";
      avisoInjectButton.textContent = "Apply custom aviso";
      buttonUtil.revealButton(avisoInjectButton);
    };

    const updateAvisoScope = function () {
      const isSpecific = specificClientsScope.checked;
      specificClientsContainer.hidden = !isSpecific;
      clientNumberInput.disabled = !isSpecific;

      if (isSpecific) {
        clientNumberInput.focus();
      }

      markAvisoAsChanged();
    };

    avisoInjectButton.addEventListener("click", function () {
      const hex = avisoTextColor.value;
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);

      const avisoApplication = userInput.getAvisoApplication(
        dataObject,
        avisoTextInput,
        clientNumberInput,
        [r, g, b],
        { applyToAllClients: allClientsScope.checked }
      );

      if (!avisoApplication.isValid) {
        alert(avisoApplication.errorMessage);
        return;
      }

      avisoApplications.delete(avisoApplicationId);
      avisoApplications.set(avisoApplicationId, avisoApplication);
      userInput.applyAvisoApplications(
        dataObject,
        originalAvisos,
        originalAvisoColors,
        [...avisoApplications.values()]
      );

      buttonUtil.setButtonClicked(avisoInjectButton);
      avisoInjectButton.textContent = "Applied";
      avisoStatus.textContent = `Replaced the aviso for ${
        avisoApplication.selectedIndexes.length
      } client${avisoApplication.selectedIndexes.length === 1 ? "" : "s"}.`;
    });

    allClientsScope.addEventListener("change", updateAvisoScope);
    specificClientsScope.addEventListener("change", updateAvisoScope);
    avisoTextInput.addEventListener("input", markAvisoAsChanged);
    clientNumberInput.addEventListener("input", markAvisoAsChanged);
    avisoTextColor.addEventListener("input", markAvisoAsChanged);

    updateAvisoScope();

    avisoCount++;
  });
});
