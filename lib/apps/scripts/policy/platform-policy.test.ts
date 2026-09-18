import { describe, expect, it } from 'vitest';
import { loadPlatformScriptPolicy, parseAllowedScriptOrigins } from './platform-policy';

describe('parseAllowedScriptOrigins', () => {
  it('parses and normalizes comma-separated HTTPS origins', () => {
    expect(
      parseAllowedScriptOrigins(
        'https://scripts.example.com, https://cdn.example.com/path?q=1',
      ),
    ).toEqual(['https://scripts.example.com', 'https://cdn.example.com']);
  });

  it('drops non-HTTPS and malformed entries', () => {
    expect(
      parseAllowedScriptOrigins('http://insecure.example.com,not a url,,'),
    ).toEqual([]);
  });

  it('dedupes origins', () => {
    expect(
      parseAllowedScriptOrigins('https://a.example.com,https://a.example.com/x'),
    ).toEqual(['https://a.example.com']);
  });

  it('fails closed on missing value', () => {
    expect(parseAllowedScriptOrigins(undefined)).toEqual([]);
    expect(parseAllowedScriptOrigins('')).toEqual([]);
  });
});

describe('loadPlatformScriptPolicy', () => {
  it('reads the allowlist from APPS_SCRIPT_ALLOWED_ORIGINS', () => {
    const policy = loadPlatformScriptPolicy({
      APPS_SCRIPT_ALLOWED_ORIGINS: 'https://scripts.example.com',
    });
    expect(policy.allowedOrigins).toEqual(['https://scripts.example.com']);
  });

  it('defaults to an empty allowlist (no script resolves)', () => {
    const policy = loadPlatformScriptPolicy({});
    expect(policy.allowedOrigins).toEqual([]);
    expect(policy.defaultPageScope.allow).toEqual(['/**']);
    expect(policy.defaultMaxLoadMs).toBeLessThanOrEqual(policy.maxAllowedLoadMs);
  });
});
