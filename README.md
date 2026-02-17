
# Isla Konek: Maritime Command & Booking SaaS

Isla Konek is a professional, multi-tenant Software-as-a-Service (SaaS) platform designed to digitalize shipping and ferry operations. It provides a comprehensive ecosystem for operators to manage their fleets and for passengers to book and track their sea journeys.

## Detailed Product Feature Outline

### 1. Traveler Experience (Public Portal)
Isla Konek provides a seamless, mobile-first interface for passengers to manage their maritime travel.
- **Secure Online Booking**: Self-service seat reservation with real-time availability checks.
- **Flexible Passenger Entry**: Users can book for themselves, their saved family members, or manual guests in a single transaction.
- **Personal Travel Profiles**: Manage personal details and maintain a list of frequent travelers (family members) for rapid booking.
- **Live Trip Status**: A public dashboard showing today's departures, arrivals, and estimated arrival times (ETAs) directly from port dispatchers.
- **Digital Itineraries**: Instant access to booking references and trip details via the "My Bookings" portal.
- **Public Advisories**: Real-time service announcements (weather updates, route changes, disruptions) categorized by urgency.

### 2. Ferry Operator (Tenant) Command Center
A siloed, enterprise-grade dashboard for shipping companies to run their daily operations.
- **Fleet Management**: Complete tracking of vessels, including passenger capacity, vessel types, and maintenance status.
- **Transit Network Control**: Manage a private network of Ports and Routes with distance tracking and port-to-port definitions.
- **Smart Scheduling Engine**:
    - **Daily Templates**: Define recurring daily trips that auto-generate instances.
    - **Special Voyages**: Create one-off trips for holidays or peak seasons.
    - **Ship Assignment**: Dynamically assign or swap ships for specific trip instances.
- **Dynamic Fare Management**: Set route-specific pricing for different passenger demographics (Adult, Child, Senior, Student, etc.).
- **Real-time Manifest & Boarding**:
    - **Digital Check-in**: High-speed boarding workflow for ground staff.
    - **Status Tracking**: Mark passengers as "Boarded" or "No-show" in real-time.
    - **Printable Manifests**: Compliant, formatted PDF/Print-ready manifests for coast guard and port authority requirements.
- **Desk Booking Agent Portal**: A streamlined interface designed for high-volume, port-side ticket sales with integrated passenger search.
- **Rebooking & Refunds**: Integrated workflow for handling passenger changes, applying rebooking fees, and processing partial or full refunds.
- **Portal Customization**: Self-service branding tools to set company logos, custom hero headlines, and background imagery for the public portal.
- **Sales & Accounting Reports**: 
    - **Revenue Breakdown**: Gross vs. Net vs. Earned revenue analysis.
    - **Analytics**: Visualization of route popularity and revenue trends over time.
    - **Data Export**: CSV exports for internal accounting reconciliation.

### 3. Platform Administration (SaaS Level)
Centralized tools for the platform owner to manage the ecosystem.
- **Tenant Onboarding**: Self-service and manual onboarding of new shipping companies.
- **Global Visibility**: A "Global View" toggle for the Platform Admin to see aggregated data across all active operators.
- **Secure Data Isolation**: Strict path-based multi-tenancy and Firestore security rules ensuring no cross-tenant data leakage.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for various staff roles:
    - **Super Admin**: Full control over company settings and users.
    - **Operations Manager**: Manage fleet, routes, and schedules.
    - **Desk Booking Agent**: Restricted to booking and passenger search.
    - **Crew**: Access to manifests and boarding workflows.
- **Data Retention Tools**: Automated tools to purge old records for data privacy and storage optimization.

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **Database**: Firebase Firestore (Real-time NoSQL)
- **Auth**: Firebase Authentication
- **Multi-tenancy**: Path-based routing with Tenant Context Providers
