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

  let clientNumberArray;
  let clientNumberValue = clientNumberInput.value.trim();
  const dataObjectLength = dataObject.numeroCliente.length;
  const firstNumeroCliente = Number(dataObject.numeroCliente[0]);
  const lastNumeroCliente = Number(dataObject.numeroCliente[dataObjectLength - 1]);

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
        if (clientNumberArray[0] === dataObject.numeroCliente[i]) {
          hasFoundClient = true;
        }
        if (hasFoundClient) {
          validNumbersInputArray.push(dataObject.numeroCliente[i]);
          dataObject.aviso[i] = avisoInputText.value;
          dataObject.color[i] = avisoTextColorValue;
        }
        if (clientNumberArray[1] === dataObject.numeroCliente[i]) break;
      }
    }
  } else if (clientNumberValue.includes(',')) {
    clientNumberArray = clientNumberValue
      .split(',')
      .map(num => Number(num.trim()))
      .sort((a, b) => a - b);
    if (
      clientNumberArray[0] < dataObject.numeroCliente[0] ||
      clientNumberArray[clientNumberArray.length - 1] >
        dataObject.numeroCliente[dataObjectLength - 1]
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
        if (dataObject.numeroCliente[i] > clientNumberArray[0]) {
          wrongNumbersInputArray.push(clientNumberArray.shift());
        }
        if (clientNumberArray[0] === dataObject.numeroCliente[i]) {
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
          dataObject.color[num] = avisoTextColorValue;
          dataObject.aviso[num] = avisoInputText.value;
        });
      }
    }
  } else {
    clientNumberValue = Number(clientNumberValue);
    if (
      !isFinite(clientNumberValue) ||
      clientNumberValue < dataObject.numeroCliente[0] ||
      clientNumberValue > dataObject.numeroCliente[dataObjectLength - 1]
    ) {
      console.error('SINGLE ENTRY', typeof clientNumberValue);
      isValidEntry = false;
    }
    if (isValidEntry) {
      console.log(`Valid input for client ${clientNumberValue} `);
      for (let i = 0; i < dataObjectLength; i++) {
        if (clientNumberValue === dataObject.numeroCliente[i]) {
          hasFoundClient = true;
          validNumbersInputArray.push(clientNumberValue);
          dataObject.aviso[i] = avisoInputText.value;
          dataObject.color[i] = avisoTextColorValue;
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
