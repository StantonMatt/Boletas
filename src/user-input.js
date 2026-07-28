"use strict";

const getNumericClientNumbers = function (clientNumbers) {
  return clientNumbers.map((clientNumber) => Number(clientNumber));
};

const getClientIndexMap = function (clientNumbers) {
  const clientIndexMap = new Map();

  clientNumbers.forEach((clientNumber, index) => {
    const numericClientNumber = Number(clientNumber);

    if (!clientIndexMap.has(numericClientNumber)) {
      clientIndexMap.set(numericClientNumber, []);
    }

    clientIndexMap.get(numericClientNumber).push(index);
  });

  return clientIndexMap;
};

const getParsedClientNumber = function (value) {
  const parsedValue = Number(String(value).trim());
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const buildErrorResult = function (errorMessage, invalidClientNumbers = []) {
  return {
    isValid: false,
    selectedIndexes: [],
    invalidClientNumbers,
    errorMessage,
  };
};

const buildSuccessResult = function (selectedIndexes) {
  return {
    isValid: true,
    selectedIndexes: [...new Set(selectedIndexes)].sort((a, b) => a - b),
    invalidClientNumbers: [],
    errorMessage: "",
  };
};

const parseClientSelection = function (
  clientNumbers,
  rawInput,
  { allowEmptySelection = false } = {}
) {
  const trimmedInput = String(rawInput ?? "").trim();
  const normalizedClientNumbers = getNumericClientNumbers(clientNumbers);

  if (!trimmedInput) {
    if (!allowEmptySelection) {
      return buildErrorResult("Please enter at least one client number.");
    }

    return buildSuccessResult(normalizedClientNumbers.map((_, index) => index));
  }

  const clientIndexMap = getClientIndexMap(clientNumbers);

  if (trimmedInput.includes(",") && trimmedInput.includes("-")) {
    return buildErrorResult(
      "Use either a comma-separated list or a single range with a dash."
    );
  }

  if (trimmedInput.includes("-")) {
    const rangeParts = trimmedInput.split("-").map((part) => part.trim());

    if (rangeParts.length !== 2) {
      return buildErrorResult(
        "Client ranges must contain exactly two client numbers."
      );
    }

    const rangeStart = getParsedClientNumber(rangeParts[0]);
    const rangeEnd = getParsedClientNumber(rangeParts[1]);

    if (rangeStart === null || rangeEnd === null) {
      return buildErrorResult("Client ranges must contain valid numbers.");
    }

    const minimumClientNumber = Math.min(rangeStart, rangeEnd);
    const maximumClientNumber = Math.max(rangeStart, rangeEnd);
    const selectedIndexes = [];

    normalizedClientNumbers.forEach((clientNumber, index) => {
      if (
        clientNumber >= minimumClientNumber &&
        clientNumber <= maximumClientNumber
      ) {
        selectedIndexes.push(index);
      }
    });

    if (!selectedIndexes.length) {
      return buildErrorResult(
        `No clients were found in the range ${minimumClientNumber}-${maximumClientNumber}.`
      );
    }

    return buildSuccessResult(selectedIndexes);
  }

  const requestedClientNumbers = trimmedInput.includes(",")
    ? trimmedInput.split(",").map((part) => part.trim())
    : [trimmedInput];

  const invalidClientNumbers = [];
  const selectedIndexes = [];

  requestedClientNumbers.forEach((clientNumberValue) => {
    const parsedClientNumber = getParsedClientNumber(clientNumberValue);

    if (parsedClientNumber === null) {
      invalidClientNumbers.push(clientNumberValue);
      return;
    }

    const matchingIndexes = clientIndexMap.get(parsedClientNumber);

    if (!matchingIndexes || !matchingIndexes.length) {
      invalidClientNumbers.push(parsedClientNumber);
      return;
    }

    selectedIndexes.push(...matchingIndexes);
  });

  if (invalidClientNumbers.length) {
    return buildErrorResult(
      `Client numbers not found: ${invalidClientNumbers.join(", ")}.`,
      invalidClientNumbers
    );
  }

  return buildSuccessResult(selectedIndexes);
};

const getAvisoApplication = function (
  dataObject,
  avisoInputText,
  clientNumberInput,
  avisoTextColorValue = [0, 0, 0],
  { applyToAllClients = false } = {}
) {
  const avisoText = String(avisoInputText.value ?? "").trim();

  if (!avisoText) {
    return buildErrorResult("Please write a custom aviso message.");
  }

  const selection = parseClientSelection(
    dataObject.CdgIntRecep,
    applyToAllClients ? "" : clientNumberInput.value,
    { allowEmptySelection: applyToAllClients }
  );

  if (!selection.isValid) {
    console.error(selection.errorMessage);
    return selection;
  }

  return {
    ...selection,
    avisoText,
    avisoTextColorValue: [...avisoTextColorValue],
  };
};

const applyAvisoApplication = function (dataObject, application) {
  application.selectedIndexes.forEach((index) => {
    dataObject.Aviso[index] = application.avisoText;
    dataObject.Color[index] = [...application.avisoTextColorValue];
  });
};

const applyAvisoApplications = function (
  dataObject,
  originalAvisos,
  originalColors,
  applications
) {
  dataObject.Aviso.splice(0, dataObject.Aviso.length, ...originalAvisos);
  dataObject.Color.splice(
    0,
    dataObject.Color.length,
    ...originalColors.map((color) => [...color])
  );

  applications.forEach((application) => {
    applyAvisoApplication(dataObject, application);
  });
};

const injectAviso = function (
  dataObject,
  avisoInputText,
  clientNumberInput,
  avisoTextColorValue = [0, 0, 0],
  options = {}
) {
  const application = getAvisoApplication(
    dataObject,
    avisoInputText,
    clientNumberInput,
    avisoTextColorValue,
    options
  );

  if (!application.isValid) {
    return application;
  }

  applyAvisoApplication(dataObject, application);
  return application;
};

export {
  applyAvisoApplications,
  getAvisoApplication,
  injectAviso,
  parseClientSelection,
};
