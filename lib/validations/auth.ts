import { z } from 'zod';

/**
 * Shared Cognito pool PasswordPolicy (cognito-shared-user-pool.yaml):
 * MinimumLength 8, RequireUppercase, RequireLowercase, RequireNumbers,
 * RequireSymbols. Sign-in stays presence-only so existing accounts can log in.
 *
 * RequireSymbols only counts Cognito's documented set
 * (^ $ * . [ ] { } ( ) ? - " ! @ # % & / \ , > < ' : ; | _ ~ ` + =).
 * Other non-alphanumerics (space, etc.) are allowed mid-password but do not
 * satisfy the symbol rule.
 */
export const PASSWORD_MIN = 8;

const COGNITO_SYMBOL = /[\^$*.[\]{}()?"!@#%&\/\\,><':;|_~`=+-]/;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(COGNITO_SYMBOL, 'Must contain a special character');

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z
  .object({
    email: z.email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
  confirmationCode: z.string().min(1, 'Enter the code from your email'),
  newPassword: passwordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
