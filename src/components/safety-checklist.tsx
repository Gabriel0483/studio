
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  label: string;
}

interface SafetyChecklistProps {
  scheduleId: string;
  type: 'Pre-Boarding' | 'Pre-Departure' | 'Post-Arrival';
  items: ChecklistItem[];
  onComplete: () => void;
}

export function SafetyChecklist({ scheduleId, type, items, onComplete }: SafetyChecklistProps) {
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const allChecked = items.every(item => responses[item.id]);

  const toggleItem = (id: string) => {
    setResponses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !allChecked) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'safetyChecks'), {
        scheduleId,
        type,
        completedBy: user.uid,
        completedByName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        responses
      });

      toast({ title: 'Checklist Completed', description: `${type} safety requirements have been verified.` });
      onComplete();
    } catch (error) {
      console.error("Safety check failed:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save safety record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/[0.01]">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
          <ShieldCheck className="h-5 w-5" />
          <CardTitle className="text-lg">{type} Compliance</CardTitle>
        </div>
        <CardDescription>All items must be verified before proceeding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:border-primary/40 transition-all">
            <Checkbox 
              id={item.id} 
              checked={responses[item.id] || false} 
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-1"
            />
            <Label htmlFor={item.id} className="text-sm font-medium leading-tight cursor-pointer">
              {item.label}
            </Label>
          </div>
        ))}
      </CardContent>
      <CardFooter className="bg-muted/30 pt-4 flex flex-col items-start gap-4">
        {!allChecked && (
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded w-full border border-orange-200">
            <AlertCircle className="h-4 w-4" />
            Vessel is NOT cleared for the next stage.
          </div>
        )}
        <Button 
          className="w-full font-bold shadow-lg" 
          disabled={!allChecked || isSubmitting} 
          onClick={handleSubmit}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Submit & Sign Compliance
        </Button>
      </CardFooter>
    </Card>
  );
}
