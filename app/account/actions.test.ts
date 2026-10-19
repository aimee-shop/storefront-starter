import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  type StorefrontAuthResponse,
} from '@aimee.shop/sdk';
import type { sdk } from '@/lib/sdk';

type StorefrontAuth = typeof sdk.storefront.auth;
type CustomerAuth = ReturnType<typeof sdk.storefront.withCustomer>['auth'];

const { forgotPassword, login, register, resetPassword, logout, cookieStore, redirect } =
  vi.hoisted(() => ({
    forgotPassword: vi.fn<StorefrontAuth['forgotPassword']>(),
    login: vi.fn<StorefrontAuth['login']>(),
    register: vi.fn<StorefrontAuth['register']>(),
    resetPassword: vi.fn<StorefrontAuth['resetPassword']>(),
    logout: vi.fn<CustomerAuth['logout']>(),
    redirect: vi.fn(),
    cookieStore: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
  }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/sdk', () => ({
  sdk: {
    storefront: {
      auth: { forgotPassword, login, register, resetPassword },
      withCustomer: () => ({ auth: { logout } }),
    },
  },
}));

import {
  forgotPasswordAction,
  loginAction,
  logoutAction,
  registerAction,
  resetPasswordAction,
} from './actions';

const GENERIC = 'Something went wrong. Please try again.';
const signIn = { email: 'shopper@example.com', password: 'secret' };
const signUp = {
  email: 'shopper@example.com',
  password: 'Secret1!',
  confirmPassword: 'Secret1!',
  firstName: 'Ada',
  lastName: '',
};
const reset = {
  email: 'shopper@example.com',
  confirmationCode: '123456',
  newPassword: 'Secret1!',
};
const authResponse: StorefrontAuthResponse = {
  customer: {
    id: 'cust-1',
    email: 'shopper@example.com',
    acceptsMarketing: false,
    smsOptIn: false,
    customerType: 'individual',
    isGuest: false,
  },
  accessToken: 'a',
  refreshToken: 'r',
};

describe('forgotPasswordAction', () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it('reports success for a 4xx so the form cannot tell whether the account exists', async () => {
    forgotPassword.mockRejectedValue(new NotFoundError('missing'));
    await expect(
      forgotPasswordAction({ email: 'shopper@example.com' }),
    ).resolves.toEqual({ ok: true });
  });

  it('returns a generic error when rate limited', async () => {
    forgotPassword.mockRejectedValue(new RateLimitError('slow down', 60));
    await expect(
      forgotPasswordAction({ email: 'shopper@example.com' }),
    ).resolves.toEqual({ ok: false, formError: GENERIC });
  });

  it('returns a generic error on a 5xx', async () => {
    forgotPassword.mockRejectedValue(new ApiError('down', 503, 'UNKNOWN'));
    await expect(
      forgotPasswordAction({ email: 'shopper@example.com' }),
    ).resolves.toEqual({ ok: false, formError: GENERIC });
  });

  it('returns a generic error when the request never reaches the API', async () => {
    forgotPassword.mockRejectedValue(new Error('network down'));
    await expect(
      forgotPasswordAction({ email: 'shopper@example.com' }),
    ).resolves.toEqual({ ok: false, formError: GENERIC });
  });

  it('returns field errors for an invalid email', async () => {
    await expect(forgotPasswordAction({ email: 'not-an-email' })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { email: expect.any(String) },
    });
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('succeeds when the API accepts the email', async () => {
    forgotPassword.mockResolvedValue(undefined);
    await expect(
      forgotPasswordAction({ email: 'shopper@example.com' }),
    ).resolves.toEqual({ ok: true });
  });
});

describe('loginAction', () => {
  beforeEach(() => {
    login.mockReset();
    redirect.mockReset();
  });

  it('returns field errors for invalid input', async () => {
    await expect(loginAction({ email: 'nope', password: '' })).resolves.toMatchObject({
      ok: false,
      fieldErrors: expect.any(Object),
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('returns an invalid-credentials error on an auth failure', async () => {
    login.mockRejectedValue(new AuthenticationError('no'));
    await expect(loginAction(signIn)).resolves.toEqual({
      ok: false,
      formError: 'Invalid email or password.',
    });
  });

  it('returns a generic error on other failures', async () => {
    login.mockRejectedValue(new ApiError('down', 500, 'UNKNOWN'));
    await expect(loginAction(signIn)).resolves.toEqual({ ok: false, formError: GENERIC });
  });

  it('sets the session cookies on success', async () => {
    login.mockResolvedValue(authResponse);
    await expect(loginAction(signIn)).resolves.toEqual({ ok: true });
    expect(cookieStore.set).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to a safe return path on success', async () => {
    login.mockResolvedValue(authResponse);
    await loginAction(signIn, '/products/hat');
    expect(redirect).toHaveBeenCalledWith('/products/hat');
  });
});

describe('registerAction', () => {
  beforeEach(() => {
    register.mockReset();
  });

  it('returns field errors for invalid input', async () => {
    await expect(
      registerAction({ ...signUp, password: 'short', confirmPassword: 'short' }),
    ).resolves.toMatchObject({ ok: false, fieldErrors: expect.any(Object) });
    expect(register).not.toHaveBeenCalled();
  });

  it('returns a create-account error on a validation failure', async () => {
    register.mockRejectedValue(new ValidationError('taken'));
    await expect(registerAction(signUp)).resolves.toMatchObject({
      ok: false,
      formError: expect.stringContaining('Could not create your account'),
    });
  });

  it('returns a generic error on other failures', async () => {
    register.mockRejectedValue(new Error('down'));
    await expect(registerAction(signUp)).resolves.toEqual({ ok: false, formError: GENERIC });
  });

  it('sends blank names as undefined and succeeds', async () => {
    register.mockResolvedValue(authResponse);
    await expect(
      registerAction({ ...signUp, firstName: '', lastName: 'Lovelace' }),
    ).resolves.toEqual({ ok: true });
    expect(register).toHaveBeenCalledWith({
      email: signUp.email,
      password: signUp.password,
      firstName: undefined,
      lastName: 'Lovelace',
    });
  });
});

describe('logoutAction', () => {
  beforeEach(() => {
    logout.mockReset();
    cookieStore.get.mockReset();
  });

  it('clears the session without calling the API when there is no token', async () => {
    cookieStore.get.mockReturnValue(undefined);
    await logoutAction();
    expect(logout).not.toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalled();
  });

  it('revokes the session and clears cookies', async () => {
    cookieStore.get.mockReturnValue({ value: 'token' });
    logout.mockResolvedValue(undefined);
    await logoutAction();
    expect(logout).toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalled();
  });

  it('clears the session quietly when the token is already invalid', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cookieStore.get.mockReturnValue({ value: 'token' });
    logout.mockRejectedValue(new AuthenticationError('expired'));
    await logoutAction();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('logs unexpected revocation failures and still clears the session', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cookieStore.get.mockReturnValue({ value: 'token' });
    logout.mockRejectedValue(new Error('down'));
    await logoutAction();
    expect(errorSpy).toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('resetPasswordAction', () => {
  beforeEach(() => {
    resetPassword.mockReset();
    redirect.mockReset();
  });

  it('returns field errors for invalid input', async () => {
    await expect(
      resetPasswordAction({ ...reset, confirmationCode: '' }),
    ).resolves.toMatchObject({ ok: false, fieldErrors: expect.any(Object) });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('returns an invalid-code error on an auth failure', async () => {
    resetPassword.mockRejectedValue(new AuthenticationError('bad code'));
    await expect(resetPasswordAction(reset)).resolves.toMatchObject({
      ok: false,
      formError: expect.stringContaining('Invalid or expired code'),
    });
  });

  it('returns an invalid-code error on a validation failure', async () => {
    resetPassword.mockRejectedValue(new ValidationError('weak'));
    await expect(resetPasswordAction(reset)).resolves.toMatchObject({
      ok: false,
      formError: expect.stringContaining('Invalid or expired code'),
    });
  });

  it('returns a generic error on other failures', async () => {
    resetPassword.mockRejectedValue(new Error('down'));
    await expect(resetPasswordAction(reset)).resolves.toEqual({
      ok: false,
      formError: GENERIC,
    });
  });

  it('redirects to the account page on success', async () => {
    resetPassword.mockResolvedValue(undefined);
    await resetPasswordAction(reset);
    expect(redirect).toHaveBeenCalledWith('/account?reset=1');
  });
});
