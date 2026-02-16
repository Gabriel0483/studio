
'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ 
  children, 
  tenantId, 
  tenantName 
}: { 
  children: ReactNode; 
  tenantId: string | null;
  tenantName: string | null;
}) {
  return (
    <TenantContext.Provider value={{ tenantId, tenantName }}>
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
