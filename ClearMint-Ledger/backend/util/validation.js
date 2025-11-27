const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateTransaction(payload) {
  const errors = [];
  const { amount, type, category_id, date, description } = payload;

  if (amount === undefined || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Amount must be a positive number.');
  }

  if (!['income', 'expense'].includes(type)) {
    errors.push('Type must be income or expense.');
  }

  if (!category_id || Number.isNaN(Number(category_id))) {
    errors.push('Category is required.');
  }

  if (!date || !DATE_REGEX.test(date) || Number.isNaN(Date.parse(date))) {
    errors.push('Date must be valid.');
  }

  if (!description || !String(description).trim()) {
    errors.push('Description cannot be empty.');
  }

  return errors;
}

function validateCategory(payload) {
  const errors = [];
  const { name, color } = payload;

  if (!name || !String(name).trim()) {
    errors.push('Category name is required.');
  }

  if (!color || !HEX_REGEX.test(color)) {
    errors.push('Color must be a valid hex code.');
  }

  return errors;
}

function validateSettings(payload) {
  const errors = [];
  if (!payload.currency || !String(payload.currency).trim()) {
    errors.push('Currency symbol is required.');
  }
  if (typeof payload.animations_enabled !== 'boolean') {
    errors.push('animations_enabled must be boolean.');
  }
  return errors;
}

module.exports = {
  validateTransaction,
  validateCategory,
  validateSettings
};
