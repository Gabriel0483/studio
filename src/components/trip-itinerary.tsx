"use client";

import React from 'react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { Printer, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConfirmedBooking = {
  id: string;
  travelDate: string;
  routeName: string;
  departurePortName: string;
  departureTime: string;
  arrivalTime: string;
  passengers: { fullName: string; fareType: string }[];
  totalPrice: number;
  status: 'Reserved' | 'Waitlisted' | 'Confirmed';
  bookingDate: Date;
  primaryEmail: string;
  primaryPhone: string;
};

interface TripItineraryProps {
  booking: ConfirmedBooking;
}

export const TripItinerary: React.FC<TripItineraryProps> = ({ booking }) => {

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Reserved':
      case 'Confirmed':
        return 'default';
      case 'Waitlisted':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="bg-white text-black p-6 sm:p-10 space-y-8 rounded-[1.5rem] shadow-sm relative overflow-hidden printable-area">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
        <Logo />
        <div className="text-left sm:text-right space-y-1">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-primary">Trip Itinerary</h2>
          <div className="inline-flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ref:</span>
            <span className="text-sm font-black font-mono">{booking.id}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Booking Status</p>
            <Badge variant={getStatusVariant(booking.status) as any} className="text-sm rounded-full px-4 py-1">
                {booking.status}
            </Badge>
        </div>
        <div className="text-left sm:text-right space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date Booked</p>
            <p className="text-sm font-bold">{format(booking.bookingDate, 'PPP p')}</p>
        </div>
      </div>
      
      {booking.status === 'Waitlisted' && (
        <div className="bg-orange-50 border-l-4 border-orange-400 text-orange-800 p-6 rounded-xl animate-pulse" role="alert">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5" />
            <p className="font-black text-sm uppercase tracking-tight">Waitlist Position Secured</p>
          </div>
          <p className="text-xs opacity-90 leading-relaxed font-medium">Your request is in our priority queue. Seats are released automatically if cancellations occur. No payment is required until your status changes to 'Reserved'.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Voyage Details
            </h3>
            <div className="grid gap-6 pl-6 border-l-2 border-muted/50">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Route</p>
                    <p className="font-bold text-lg leading-tight">{booking.routeName}</p>
                    <p className="text-xs text-muted-foreground">{booking.departurePortName} Terminal</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Travel Date</p>
                        <p className="font-bold text-sm flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(new Date(booking.travelDate), 'PPP')}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Departure</p>
                        <p className="font-black text-sm flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {booking.departureTime}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Passenger Manifest
            </h3>
            <div className="space-y-3 bg-muted/20 p-6 rounded-2xl border">
                {booking.passengers.map((passenger, index) => (
                    <div key={index} className="flex justify-between items-center text-sm border-b border-muted last:border-0 pb-2 last:pb-0">
                        <div>
                            <p className="font-bold">{passenger.fullName}</p>
                            <span className="text-[10px] uppercase text-muted-foreground font-bold">{passenger.fareType}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t-2 border-dashed">
        <div className="text-left space-y-1">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Fare</p>
             <p className="text-4xl font-black tracking-tighter text-primary">₱{booking.totalPrice.toFixed(2)}</p>
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-full font-bold border-2 hover:bg-primary hover:text-white transition-all no-print" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Itinerary
        </Button>
      </div>

      <div className="text-center text-[10px] text-muted-foreground pt-8 leading-relaxed max-w-lg mx-auto">
        <p className="font-bold uppercase mb-2">Important Instructions</p>
        <p>Please present this itinerary (digital or printed) at the terminal ticketing desk at least **120 minutes** prior to departure. Payment must be settled before boarding. Seats not claimed 45 minutes before departure are subject to release to the waitlist.</p>
        <p className="mt-4 font-black tracking-widest text-primary/40">ISLA KONEK • MARITIME COMMAND</p>
      </div>
    </div>
  );
};
