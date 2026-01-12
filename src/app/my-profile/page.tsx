
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/firebase/provider";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { doc } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { nanoid } from 'nanoid';


const familyMemberSchema = z.object({
    id: z.string(),
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    birthDate: z.string().optional(),
});

const profileFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  birthDate: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  familyMembers: z.array(familyMemberSchema).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function MyProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const passengerDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "passengers", user.uid);
  }, [firestore, user]);

  const { data: passengerData, isLoading: isLoadingPassenger } = useDoc(passengerDocRef);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      email: "",
      phone: "",
      familyMembers: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "familyMembers",
  });

  useEffect(() => {
    if (passengerData) {
      form.reset({
        ...passengerData,
        birthDate: passengerData.birthDate || "",
        familyMembers: passengerData.familyMembers ? passengerData.familyMembers.map((fm: any) => ({...fm, birthDate: fm.birthDate || ''})) : []
      });
    } else if (user) {
        form.reset({
            firstName: '',
            lastName: '',
            birthDate: '',
            email: user.email || '',
            phone: '',
            familyMembers: []
        });
    }
  }, [passengerData, user, form]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  async function onSubmit(data: ProfileFormData) {
    if (!firestore || !user) return;

    setIsSaving(true);
    
    const passengerRef = doc(firestore, 'passengers', user.uid);
    const profileData = {
      id: user.uid,
      ...data,
      birthDate: data.birthDate || null,
      familyMembers: data.familyMembers ? data.familyMembers.map(fm => ({...fm, birthDate: fm.birthDate || null})) : [],
    };
    
    setDocumentNonBlocking(passengerRef, profileData, { merge: true });
    
    toast({
      title: "Profile Updated",
      description: "Your information has been successfully saved.",
    });

    setIsSaving(false);
  }
  
  const isLoading = isLoadingPassenger || isUserLoading;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-secondary py-24 md:py-32">
        <div className="container mx-auto max-w-2xl px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">My Profile</CardTitle>
              <CardDescription>
                View and update your personal information and family members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                 <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2">Loading your profile...</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Birth Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 09171234567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Family Members</h3>
                       {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded-lg relative">
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.fullName`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-7">
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jane Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.birthDate`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-4">
                                <FormLabel>Birth Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="sm:col-span-1">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => remove(index)}
                                className="w-full"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ id: nanoid(), fullName: "", birthDate: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Family Member
                      </Button>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSaving || !form.formState.isDirty}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

    
