
import { Ship, Users, LineChart, Route as RouteIcon, Anchor, BarChart, Warehouse, Ticket, BookCopy, Receipt, ClipboardCheck, Megaphone, FileText, CalendarClock, Laptop, DatabaseZap } from 'lucide-react';

export const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/dashboard/bookings', label: 'Bookings', icon: BookCopy },
  { href: '/dashboard/desk-booking', label: 'Desk Booking', icon: Laptop },
  { href: '/dashboard/boarding', label: 'Trip Management', icon: CalendarClock },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/ports', label: 'Ports', icon: Warehouse },
  { href: '/dashboard/routes', label: 'Routes', icon: RouteIcon },
  { href: '/dashboard/fares', label: 'Fares', icon: Ticket },
  { href: '/dashboard/rebooking', label: 'Rebooking & Refunds', icon: Receipt },
  { href: '/dashboard/protocols', label: 'Protocols', icon: FileText },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart },
  { href: '/dashboard/data-retention', label: 'Data Retention', icon: DatabaseZap },
];

export const revenueData: { name: string; total: number }[] = [
  { name: 'Jan', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Feb', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Mar', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Apr', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'May', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Jun', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Jul', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Aug', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Sep', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Oct', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Nov', total: Math.floor(Math.random() * 50000) + 10000 },
  { name: 'Dec', total: Math.floor(Math.random() * 50000) + 10000 },
];

export const bookingsData: { name: string; value: number, fill: string }[] = [
    { name: "Route A", value: 400, fill: "hsl(var(--chart-1))" },
    { name: "Route B", value: 300, fill: "hsl(var(--chart-2))" },
    { name: "Route C", value: 200, fill: "hsl(var(--chart-3))" },
    { name: "Route D", value: 278, fill: "hsl(var(--chart-4))" },
    { name: "Route E", value: 189, fill: "hsl(var(--chart-5))" },
];

export const passengers: { id: string; name: string; email: string; route: string; date: string; status: string }[] = [];

export const ships: { id: string; name: string; status: string; capacity: number; nextMaintenance: string }[] = [];

export const staff: { id: string; name: string; role: string; assignment: string }[] = [];

    
