
'use client';

import React, { forwardRef } from 'react';
import { Logo } from '@/components/logo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInYears } from 'date-fns';
import { Separator } from './ui/separator';

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
      <div ref={ref} className="bg-white text-black p-8 printable-area">
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
            }
            .no-print {
              display: none;
            }
          }
        `}</style>
        <div className="flex justify-between items-start mb-6">
          <Logo />
          <div className="text-right">
            <h2 className="text-2xl font-bold">Passenger Manifest</h2>
            <p className="text-muted-foreground">Generated on: {format(new Date(), 'PPP p')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
                <p className="font-bold">Route:</p>
                <p>{route?.name || 'N/A'}</p>
            </div>
             <div>
                <p className="font-bold">Date & Time:</p>
                <p>{format(new Date(schedule?.date || Date.now()), 'PPP')} @ {schedule?.departureTime}</p>
            </div>
             <div>
                <p className="font-bold">Ship:</p>
                <p>{ship?.name || schedule?.shipName || 'N/A'}</p>
            </div>
        </div>
        
        <Separator className="my-6" />

        <h3 className="text-lg font-semibold mb-4">Boarded Passengers ({passengers.length} Total)</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Passenger Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Booking Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passengers.length > 0 ? passengers.map((p, index) => (
              <TableRow key={p.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{p.fullName}</TableCell>
                <TableCell>{calculateAge(p.birthDate)}</TableCell>
                <TableCell className="font-mono">{p.bookingId}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">No passengers have boarded.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-16 text-xs text-center text-gray-500">
            <p>This manifest is for internal and compliance use only.</p>
            <p>Isla Konek</p>
        </div>

        <div className="mt-8 text-center no-print">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-md">
                Print
            </button>
        </div>
      </div>
    );
  }
);

PrintableManifest.displayName = 'PrintableManifest';
