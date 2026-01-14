
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
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword, User } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/logo";
import Link from "next/link";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

const isAdminUser = async (user: User): Promise<boolean> => {
  if (user.email === 'rielmagpantay@gmail.com') {
    return true;
  }
  try {
    const idTokenResult = await user.getIdTokenResult(true); // Force refresh
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error getting user token for admin check:', error);
    return false;
  }
};


export default function AdminLoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      const isAdmin = await isAdminUser(userCredential.user);

      if (isAdmin) {
        toast({
          title: "Login Successful",
          description: "Redirecting you to the dashboard...",
        });
        router.push('/dashboard');
      } else {
        await auth.signOut();
        throw new Error("You are not authorized to access this page.");
      }
    } catch (error: any) {
      console.error(error);
      let description = "An unexpected error occurred. Please try again.";
      if (error && (error.code || error.message)) { 
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message === "You are not authorized to access this page.") {
            description = error.message;
        } else {
          description = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: description,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
       <div className="absolute top-6 left-6">
          <Logo />
        </div>
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard.
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
                      <Input placeholder="admin@example.com" {...field} />
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
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Go back to the <Link href="/welcome" className="underline hover:text-primary">public homepage</Link>.
      </p>
    </div>
  )
}
