
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ImageIcon, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SystemSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    logoUrl: '',
    heroTitle: '',
    heroDescription: '',
    heroImageUrl: '',
  });

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'settings') : null), [firestore]);
  const { data: configData, isLoading: isLoadingConfig } = useDoc(configRef);

  useEffect(() => {
    if (configData) {
      setFormData({
        companyName: configData.companyName || '',
        logoUrl: configData.logoUrl || '',
        heroTitle: configData.heroTitle || '',
        heroDescription: configData.heroDescription || '',
        heroImageUrl: configData.heroImageUrl || '',
      });
    }
  }, [configData]);

  const handleSave = () => {
    if (!firestore) return;
    setIsLoading(true);

    const configDocRef = doc(firestore, 'config', 'settings');
    // Using set with merge ensure document is created if it doesn't exist
    setDocumentNonBlocking(configDocRef, formData, { merge: true });

    toast({
      title: 'Settings Saved',
      description: 'System identity configuration updated successfully.'
    });
    setIsLoading(false);
  };

  if (isLoadingConfig) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal Identity Settings</h1>
        <p className="text-muted-foreground">Configure public portal branding and homepage content.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Organization Name</Label>
              <Input 
                id="companyName" 
                value={formData.companyName} 
                onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input 
                id="logoUrl" 
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl} 
                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Public Homepage Hero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Hero Headline</Label>
              <Input 
                id="heroTitle" 
                value={formData.heroTitle} 
                onChange={(e) => setFormData({...formData, heroTitle: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroDescription">Hero Sub-headline</Label>
              <Textarea 
                id="heroDescription" 
                value={formData.heroDescription} 
                onChange={(e) => setFormData({...formData, heroDescription: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImageUrl">Hero Background Image URL</Label>
              <Input 
                id="heroImageUrl" 
                value={formData.heroImageUrl} 
                onChange={(e) => setFormData({...formData, heroImageUrl: e.target.value})} 
              />
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
