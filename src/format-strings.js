'use strict';

const getExpiryDate = function () {
  const expiryDate = new Date();
  expiryDate.setDate(20);
  const date = expiryDate.getDate();
  const month = expiryDate.toLocaleString('es-CL', { month: 'long' }).toUpperCase();
  const year = expiryDate.getFullYear();
  return `${date}-${month}-${year}`;
};

const getShortExpiryDate = function () {
  const expiryDate = new Date();
  expiryDate.setDate(20);
  const option = { dateStyle: 'short' };
  return new Intl.DateTimeFormat('es-CL', option).format(expiryDate);
};

const getIssueDate = function () {
  const issueDate = new Date();
  if (issueDate.getDate() > 20) issueDate.setMonth(issueDate.getMonth() + 1);
  issueDate.setDate(0);

  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(issueDate);
  return `${date}-${month}-${year}`;
};

const getShortIssueDate = function () {
  const issueDate = new Date();
  const option = { dateStyle: 'short' };
  return new Intl.DateTimeFormat('es-CL', option).format(issueDate);
};

const getMonthNames = function (boletaMonth) {
  const monthNamesArray = [];
  for (let i = 13; i > 0; i--) {
    const today = new Date();
    today.setMonth(boletaMonth - i);
    monthNamesArray.push(today.toLocaleString('es-CL', { month: 'short' }));
  }
  return monthNamesArray;
};

const getFormattedAsCurrecy = function (value) {
  if (!isFinite(value)) value = 0;
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const getFormattedRut = function (rut) {
  const rutSinVerificador = rut.slice(0, rut.indexOf('-'));
  const verificadorDelRut = rut.slice(rut.indexOf('-' + 1));
  return `${new Intl.NumberFormat('es-CL').format(rutSinVerificador)}-${verificadorDelRut}`;
};

export { getExpiryDate, getShortExpiryDate, getShortIssueDate, getIssueDate, getMonthNames, getFormattedAsCurrecy, getFormattedRut };
