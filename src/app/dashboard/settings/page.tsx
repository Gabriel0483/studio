'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const CONDITIONS_DOC_ID = 'booking-conditions';

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const conditionsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'siteContent', CONDITIONS_DOC_ID);
  }, [firestore]);

  const { data: conditionsData, isLoading } = useDoc(conditionsDocRef);

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (conditionsData?.content) {
      setContent(conditionsData.content);
    }
  }, [conditionsData]);

  const handleSave = () => {
    if (!conditionsDocRef) return;
    setIsSaving(true);
    
    const dataToSave = {
        content,
        lastUpdatedAt: serverTimestamp(),
    };

    updateDocumentNonBlocking(conditionsDocRef, dataToSave, { merge: true });

    // Give a small delay for the non-blocking update to feel like it's processing
    setTimeout(() => {
        toast({
            title: 'Settings Saved',
            description: 'The booking conditions have been updated successfully.',
        });
        setIsSaving(false);
    }, 500);
  };
  
  if (isLoading) {
      return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading settings...</span>
        </div>
      )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-muted-foreground">Manage general site content and policies.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Conditions</CardTitle>
          <CardDescription>
            Edit the terms and conditions that appear on the public 'Booking Conditions' page.
            This content supports basic HTML for formatting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="conditions-content">Conditions Content</Label>
            <Textarea
              id="conditions-content"
              placeholder="Enter your booking terms and conditions here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px]"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
