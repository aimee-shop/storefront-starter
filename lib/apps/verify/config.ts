import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import type { PackageExport } from '../types';

/**
 * Minimal JSON Schema subset validator for mount configuration.
 * Supports: type object/string/number/boolean/array, required, additionalProperties,
 * minLength, properties (nested objects).
 *
 * Intentionally small -- full AJV is not required for fixture gates.
 */
export function assertConfigValid(
  exp: PackageExport,
  configuration: unknown,
): Record<string, unknown> {
  const schema = exp.configSchema;
  if (!schema) {
    if (
      configuration === undefined ||
      configuration === null ||
      (typeof configuration === 'object' &&
        !Array.isArray(configuration) &&
        Object.keys(configuration as object).length === 0)
    ) {
      return {};
    }
    if (typeof configuration === 'object' && !Array.isArray(configuration)) {
      return configuration as Record<string, unknown>;
    }
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.CONFIG_INVALID,
      `Configuration for export ${exp.id} must be an object`,
    );
  }

  const errors = validate(configuration, schema, '$');
  if (errors.length > 0) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.CONFIG_INVALID,
      `Configuration failed schema for export ${exp.id}`,
      { errors },
    );
  }
  return configuration as Record<string, unknown>;
}

function validate(
  value: unknown,
  schema: Record<string, unknown>,
  path: string,
): string[] {
  const errors: string[] = [];
  const type = schema.type;

  if (type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return [`${path}: expected object`];
    }
    const obj = value as Record<string, unknown>;
    const required = (schema.required as string[] | undefined) ?? [];
    for (const key of required) {
      if (!(key in obj)) errors.push(`${path}.${key}: required`);
    }
    const props = (schema.properties as Record<string, Record<string, unknown>>) ?? {};
    const additional = schema.additionalProperties;
    for (const [key, child] of Object.entries(obj)) {
      if (props[key]) {
        errors.push(...validate(child, props[key], `${path}.${key}`));
      } else if (additional === false) {
        errors.push(`${path}.${key}: additional property not allowed`);
      }
    }
    return errors;
  }

  if (type === 'string') {
    if (typeof value !== 'string') return [`${path}: expected string`];
    const minLength = schema.minLength as number | undefined;
    if (typeof minLength === 'number' && value.length < minLength) {
      errors.push(`${path}: minLength ${minLength}`);
    }
    return errors;
  }

  if (type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return [`${path}: expected number`];
    }
    return errors;
  }

  if (type === 'boolean') {
    if (typeof value !== 'boolean') return [`${path}: expected boolean`];
    return errors;
  }

  if (type === 'array') {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    return errors;
  }

  return errors;
}
