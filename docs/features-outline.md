# Isla Konek: Feature Specifications

## 🚢 Public Passenger Portal
Designed for a seamless traveler experience from planning to boarding.

### 1. Smart Booking Engine
*   **Dynamic Restricted Window**: Online bookings are strictly enforced to a 7-day window before departure to ensure operational accuracy.
*   **Real-Time Availability**: Live seat counters show exactly how many spots remain. Automatically switches to "Waitlist" when full.
*   **Multi-Passenger Support**: Add multiple travelers in a single transaction with individual fare type selection (Adult, Senior, Student, etc.).
*   **Profile Integration**: Logged-in users can instantly add themselves or saved family members to a booking.

### 2. Live Trip Monitoring
*   **Status Dashboard**: Real-time departure/arrival updates for all voyages today.
*   **Public Advisories**: Instant access to weather updates, route changes, or service disruptions posted by staff.
*   **Digital Itinerary**: A secure, printable summary of travel details with a unique 6-character booking reference.

### 3. Self-Service Suite
*   **My Bookings**: History of all past and upcoming trips with current payment and reservation status.
*   **Profile Management**: Manage personal PII and a directory of family members for faster future bookings.

---

## 🏗️ Administrative Command Center (RBAC)
Granular control for Super Admins, Operations Managers, and Station Agents.

### 1. Operational Dashboard
*   **Fleet Readiness**: Visual monitor of "In Service" vs "Under Maintenance" vessels.
*   **Boarding Efficiency**: Progress bars tracking the ratio of boarded vs. paid passengers for the day.
*   **Financial Momentum**: Real-time revenue charts (Monthly Trends & Route Volume).

### 2. Booking & Revenue Management
*   **Ghost Reservation Purge**: Administrative tool to delete unpaid "Ghost" reservations 1 hour before departure to release capacity.
*   **Atomic Waitlist Promotion**: Automated First-Come, First-Served engine that promotes waitlisted passengers when seats open.
*   **Correction Suite**: Ability to "Undo Payment" for accidental entries, reverting status from Confirmed back to Reserved.
*   **Desk Booking**: Fast-entry interface for terminal walk-ins with integrated search for existing passenger profiles.

### 3. Fleet & Trip Management
*   **Digital Manifests**: Real-time "Board" and "Deboard" actions for crew members.
*   **Schedule Templates**: Manage recurring daily trip patterns that automatically generate voyage instances.
*   **Waitlist Overrides**: Adjust maximum waitlist limits per specific trip to handle peak demand.
*   **Vessel Maintenance**: Schedule dry-dock or repairs which automatically updates ship availability across the system.

### 4. Reporting & Compliance
*   **Financial Reconciliation**: Detailed breakdown of Gross, Net, and Earned revenue.
*   **Fee Tracking**: Monitoring of rebooking fees, no-show penalties, and cancellation fees.
*   **CSV Exports**: One-click data generation for accounting and regulatory compliance.
*   **Data Retention**: Automated 90-day PII purge tool to ensure privacy compliance.

### 5. Staff Management
*   **Role-Based Access**: Specialized views for Desk Agents (restricted to their port) vs Super Admins (fleet-wide access).
*   **Service Protocols**: Integrated Standard Operating Procedures (SOPs) for emergency response.
