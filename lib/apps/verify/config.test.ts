import { describe, expect, it } from 'vitest';
import { PackageVerifyError } from '../errors';
import type { PackageExport } from '../types';
import { assertConfigValid } from './config';

function exp(configSchema?: Record<string, unknown>): PackageExport {
  return {
    id: 'widget',
    entry: 'index.js',
    environments: ['browser'],
    configSchema,
  };
}

describe('assertConfigValid', () => {
  it('accepts an empty configuration when the export has no schema', () => {
    expect(assertConfigValid(exp(), undefined)).toEqual({});
    expect(assertConfigValid(exp(), null)).toEqual({});
    expect(assertConfigValid(exp(), {})).toEqual({});
  });

  it('keeps a free-form object and rejects a non-object when there is no schema', () => {
    expect(assertConfigValid(exp(), { label: 'Hats' })).toEqual({ label: 'Hats' });
    expect(() => assertConfigValid(exp(), 'nope')).toThrow(PackageVerifyError);
    expect(() => assertConfigValid(exp(), [])).toThrow(PackageVerifyError);
  });

  it('checks object, string, number, boolean, and array schemas', () => {
    const schema = {
      type: 'object',
      required: ['title'],
      additionalProperties: false,
      properties: {
        title: { type: 'string', minLength: 2 },
        count: { type: 'number' },
        featured: { type: 'boolean' },
        tags: { type: 'array' },
        nested: { type: 'object', properties: { name: { type: 'string' } } },
      },
    };

    expect(
      assertConfigValid(exp(schema), {
        title: 'Hat',
        count: 1,
        featured: true,
        tags: ['a'],
        nested: { name: 'wool' },
      }),
    ).toMatchObject({ title: 'Hat' });

    expect(() => assertConfigValid(exp(schema), null)).toThrow(PackageVerifyError);
    expect(() =>
      assertConfigValid(exp(schema), { count: Number.NaN, extra: true, title: 'H' }),
    ).toThrow(PackageVerifyError);
    expect(() =>
      assertConfigValid(exp(schema), {
        title: 'Hat',
        count: '1',
        featured: 'yes',
        tags: 'a',
        nested: [],
      }),
    ).toThrow(PackageVerifyError);
  });
});
