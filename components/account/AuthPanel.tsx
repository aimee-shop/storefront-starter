'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

/**
 * Signed-out account panel: Sign In / Create Account tabs, with a
 * forgot-password view toggled from the sign-in form.
 */
export function AuthPanel({ nextPath }: { nextPath?: string | null }) {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (showForgotPassword) {
    return (
      <div className="rounded-lg border p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold">Reset your password</h2>
        <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="sign-in">
      <TabsList className="w-full">
        <TabsTrigger value="sign-in" className="flex-1">
          Sign In
        </TabsTrigger>
        <TabsTrigger value="sign-up" className="flex-1">
          Create Account
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in" className="rounded-lg border p-6 sm:p-8">
        <SignInForm
          onForgotPassword={() => setShowForgotPassword(true)}
          nextPath={nextPath}
        />
      </TabsContent>
      <TabsContent value="sign-up" className="rounded-lg border p-6 sm:p-8">
        <SignUpForm nextPath={nextPath} />
      </TabsContent>
    </Tabs>
  );
}
