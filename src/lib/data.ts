import { Ship, Users, LineChart, Route as RouteIcon, Anchor, BarChart, Warehouse, Ticket, BookCopy, Receipt } from 'lucide-react';

export const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/dashboard/bookings', label: 'Bookings', icon: BookCopy },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor },
  { href: '/dashboard/ports', label: 'Ports', icon: Warehouse },
  { href: '/dashboard/routes', label: 'Routes', icon: RouteIcon },
  { href: '/dashboard/fares', label: 'Fares', icon: Ticket },
  { href: '/dashboard/rebooking', label: 'Rebooking & Refunds', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart },
];

export const overviewCards: { title: string; value: string; change: string; icon: React.ElementType }[] = [];

export const revenueData: { name: string; total: number }[] = [];

export const bookingsData: { name: string; value: number, fill: string }[] = [];

export const passengers: { id: string; name: string; email: string; route: string; date: string; status: string }[] = [];

export const ships: { id: string; name: string; status: string; capacity: number; nextMaintenance: string }[] = [];

export const staff: { id: string; name: string; role: string; assignment: string }[] = [];
