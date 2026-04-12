import { LineChart, Route as RouteIcon, Anchor, BarChart, Warehouse, Ticket, BookCopy, Receipt, Megaphone, FileText, CalendarClock, Laptop, DatabaseZap, Palette } from 'lucide-react';

export const APP_VERSION = 'v1.3.0-CORE';

export const navLinks = [
  { href: '/dashboard', label: 'Overview', icon: LineChart },
  { href: '/dashboard/bookings', label: 'Bookings', icon: BookCopy },
  { href: '/dashboard/desk-booking', label: 'Desk Booking', icon: Laptop },
  { href: '/dashboard/boarding', label: 'Trip Management', icon: CalendarClock },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor },
  { href: '/dashboard/announcements', label: 'Advisories', icon: Megaphone },
  { href: '/dashboard/ports', label: 'Ports', icon: Warehouse },
  { href: '/dashboard/routes', label: 'Routes', icon: RouteIcon },
  { href: '/dashboard/fares', label: 'Fares', icon: Ticket },
  { href: '/dashboard/rebooking', label: 'Refunds & Rebooking', icon: Receipt },
  { href: '/dashboard/settings', label: 'Settings', icon: Palette, roles: ['Super Admin'] },
  { href: '/dashboard/protocols', label: 'SOPs', icon: FileText },
  { href: '/dashboard/reports', label: 'Reporting', icon: BarChart, roles: ['Super Admin', 'Finance/Accounting'] },
  { href: '/dashboard/data-retention', label: 'Data Mgmt', icon: DatabaseZap, roles: ['Super Admin'] },
];