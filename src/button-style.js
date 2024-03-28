'use strict';

const defaultColor = '#273136';
const activeColor = '#246b4f';

const setButtonStyle = function (
  fileInputButton,
  file,
  sheetList,
  generateBoletasButton,
  fetchDataButton,
  style
) {
  if (style === 'clicked') {
    fileInputButton.style.backgroundColor = activeColor;
    fileInputButton.innerText = file.name;
    sheetList.style.display = 'inline';
    generateBoletasButton.style.display = 'inline';
    fetchDataButton.style.display = 'inline';
  }
  if (style === 'unclicked') {
    fileInputButton.style.backgroundColor = defaultColor;
    fileInputButton.innerText = 'Seleccione Archivo';
    sheetList.style.display = 'none';
    generateBoletasButton.style.display = 'none';
    fetchDataButton.style.display = 'none';
  }
};

const setButtonClicked = function (button, color = activeColor) {
  button.style.display = 'inline';
  button.style.backgroundColor = color;
};
const setButtonNotClicked = function (button, color = defaultColor) {
  button.style.display = 'none';
  button.style.backgroundColor = color;
};
const setInputButtonClicked = function (button, file, list, color = activeColor) {
  button.innerText = file.name;
  button.style.display = 'inline';
  list.style.display = 'inline';
  button.style.backgroundColor = color;
};
const setInputButtonNotClicked = function (button, list, color = defaultColor) {
  button.innerText = 'Seleccione Archivo';
  list.style.display = 'none';
  button.style.backgroundColor = color;
};
const revealButton = function (button, color = defaultColor) {
  button.style.display = 'inline';
  button.style.backgroundColor = color;
};
const hideButton = function (button, color = defaultColor) {
  button.style.display = 'none';
  button.style.backgroundColor = color;
};

export {
  setButtonStyle,
  setButtonClicked,
  setButtonNotClicked,
  setInputButtonClicked,
  setInputButtonNotClicked,
  revealButton,
  hideButton,
};
