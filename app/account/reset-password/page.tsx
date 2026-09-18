import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/account/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your account password with the code from your email.',
};

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter the verification code from your email and choose a new
            password.
          </p>
        </div>
        <div className="rounded-lg border p-6 sm:p-8">
          <ResetPasswordForm initialEmail={typeof email === 'string' ? email : ''} />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/account" className="underline-offset-4 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
