
'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  logoUrl?: string | null;
  heroTitle?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ 
  children, 
  tenantId, 
  tenantName,
  logoUrl,
  heroTitle,
  heroDescription,
  heroImageUrl
}: { 
  children: ReactNode; 
  tenantId: string | null;
  tenantName: string | null;
  logoUrl?: string | null;
  heroTitle?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
}) {
  return (
    <TenantContext.Provider value={{ 
      tenantId, 
      tenantName, 
      logoUrl, 
      heroTitle, 
      heroDescription, 
      heroImageUrl 
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
