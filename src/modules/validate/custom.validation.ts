import { CustomHelpers } from 'joi';

export const objectId = (value: string, helpers: CustomHelpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message({ custom: '"{{#label}}" must be a valid mongo id' });
  }
  return value;
};

export const password = (value: string, helpers: CustomHelpers) => {
  if (value.length < 4) {
    return helpers.message({ custom: 'password must be at least 4 characters' });
  }
  return value;
};
