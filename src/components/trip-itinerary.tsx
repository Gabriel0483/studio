"use client";

import React from 'react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';

type ConfirmedBooking = {
  id: string;
  travelDate: string;
  routeName: string;
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
  
  return (
    <div className="bg-white text-black p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <Logo />
        <div className="text-left sm:text-right">
          <h2 className="text-xl sm:text-2xl font-bold">Trip Itinerary</h2>
          <p className="text-xs sm:text-sm text-gray-500">Booking Ref: {booking.id}</p>
        </div>
      </div>
      
      <Separator />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <p className="font-bold text-lg">Booking Status</p>
            <Badge variant={getStatusVariant(booking.status) as any} className="text-base mt-1">
                {booking.status}
            </Badge>
        </div>
        <div className="text-left sm:text-right">
            <p className="font-semibold">Date Booked</p>
            <p className="text-gray-600">{format(booking.bookingDate, 'PPP p')}</p>
        </div>
      </div>
      
      {booking.status === 'Waitlisted' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p className="font-bold">You are on the waitlist.</p>
          <p>Seats are not guaranteed. You will be notified if a spot becomes available. No payment is required at this time.</p>
        </div>
      )}

      <div>
        <h3 className="font-bold text-xl mb-4 border-b pb-2">Trip Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Route</p>
            <p className="text-gray-600">{booking.routeName}</p>
          </div>
          <div>
            <p className="font-semibold">Date of Travel</p>
            <p className="text-gray-600">{format(new Date(booking.travelDate), 'PPP')}</p>
          </div>
          <div>
            <p className="font-semibold">Departure Time</p>
            <p className="text-gray-600">{booking.departureTime}</p>
          </div>
          <div>
            <p className="font-semibold">Est. Arrival Time</p>
            <p className="text-gray-600">{booking.arrivalTime}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-semibold">Contact Email</p>
            <p className="text-gray-600 break-all">{booking.primaryEmail}</p>
          </div>
           <div className="sm:col-span-2">
            <p className="font-semibold">Contact Phone</p>
            <p className="text-gray-600">{booking.primaryPhone}</p>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="font-bold text-xl mb-4 border-b pb-2">Passenger & Fare Breakdown</h3>
        <div className="space-y-2">
          {booking.passengers.map((passenger, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{passenger.fullName}</p>
                <p className="text-sm text-gray-500">{passenger.fareType}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Separator />

      <div className="text-right">
        <p className="text-sm">Total Price</p>
        <p className="text-3xl font-bold">₱{booking.totalPrice.toFixed(2)}</p>
      </div>

       <Separator />

      <div className="text-center text-xs text-gray-500 pt-4">
        <p>Thank you for choosing Isla Konek. Please arrive at the port at least 30 minutes before departure.</p>
        <p>This document serves as your official trip itinerary. Have a safe and pleasant journey!</p>
      </div>
    </div>
  );
};
