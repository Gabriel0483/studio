
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, initializeFirebase } from "@/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { Loader2, Ship, Building2 } from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { nanoid } from "nanoid"

const operatorSignupSchema = z.object({
  companyName: z.string().min(3, { message: "Company name must be at least 3 characters." }),
  adminName: z.string().min(2, { message: "Full name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type OperatorSignupData = z.infer<typeof operatorSignupSchema>;

export default function RegisterOperatorPage() {
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OperatorSignupData>({
    resolver: zodResolver(operatorSignupSchema),
    defaultValues: { companyName: "", adminName: "", email: "", password: "" },
  });

  async function onSubmit(data: OperatorSignupData) {
    setIsLoading(true);
    const { firestore } = initializeFirebase();
    
    try {
      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const uid = userCredential.user.uid;

      // 2. Create Tenant Document
      const tenantId = nanoid();
      const tenantRef = doc(firestore, 'tenants', tenantId);
      await setDoc(tenantRef, {
        id: tenantId,
        name: data.companyName,
        contactEmail: data.email,
        createdAt: new Date().toISOString(),
      });

      // 3. Create Staff Document (Initial Super Admin)
      const staffRef = doc(firestore, 'staff', uid);
      await setDoc(staffRef, {
        uid: uid,
        tenantId: tenantId,
        tenantName: data.companyName,
        email: data.email,
        name: data.adminName,
        roles: ['Super Admin'],
      });

      toast({
        title: "Registration Successful",
        description: "Your company has been registered. Welcome to Isla Konek!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center bg-secondary p-4 py-12">
        <Card className="mx-auto w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
              <Ship className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Partner with Isla Konek</CardTitle>
            <CardDescription>
              Start managing your fleet and bookings today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Blue Ocean Ferries" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Administrator Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Dela Cruz" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">This person will be the Super Admin for your company.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@company.com" {...field} />
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
                      <FormLabel>Account Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full font-bold" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join as Operator
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
