'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, ShieldCheck, Database, Zap, LayoutGrid, Globe, Lock, Shield, Ghost, Trash2, Users } from 'lucide-react';
import { APP_VERSION } from '@/lib/data';

export default function SystemFeaturesPage() {
  const features = [
    {
      title: "Atomic Reservation Engine",
      icon: <Lock className="h-5 w-5 text-orange-500" />,
      description: "Uses distributed locking and transactions to ensure seat availability is never compromised, even during concurrent booking attempts.",
      tech: ["Firestore Transactions", "Atomic Counters", "FCFS Waitlist"]
    },
    {
      title: "Ghost Protection System",
      icon: <Ghost className="h-5 w-5 text-purple-500" />,
      description: "Automatically detects and purges unpaid reservations 1 hour before departure, releasing capacity back to the fleet.",
      tech: ["Temporal Logic", "Batch Deletion", "Capacity Recovery"]
    },
    {
      title: "Port-Based Multi-Tenancy",
      icon: <Globe className="h-5 w-5 text-blue-500" />,
      description: "Contextual isolation allowing Station Managers and Desk Agents to only access data and manifests for their assigned port terminals.",
      tech: ["Role-Based Filters", "Security Rules", "Context API"]
    },
    {
      title: "Real-Time Sync Engine",
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      description: "Ubiquitous use of reactive listeners ensuring manifests and statuses update across all terminals instantly without page refreshes.",
      tech: ["Firestore onSnapshot", "Digital Manifests"]
    },
    {
      title: "Compliance & Data Purge",
      icon: <Trash2 className="h-5 w-5 text-red-500" />,
      description: "Automated 90-day PII scrubbing tool to ensure global privacy compliance while maintaining essential financial records.",
      tech: ["Data Retention Policy", "Bulk Purge Engine"]
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
          <h1 className="text-2xl font-bold tracking-tight">Software Architecture & Features</h1>
          <p className="text-muted-foreground">Internal technical specifications for Isla Konek {APP_VERSION}.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1 text-sm font-mono">
          STABLE BUILD
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="flex flex-col border-none shadow-md ring-1 ring-border">
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

      <Card className="bg-primary/5 border-primary/20 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Infrastructure Stack
          </CardTitle>
          <CardDescription>The modern technology powering the command center.</CardDescription>
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
              <p className="text-xs text-muted-foreground">ShadCN UI (Radix)</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Database</p>
              <p className="text-sm font-medium">Firebase Firestore</p>
              <p className="text-xs text-muted-foreground">Real-time NoSQL</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Identity</p>
              <p className="text-sm font-medium">Firebase Auth</p>
              <p className="text-xs text-muted-foreground">JWT Security Tokens</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
