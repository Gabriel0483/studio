
# Isla Konek: Maritime Command & Booking SaaS

Isla Konek is a professional, multi-tenant Software-as-a-Service (SaaS) platform designed to digitalize shipping and ferry operations. It provides a comprehensive ecosystem for operators to manage their fleets and for passengers to book and track their sea journeys.

## Platform Features

### For Travelers
- **Secure Online Booking:** Reserve seats for individuals or entire families.
- **Personal Passenger Profiles:** Manage family members and viewing booking history.
- **Live Trip Status:** Real-time updates on departures, arrivals, and service advisories.
- **Digital Itineraries:** Instant access to trip details and boarding information.

### For Ferry Operators (Multi-Tenant)
- **Fleet Management:** Full tracking of vessels, capacities, and technical status.
- **Schedule Command:** Management of recurring daily trips and special "one-off" voyages.
- **Smart Manifests:** Real-time digital passenger manifests with boarding/deboarding workflows.
- **Desk Booking Agent Portal:** A specialized interface for port-side ticket sales.
- **Rebooking & Refunds:** Integrated tools for handling passenger changes and cancellations.
- **Sales & Accounting:** Deep reporting on revenue trends, route popularity, and earned revenue.
- **Brand Customization:** Personalize the public portal with custom logos and hero messaging.

### For Platform Administrators
- **Tenant Management:** Oversee all onboarded shipping companies.
- **Global Visibility:** Aggregated system-wide data for platform-level analysis.
- **Security & Isolation:** Enterprise-grade Firestore rules ensuring strict data siloing between tenants.

## Technical Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + ShadCN UI
- **Backend:** Firebase (Firestore, Authentication)
- **Architecture:** Path-based Multi-tenancy with Role-Based Access Control (RBAC)
