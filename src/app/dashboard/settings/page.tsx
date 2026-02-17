
'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Globe, Image as ImageIcon, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/components/dashboard/tenant-context';
import { Separator } from '@/components/ui/separator';

export default function CompanySettingsPage() {
  const firestore = useFirestore();
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    heroTitle: '',
    heroDescription: '',
    heroImageUrl: '',
    contactEmail: ''
  });

  const tenantRef = useMemoFirebase(() => (firestore && tenantId ? doc(firestore, 'tenants', tenantId) : null), [firestore, tenantId]);
  const { data: tenantData, isLoading: isLoadingTenant } = useDoc(tenantRef);

  useEffect(() => {
    if (tenantData) {
      setFormData({
        name: tenantData.name || '',
        logoUrl: tenantData.logoUrl || '',
        heroTitle: tenantData.heroTitle || '',
        heroDescription: tenantData.heroDescription || '',
        heroImageUrl: tenantData.heroImageUrl || '',
        contactEmail: tenantData.contactEmail || ''
      });
    }
  }, [tenantData]);

  const handleSave = () => {
    if (!firestore || !tenantId) return;
    setIsLoading(true);

    const tenantDocRef = doc(firestore, 'tenants', tenantId);
    updateDocumentNonBlocking(tenantDocRef, formData);

    toast({
      title: 'Settings Saved',
      description: 'Your portal customization has been updated successfully.'
    });
    setIsLoading(false);
  };

  if (isLoadingTenant) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal Customization</h1>
        <p className="text-muted-foreground">Tailor your public portal to reflect your brand identity.</p>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Brand Identity
            </CardTitle>
            <CardDescription>Basic company details and logo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.contactEmail} 
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input 
                id="logoUrl" 
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl} 
                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} 
              />
              <p className="text-[10px] text-muted-foreground italic">Provide a link to your hosted logo image (PNG/SVG preferred).</p>
            </div>
          </CardContent>
        </Card>

        {/* Hero Section Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Portal Homepage Hero
            </CardTitle>
            <CardDescription>Customize the main banner of your public homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Hero Headline</Label>
              <Input 
                id="heroTitle" 
                placeholder="e.g., Smooth Sailing with Blue Ocean"
                value={formData.heroTitle} 
                onChange={(e) => setFormData({...formData, heroTitle: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroDescription">Hero Sub-headline</Label>
              <Textarea 
                id="heroDescription" 
                placeholder="Briefly describe your service or special offers."
                value={formData.heroDescription} 
                onChange={(e) => setFormData({...formData, heroDescription: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImageUrl">Hero Background Image URL</Label>
              <Input 
                id="heroImageUrl" 
                placeholder="https://images.unsplash.com/..."
                value={formData.heroImageUrl} 
                onChange={(e) => setFormData({...formData, heroImageUrl: e.target.value})} 
              />
              <p className="text-[10px] text-muted-foreground italic">Use a high-quality landscape image (approx. 1920x1080).</p>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              Changes will be visible at your public URL immediately.
            </div>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Portal Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
