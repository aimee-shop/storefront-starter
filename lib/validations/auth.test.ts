import { describe, expect, it } from 'vitest';
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './auth';

const POLICY_PASSWORD = 'Password1!';
const WEAK_PASSWORD = 'password';

describe('signUpSchema', () => {
  const valid = {
    email: 'shopper@example.com',
    password: POLICY_PASSWORD,
    confirmPassword: POLICY_PASSWORD,
  };

  it('accepts a password that meets the Cognito pool policy', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a min-8 password missing upper, number, and symbol', () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: WEAK_PASSWORD,
      confirmPassword: WEAK_PASSWORD,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a space as the only non-alphanumeric (not a Cognito symbol)', () => {
    const spaced = 'Password1 x';
    const result = signUpSchema.safeParse({
      ...valid,
      password: spaced,
      confirmPassword: spaced,
    });
    expect(result.success).toBe(false);
  });

  it('treats each Cognito special as a satisfying symbol', () => {
    const symbols = '^$*.[]{}()?"!@#%&/\\,><\':;|_~`=+-';
    for (const ch of symbols) {
      const password = `Password1${ch}`;
      expect(
        signUpSchema.safeParse({
          ...valid,
          password,
          confirmPassword: password,
        }).success,
        ch
      ).toBe(true);
    }
  });

  it('rejects a confirmPassword mismatch', () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: 'Password1?',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'confirmPassword')).toBe(
      true
    );
  });
});

describe('resetPasswordSchema', () => {
  const valid = {
    email: 'shopper@example.com',
    confirmationCode: '123456',
    newPassword: POLICY_PASSWORD,
  };

  it('accepts a new password that meets the Cognito pool policy', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a min-8 password missing upper, number, and symbol', () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      newPassword: WEAK_PASSWORD,
    });
    expect(result.success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts any non-empty password (presence only)', () => {
    const result = signInSchema.safeParse({
      email: 'shopper@example.com',
      password: WEAK_PASSWORD,
    });
    expect(result.success).toBe(true);
  });
});
