
import { Ship, Users, LineChart, Route as RouteIcon, Anchor, BarChart, Warehouse, Ticket, BookCopy, Receipt, ClipboardCheck, Megaphone, FileText, CalendarClock, Laptop, DatabaseZap, Building2, Palette, Cpu } from 'lucide-react';

export const APP_VERSION = 'v1.2.5-PRO';

export const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Building2, platformAdminOnly: true },
  { href: '/dashboard/bookings', label: 'Bookings', icon: BookCopy },
  { href: '/dashboard/desk-booking', label: 'Desk Booking', icon: Laptop },
  { href: '/dashboard/boarding', label: 'Trip Management', icon: CalendarClock },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['Super Admin'] },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/ports', label: 'Ports', icon: Warehouse },
  { href: '/dashboard/routes', label: 'Routes', icon: RouteIcon },
  { href: '/dashboard/fares', label: 'Fares', icon: Ticket },
  { href: '/dashboard/rebooking', label: 'Rebooking & Refunds', icon: Receipt },
  { href: '/dashboard/settings', label: 'Customization', icon: Palette, roles: ['Super Admin', 'Operations Manager'] },
  { href: '/dashboard/protocols', label: 'Protocols', icon: FileText },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart, roles: ['Super Admin', 'Operations Manager', 'Finance/Accounting'] },
  { href: '/dashboard/data-retention', label: 'Data Retention', icon: DatabaseZap, roles: ['Super Admin', 'Operations Manager', 'Station Manager'] },
  { href: '/dashboard/features', label: 'System Features', icon: Cpu, platformAdminOnly: true },
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
