
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, ShieldCheck, Database, Zap, LayoutGrid, Globe, Lock, Share2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/data';

export default function SystemFeaturesPage() {
  const features = [
    {
      title: "Multi-Tenant Architecture",
      icon: <Globe className="h-5 w-5 text-blue-500" />,
      description: "Path-based routing and context-driven isolation allowing thousands of operators to share a single codebase while keeping data strictly siloed.",
      tech: ["Next.js Dynamic Routes", "React Context", "TenantProvider"]
    },
    {
      title: "Atomic Reservation System",
      icon: <Lock className="h-5 w-5 text-orange-500" />,
      description: "Uses distributed locking and transactions to ensure seat availability is never compromised, even during concurrent booking attempts.",
      tech: ["Firestore Transactions", "Atomic Counters"]
    },
    {
      title: "Real-Time Sync Engine",
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      description: "Ubiquitous use of reactive listeners ensuring manifests and statuses update across all terminals instantly without page refreshes.",
      tech: ["Firestore onSnapshot", "WebSockets"]
    },
    {
      title: "Granular RBAC",
      icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
      description: "Enterprise-grade Role-Based Access Control enforced at both the UI and database levels via server-side security rules.",
      tech: ["Custom Staff Roles", "Firestore Security Rules"]
    },
    {
      title: "Smart Scheduling Engine",
      icon: <LayoutGrid className="h-5 w-5 text-purple-500" />,
      description: "Automated generation of trip instances from recurring templates with support for 'Special' voyage overrides.",
      tech: ["Virtual Instance Logic", "Temporal Querying"]
    },
    {
      title: "Financial Reconciliation",
      icon: <Database className="h-5 w-5 text-pink-500" />,
      description: "Advanced reporting suite tracking gross, net, and earned revenue with integrated refund and rebooking fee management.",
      tech: ["Recharts", "CSV Stream Generation"]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Software Features & Architecture</h1>
          <p className="text-muted-foreground">Internal technical specifications for Isla Konek {APP_VERSION}.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1 text-sm font-mono">
          STABLE BUILD
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="p-2 bg-secondary rounded-lg">
                {feature.icon}
              </div>
              <div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                {feature.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {feature.tech.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] uppercase font-bold">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Infrastructure Overview
          </CardTitle>
          <CardDescription>The core stack powering the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Frontend</p>
              <p className="text-sm font-medium">Next.js 15 (App Router)</p>
              <p className="text-xs text-muted-foreground">React 19 + TypeScript</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Styling</p>
              <p className="text-sm font-medium">Tailwind CSS</p>
              <p className="text-xs text-muted-foreground">ShadCN UI Components</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Database</p>
              <p className="text-sm font-medium">Firebase Firestore</p>
              <p className="text-xs text-muted-foreground">Real-time NoSQL</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Auth</p>
              <p className="text-sm font-medium">Firebase Auth</p>
              <p className="text-xs text-muted-foreground">Identity Management</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
