'use stricts';

import * as databaseVariables from './database-data.js';
const validNumbersInputArray = [];

const injectAviso = function (
  dataObject,
  avisoInputText,
  clientNumberInput,
  avisoTextColorValue = [0, 0, 0]
) {
  let isValidEntry = true;
  let hasFoundClient = false;
  const wrongNumbersInputArray = [];
  const validNumberIndexArray = [];
  console.log(avisoTextColorValue);
  let clientNumberArray;
  let clientNumberValue = clientNumberInput.value.trim();
  const dataObjectLength = dataObject.CdgIntRecep.length;
  const firstNumeroCliente = Number(dataObject.CdgIntRecep[0]);
  const lastNumeroCliente = Number(dataObject.CdgIntRecep[dataObjectLength - 1]);

  //110070,110020,121400
  //110056,110320,110424
  //110070,110020,12140
  if (clientNumberValue.includes('-')) {
    clientNumberArray = clientNumberValue
      .split('-')
      .map(num => Number(num.trim()))
      .sort((a, b) => a - b);
    if (
      clientNumberArray.length > 2 ||
      !isFinite(clientNumberArray[0]) ||
      !isFinite(clientNumberArray[1]) ||
      clientNumberArray[0] < firstNumeroCliente ||
      clientNumberArray[1] > lastNumeroCliente
    ) {
      console.error('DASH ENTRY');
      isValidEntry = false;
    }
    if (isValidEntry) {
      for (let i = 0; i < dataObjectLength; i++) {
        if (clientNumberArray[0] === dataObject.CdgIntRecep[i]) {
          hasFoundClient = true;
        }
        if (hasFoundClient) {
          validNumbersInputArray.push(dataObject.CdgIntRecep[i]);
          dataObject.Aviso[i] = avisoInputText.value;
          dataObject.Color[i] = avisoTextColorValue;
        }
        if (clientNumberArray[1] === dataObject.CdgIntRecep[i]) break;
      }
    }
  } else if (clientNumberValue.includes(',')) {
    clientNumberArray = clientNumberValue
      .split(',')
      .map(num => Number(num.trim()))
      .sort((a, b) => a - b);
    if (
      clientNumberArray[0] < dataObject.CdgIntRecep[0] ||
      clientNumberArray[clientNumberArray.length - 1] >
        dataObject.CdgIntRecep[dataObjectLength - 1]
    ) {
      console.error('COMMA ENTRY');
      isValidEntry = false;
    }
    clientNumberArray.forEach(num => {
      if (!isFinite(num)) {
        isValidEntry = false;
        console.error('COMMA ENTRY');
      }
    });
    if (isValidEntry) {
      console.log(`Valid input for clients ${clientNumberArray} `);
      for (let i = 0; i < dataObjectLength; i++) {
        if (dataObject.CdgIntRecep[i] > clientNumberArray[0]) {
          wrongNumbersInputArray.push(clientNumberArray.shift());
        }
        if (clientNumberArray[0] === dataObject.CdgIntRecep[i]) {
          hasFoundClient = true;
          validNumbersInputArray.push(clientNumberArray.shift());
          validNumberIndexArray.push(i);
          if (!clientNumberArray.length) break;
        }
      }
      if (wrongNumbersInputArray.length) {
        hasFoundClient = false;
      } else {
        validNumberIndexArray.forEach(num => {
          dataObject.Color[num] = avisoTextColorValue;
          dataObject.Aviso[num] = avisoInputText.value;
        });
      }
    }
  } else {
    clientNumberValue = Number(clientNumberValue);
    if (
      !isFinite(clientNumberValue) ||
      clientNumberValue < dataObject.CdgIntRecep[0] ||
      clientNumberValue > dataObject.CdgIntRecep[dataObjectLength - 1]
    ) {
      console.error('SINGLE ENTRY', typeof clientNumberValue);
      isValidEntry = false;
    }
    if (isValidEntry) {
      console.log(`Valid input for client ${clientNumberValue} `);
      for (let i = 0; i < dataObjectLength; i++) {
        if (clientNumberValue === dataObject.CdgIntRecep[i]) {
          hasFoundClient = true;
          validNumbersInputArray.push(clientNumberValue);
          dataObject.Aviso[i] = avisoInputText.value;
          dataObject.Color[i] = avisoTextColorValue;
          break;
        }
      }
    }
  }

  if (isValidEntry) {
    clientNumberInput.disabled = true;
  }
  if (!hasFoundClient) console.error('INVALID INPUT');
};

export { injectAviso };
