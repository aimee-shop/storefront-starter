import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(200, 'Name is too long'),
  email: z.email('Enter a valid email address'),
  subject: z
    .string()
    .trim()
    .min(1, 'Enter a subject')
    .max(300, 'Subject is too long'),
  message: z
    .string()
    .trim()
    .min(1, 'Enter a message')
    .max(5000, 'Message is too long'),
});

export type NewsletterValues = z.infer<typeof newsletterSchema>;
export type ContactValues = z.infer<typeof contactSchema>;
