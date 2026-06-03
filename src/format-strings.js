'use strict';

const isValidBillingPeriod = function (billingPeriod) {
  return (
    billingPeriod &&
    Number.isInteger(billingPeriod.year) &&
    Number.isInteger(billingPeriod.month) &&
    billingPeriod.month >= 1 &&
    billingPeriod.month <= 12
  );
};

const normalizeDateOptions = function (dateOptions) {
  if (isValidBillingPeriod(dateOptions)) {
    return { billingPeriod: dateOptions };
  }

  return dateOptions || {};
};

const getDateFromInputValue = function (dateInputValue) {
  if (dateInputValue instanceof Date && !Number.isNaN(dateInputValue.getTime())) {
    return new Date(
      dateInputValue.getFullYear(),
      dateInputValue.getMonth(),
      dateInputValue.getDate()
    );
  }

  const matches = String(dateInputValue ?? "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

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

  return date;
};

const getIssueDateObject = function (dateOptions) {
  const { billingPeriod, issueDate } = normalizeDateOptions(dateOptions);
  const selectedIssueDate = getDateFromInputValue(issueDate);

  if (selectedIssueDate) {
    return selectedIssueDate;
  }

  if (isValidBillingPeriod(billingPeriod)) {
    return new Date(billingPeriod.year, billingPeriod.month, 0);
  }

  const fallbackIssueDate = new Date();
  if (fallbackIssueDate.getDate() > 20) {
    fallbackIssueDate.setMonth(fallbackIssueDate.getMonth() + 1);
  }
  fallbackIssueDate.setDate(0);
  return fallbackIssueDate;
};

const getExpiryDateObject = function (dateOptions) {
  const issueDate = getIssueDateObject(dateOptions);
  return new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 20);
};

const getExpiryDate = function (dateOptions) {
  const expiryDate = getExpiryDateObject(dateOptions);
  const date = expiryDate.getDate();
  const month = expiryDate.toLocaleString('es-CL', { month: 'long' }).toUpperCase();
  const year = expiryDate.getFullYear();
  return `${date}-${month}-${year}`;
};

const getShortExpiryDate = function (dateOptions) {
  const expiryDate = getExpiryDateObject(dateOptions);
  const option = { dateStyle: 'short' };
  return new Intl.DateTimeFormat('es-CL', option).format(expiryDate);
};

const getIssueDate = function (dateOptions) {
  const issueDate = getIssueDateObject(dateOptions);
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(issueDate);
};

const getShortIssueDate = function (dateOptions) {
  const issueDate = getIssueDateObject(dateOptions);
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
