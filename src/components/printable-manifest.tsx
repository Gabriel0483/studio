'use client';

import React, { forwardRef } from 'react';
import { Logo } from '@/components/logo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInYears } from 'date-fns';
import { Separator } from './ui/separator';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface Passenger {
  id: string;
  fullName: string;
  birthDate?: string;
  bookingId: string;
}

interface PrintableManifestProps {
  passengers: Passenger[];
  route: any;
  schedule: any;
  ship: any;
}

export const PrintableManifest = forwardRef<HTMLDivElement, PrintableManifestProps>(
  ({ passengers, route, schedule, ship }, ref) => {
    
    const calculateAge = (birthDate?: string) => {
      if (!birthDate) return 'N/A';
      try {
        return differenceInYears(new Date(), new Date(birthDate)).toString();
      } catch {
        return 'N/A';
      }
    };
    
    const handlePrint = () => {
      window.print();
    };

    return (
      <div ref={ref} className="bg-white text-black p-4 sm:p-8 printable-area w-full max-w-full overflow-hidden">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <Logo />
          <div className="text-left sm:text-right">
            <h2 className="text-xl sm:text-2xl font-bold">Passenger Manifest</h2>
            <p className="text-xs text-muted-foreground">Generated: {format(new Date(), 'PPP p')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs sm:text-sm">
            <div className="border-l-2 border-primary pl-2">
                <p className="font-bold text-muted-foreground uppercase text-[10px]">Route</p>
                <p className="font-semibold">{route?.name || 'N/A'}</p>
            </div>
             <div className="border-l-2 border-primary pl-2">
                <p className="font-bold text-muted-foreground uppercase text-[10px]">Date & Time</p>
                <p className="font-semibold">{format(new Date(schedule?.date || Date.now()), 'PPP')} @ {schedule?.departureTime}</p>
            </div>
             <div className="border-l-2 border-primary pl-2">
                <p className="font-bold text-muted-foreground uppercase text-[10px]">Ship</p>
                <p className="font-semibold">{ship?.name || schedule?.shipName || 'N/A'}</p>
            </div>
        </div>
        
        <Separator className="my-6" />

        <h3 className="text-md sm:text-lg font-semibold mb-4">Boarded Passengers ({passengers.length} Total)</h3>
        <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
            <TableHeader>
                <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Passenger Name</TableHead>
                <TableHead className="hidden sm:table-cell">Age</TableHead>
                <TableHead>Ref</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {passengers.length > 0 ? passengers.map((p, index) => (
                <TableRow key={p.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{calculateAge(p.birthDate)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{p.bookingId}</TableCell>
                </TableRow>
                )) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No passengers have boarded.</TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>

        <div className="mt-12 text-[10px] text-center text-gray-400">
            <p>This manifest is for internal and compliance use only.</p>
            <p className="font-bold uppercase tracking-widest mt-1">Isla Konek Maritime Command</p>
        </div>

        <div className="mt-8 flex justify-center no-print">
            <Button onClick={handlePrint} className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" /> Print Document
            </Button>
        </div>
      </div>
    );
  }
);

PrintableManifest.displayName = 'PrintableManifest';