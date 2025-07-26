
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <MailCheck className="h-16 w-16 text-accent mb-4" />
        <CardTitle className="text-2xl font-headline">Verify your email</CardTitle>
        <CardDescription>
          We've sent a verification link to your email address. Please click the link to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground mb-6">
          Didn't receive an email? Check your spam folder or wait a few minutes.
        </p>
        <Button asChild>
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
