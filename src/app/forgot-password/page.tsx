
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { handlePasswordReset } from "@/firebase/auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

const forgotPasswordFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

function ForgotPasswordContent() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true);
    try {
      await handlePasswordReset(auth, data.email);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${data.email}, you will receive an email with instructions to reset your password.`,
      });
      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${data.email}, you will receive an email with instructions to reset your password.`,
      });
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  const loginLink = isAdmin ? "/admin/login" : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      {isAdmin ? null : <PublicHeader />}
      <main className="flex-1 flex items-center justify-center bg-secondary p-4">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
            <CardDescription>
              {isSubmitted 
                ? "Please check your inbox (and spam folder) for the reset link."
                : "Enter your email address and we'll send you a link to reset your password."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSubmitted ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              </Form>
            ) : (
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">You can now close this page.</p>
                </div>
            )}
             <p className="mt-4 text-center text-sm text-muted-foreground">
                Remembered your password? <Link href={loginLink} className="underline hover:text-primary">Back to login</Link>.
            </p>
          </CardContent>
        </Card>
      </main>
      {isAdmin ? null : <PublicFooter />}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
