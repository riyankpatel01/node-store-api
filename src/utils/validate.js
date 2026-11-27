const { ApiError } = require('./errors');

/**
 * Small schema validator: checks types, lengths, ranges, patterns and enums,
 * trims strings and converts numeric strings to numbers.
 *
 * @param {object} schema  { field: { type, required, min, max, pattern, enum, default, message } }
 * @param {object} data    Input (req.body or req.query)
 * @param {object} options { partial: true } for PATCH, where every field is optional
 * @returns {object} Clean values containing only fields from the schema
 * @throws {ApiError} 422 with a field => message map
 */
function validate(schema, data, { partial = false } = {}) {
  const input = data && typeof data === 'object' ? data : {};
  const errors = {};
  const value = {};

  for (const [field, rules] of Object.entries(schema)) {
    let v = input[field];

    if (v === undefined || v === null || v === '') {
      if (!partial && rules.required) errors[field] = `${field} is required`;
      else if (!partial && rules.default !== undefined) value[field] = rules.default;
      continue;
    }

    if (rules.type === 'string') {
      if (typeof v !== 'string') {
        errors[field] = `${field} must be a string`;
        continue;
      }
      v = v.trim();
      if (rules.min && v.length < rules.min) errors[field] = `${field} must be at least ${rules.min} characters`;
      else if (rules.max && v.length > rules.max) errors[field] = `${field} must be at most ${rules.max} characters`;
      else if (rules.pattern && !rules.pattern.test(v)) errors[field] = rules.message || `${field} is invalid`;
      else if (rules.enum && !rules.enum.includes(v)) errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
    } else if (rules.type === 'number' || rules.type === 'integer') {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      if (!Number.isFinite(n)) errors[field] = `${field} must be a number`;
      else if (rules.type === 'integer' && !Number.isInteger(n)) errors[field] = `${field} must be a whole number`;
      else if (rules.min !== undefined && n < rules.min) errors[field] = `${field} must be at least ${rules.min}`;
      else if (rules.max !== undefined && n > rules.max) errors[field] = `${field} must be at most ${rules.max}`;
      v = n;
    }

    if (!errors[field]) value[field] = v;
  }

  if (partial && !Object.keys(value).length && !Object.keys(errors).length) {
    errors.body = 'Provide at least one field to update';
  }
  if (Object.keys(errors).length) {
    throw new ApiError(422, 'Validation failed', errors);
  }
  return value;
}

/**
 * Parse a route :id parameter as a positive integer.
 */
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'id must be a positive integer');
  return id;
}

module.exports = { validate, parseId };
