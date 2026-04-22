
import { LineChart, Route as RouteIcon, Anchor, BarChart, Warehouse, Ticket, BookCopy, Receipt, Megaphone, FileText, CalendarClock, Laptop, DatabaseZap, Palette, Users } from 'lucide-react';

export const APP_VERSION = 'v1.3.0-CORE';

export const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/dashboard/bookings', label: 'Bookings', icon: BookCopy, roles: ['Super Admin', 'Operations Manager', 'Station Manager', 'Desk Booking Agent', 'Finance/Accounting'] },
  { href: '/dashboard/desk-booking', label: 'Desk Booking', icon: Laptop, roles: ['Super Admin', 'Station Manager', 'Desk Booking Agent'] },
  { href: '/dashboard/boarding', label: 'Trip Management', icon: CalendarClock, roles: ['Super Admin', 'Operations Manager', 'Station Manager', 'Crew'] },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor, roles: ['Super Admin', 'Operations Manager'] },
  { href: '/dashboard/announcements', label: 'Advisories', icon: Megaphone, roles: ['Super Admin', 'Operations Manager', 'Station Manager'] },
  { href: '/dashboard/ports', label: 'Ports', icon: Warehouse, roles: ['Super Admin', 'Operations Manager'] },
  { href: '/dashboard/routes', label: 'Routes', icon: RouteIcon, roles: ['Super Admin', 'Operations Manager'] },
  { href: '/dashboard/fares', label: 'Fares', icon: Ticket, roles: ['Super Admin', 'Operations Manager', 'Finance/Accounting'] },
  { href: '/dashboard/rebooking', label: 'Refunds & Rebooking', icon: Receipt, roles: ['Super Admin', 'Operations Manager', 'Station Manager', 'Finance/Accounting'] },
  { href: '/dashboard/users', label: 'Staff Management', icon: Users, roles: ['Super Admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Palette, roles: ['Super Admin'] },
  { href: '/dashboard/protocols', label: 'SOPs', icon: FileText },
  { href: '/dashboard/reports', label: 'Reporting', icon: BarChart, roles: ['Super Admin', 'Operations Manager', 'Finance/Accounting'] },
  { href: '/dashboard/data-retention', label: 'Data Mgmt', icon: DatabaseZap, roles: ['Super Admin'] },
];
