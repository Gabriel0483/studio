import { Ship, Users, Wrench, Calendar, LineChart, Route as RouteIcon, DollarSign, Anchor } from 'lucide-react';

export const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LineChart },
  { href: '/dashboard/scheduling', label: 'Scheduling', icon: RouteIcon },
  { href: '/dashboard/passengers', label: 'Passengers', icon: Users },
  { href: '/dashboard/operations', label: 'Operations', icon: Anchor },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart },
];

export const overviewCards = [
    { title: "Total Revenue", value: "$45,231.89", change: "+20.1% from last month", icon: DollarSign },
    { title: "Bookings Today", value: "215", change: "+12.5% from yesterday", icon: Users },
    { title: "Active Ships", value: "8 / 12", change: "4 in maintenance", icon: Ship },
    { title: "New Passengers", value: "+573", change: "this month", icon: Users },
];

export const revenueData = [
  { name: 'Jan', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Feb', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Mar', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Apr', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'May', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jun', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jul', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Aug', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Sep', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Oct', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Nov', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Dec', total: Math.floor(Math.random() * 5000) + 1000 },
];

export const bookingsData = [
    { name: 'Mainland to Island', value: 450, fill: 'hsl(var(--chart-1))' },
    { name: 'Island to Port', value: 320, fill: 'hsl(var(--chart-2))' },
    { name: 'Scenic Coastal Tour', value: 280, fill: 'hsl(var(--chart-3))' },
    { name: 'Inter-Island Ferry', value: 189, fill: 'hsl(var(--chart-4))' },
]

export const passengers = [
  { id: 'PSN001', name: 'Liam Johnson', email: 'liam@example.com', route: 'Mainland to Island', date: '2023-10-28', status: 'Confirmed' },
  { id: 'PSN002', name: 'Olivia Smith', email: 'olivia@example.com', route: 'Island to Port', date: '2023-10-29', status: 'Confirmed' },
  { id: 'PSN003', name: 'Noah Williams', email: 'noah@example.com', route: 'Scenic Coastal Tour', date: '2023-10-30', status: 'Pending' },
  { id: 'PSN004', name: 'Emma Brown', email: 'emma@example.com', route: 'Mainland to Island', date: '2023-10-28', status: 'Cancelled' },
  { id: 'PSN005', name: 'Ava Jones', email: 'ava@example.com', route: 'Island to Port', date: '2023-11-01', status: 'Confirmed' },
  { id: 'PSN006', name: 'James Garcia', email: 'james@example.com', route: 'Mainland to Island', date: '2023-11-02', status: 'Confirmed' },
  { id: 'PSN007', name: 'Sophia Miller', email: 'sophia@example.com', route: 'Scenic Coastal Tour', date: '2023-11-05', status: 'Confirmed' },
];

export const ships = [
  { id: 'SHP01', name: 'Ocean Voyager', status: 'In Service', capacity: 250, nextMaintenance: '2024-01-15' },
  { id: 'SHP02', name: 'Sea Serpent', status: 'In Service', capacity: 300, nextMaintenance: '2023-12-20' },
  { id: 'SHP03', name: 'Neptune\'s Pride', status: 'Maintenance', capacity: 200, nextMaintenance: '2023-11-10' },
  { id: 'SHP04', name: 'The Kraken', status: 'In Service', capacity: 450, nextMaintenance: '2024-02-01' },
  { id: 'SHP05', name: 'Coastal Cruiser', status: 'Dry Dock', capacity: 150, nextMaintenance: '2023-11-30' },
  { id: 'SHP06', name: 'Island Hopper', status: 'In Service', capacity: 180, nextMaintenance: '2024-01-22' },
];

export const staff = [
  { id: 'STF101', name: 'Capt. Ahab', role: 'Captain', assignment: 'Ocean Voyager' },
  { id: 'STF102', name: 'William Riker', role: 'First Mate', assignment: 'Sea Serpent' },
  { id: 'STF103', name: 'Geordi La Forge', role: 'Chief Engineer', assignment: 'Neptune\'s Pride' },
  { id: 'STF104', name: 'Beverly Crusher', role: 'Medical Officer', assignment: 'The Kraken' },
  { id: 'STF105', name: 'Deanna Troi', role: 'Passenger Services', assignment: 'Coastal Cruiser' },
  { id: 'STF106', name: 'Data Soong', role: 'Operations Officer', assignment: 'Island Hopper' },
  { id: 'STF107', name: 'Jean-Luc Picard', role: 'Captain', assignment: 'The Kraken' },
];
