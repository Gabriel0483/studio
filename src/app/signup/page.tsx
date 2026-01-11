
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
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
import { Loader2 } from "lucide-react"
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

const signupFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    try {
      await handleSignUp(data.email, data.password);
      toast({
        title: "Account Created",
        description: "You have successfully signed up!",
      });
      router.push('/my-bookings');
    } catch (error: any) {
      console.error(error);
      let description = "An unexpected error occurred. Please try again.";
      if (error && error.code) {
        if (error.code === 'auth/email-already-in-use') {
          description = "This email is already registered. Please try logging in.";
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

  return (
    <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center bg-secondary p-4">
            <Card className="mx-auto w-full max-w-sm">
                <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">Create an Account</CardTitle>
                <CardDescription>
                    Enter your email and password to get started.
                </CardDescription>
                </CardHeader>
                <CardContent>
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
                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </Button>
                    </form>
                </Form>
                 <p className="mt-4 text-center text-sm text-muted-foreground">
                    Already have an account? <Link href="/login" className="underline hover:text-primary">Log in</Link>.
                </p>
                </CardContent>
            </Card>
        </main>
      <PublicFooter />
    </div>
  )
}
