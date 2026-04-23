# Isla Konek: Granular Feature Specifications

## 🚢 Public Passenger Portal
Designed for a seamless traveler experience from planning to boarding.

### 1. Smart Booking Engine
*   **Dynamic Restricted Window**: Online bookings are strictly enforced to a 7-day window before departure to ensure operational accuracy.
*   **Real-Time Availability**: Live seat counters show exactly how many spots remain. Automatically switches to "Waitlist" when full.
*   **Multi-Passenger Support**: Add multiple travelers in a single transaction with individual fare type selection (Adult, Senior, Student, etc.).
*   **Profile Integration**: Logged-in users can instantly add themselves or saved family members to a booking via profile shortcuts.
*   **Progress Tracking**: A 3-step guided workflow (Details → Summary → Confirmed) with visual status indicators.

### 2. Secure Authentication & Identity
*   **Public Signup**: Self-service account creation for all travelers.
*   **Email Verification**: Automated verification workflow to ensure valid passenger identities.
*   **Secure Password Reset**: Integrated recovery system for forgotten credentials via email tokens.
*   **Persistent Sessions**: Secure session management allowing users to stay logged in across visits.

### 3. Live Trip Monitoring (Live Status)
*   **Real-Time Status Dashboard**: Publicly accessible departures/arrivals board showing "On Time", "Delayed", or "Arrived" statuses for all of today's voyages.
*   **Vessel Information**: Transparent tracking of which ship is assigned to each route.
*   **Route Filtering**: Easy-to-use filters to find specific schedules between island ports.

### 4. Public Advisories & Alerts
*   **Service Notifications**: Instant access to weather updates, route changes, or service disruptions posted by staff.
*   **Categorized Information**: Alerts categorized by severity (Weather, Route, Fare, General) for quick scanning.
*   **Digital Itinerary**: A secure, printable summary of travel details with a unique 6-character booking reference and terminal instructions.

### 5. Self-Service Suite
*   **My Bookings**: History of all past and upcoming trips with current payment and reservation status.
*   **Profile Management**: Manage personal PII and a directory of family members for faster future bookings.

---

## 🏗️ Administrative Command Center (RBAC)
Granular control for Super Admins, Operations Managers, and Station Managers.

### 1. Operational Dashboard
*   **Fleet Readiness**: Visual monitor of "In Service" vs "Under Maintenance" vessels.
*   **Boarding Efficiency**: Progress bars tracking the ratio of boarded vs. paid passengers for the day.
*   **Financial Momentum**: Real-time revenue charts (Monthly Trends & Route Volume).
*   **Trip Punctuality**: High-level count of delayed or cancelled voyages for the current date.

### 2. Booking & Revenue Management
*   **Ghost Reservation Purge**: Administrative alert and cleanup tool to delete unpaid "Ghost" reservations 1 hour before departure to release capacity.
*   **Atomic Waitlist Promotion**: Automated First-Come, First-Served engine that promotes waitlisted passengers when seats open via transaction logic.
*   **Payment Correction**: "Undo Payment" action for accidental entries, reverting status from Confirmed back to Reserved.
*   **Desk Booking**: Fast-entry interface for terminal walk-ins with integrated passenger profile search (Email/Phone). Allows an extended 60-day booking window.

### 3. Fleet & Trip Management (Digital Manifests)
*   **Trip Lifecycle Control**: Manage trip phases: Set status (On Time/Delayed), Start Boarding, Close Boarding, Depart, and Arrived.
*   **Vessel Assignment**: Assign specific ships to trips based on current fleet availability.
*   **Waitlist Overrides**: Adjust maximum waitlist limits per specific trip to handle peak demand.
*   **Compliance Manifests**: Generate and print official passenger manifests including age and booking references.
*   **Maintenance Scheduler**: Schedule dry-dock or repairs which automatically updates ship status system-wide.

### 4. Network Configuration
*   **Port Management**: Manage terminal locations within the shipping network.
*   **Route Mapping**: Configure travel paths between ports including distance tracking.
*   **Fare Tables**: Route-specific pricing matrices for different passenger types (Senior, Student, etc.).

### 5. Reporting & Compliance
*   **Financial Reconciliation**: Detailed breakdown of Gross, Net, and Earned revenue.
*   **Fee Tracking**: Monitoring of rebooking fees, no-show penalties, and cancellation fees.
*   **CSV Exports**: One-click data generation for accounting and regulatory compliance.
*   **Data Retention**: Automated 90-day PII purge tool to ensure global privacy compliance.
*   **SOP Repository**: Digital access to Service Interruption Protocols for staff training and emergency response.
