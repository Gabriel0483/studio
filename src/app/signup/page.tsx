
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { handleSignUp } from "@/firebase/auth"
import { useAuth, useUser, useAuthContext } from "@/firebase";
import { Loader2, UserPlus } from "lucide-react"
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

const signupFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupFormSchema>;

function SignupContent() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { isAuthReady } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthReady && !isUserLoading && user) {
        router.replace('/my-bookings');
    }
  }, [isAuthReady, isUserLoading, user, router]);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    try {
      await handleSignUp(auth, data.email, data.password);
      toast({
        title: "Account Created",
        description: "Welcome to Isla Konek! You can now start booking your trips.",
      });
      router.push('/my-bookings');
    } catch (error: any) {
      console.error("Signup error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error && error.code) {
        if (error.code === 'auth/email-already-in-use') {
          description = "This email is already registered. Please try logging in.";
        } else if (error.code === 'auth/invalid-email') {
            description = "The email address is invalid.";
        } else if (error.code === 'auth/operation-not-allowed') {
            description = "Email/password accounts are not enabled. Please contact support.";
        } else if (error.code === 'auth/weak-password') {
            description = "The password is too weak.";
        } else {
          description = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: description,
      });
    } finally {
        setIsLoading(false);
    }
  }

  // Show loading while checking auth state
  if (!isAuthReady || isUserLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground font-medium">Preparing your account...</p>
        </div>
    );
  }

  // If user is already authenticated and we haven't redirected yet, don't show the form
  if (user) {
      return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center bg-secondary/50 p-4">
            <Card className="mx-auto w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                    <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Create an Account</CardTitle>
                <CardDescription>
                    Join Isla Konek to manage your bookings and profile.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" size="lg" className="w-full font-semibold" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </Button>
                    </form>
                </Form>
                 <div className="mt-6 text-center text-sm text-muted-foreground border-t pt-4">
                    Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
                </div>
                </CardContent>
            </Card>
        </main>
      <PublicFooter />
    </div>
  )
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    )
}
