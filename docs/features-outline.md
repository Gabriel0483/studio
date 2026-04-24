
# Isla Konek: Granular Feature Specifications

## 🚢 Public Passenger Portal
Designed for a seamless traveler experience from planning to boarding.

### 1. Smart Booking Engine
*   **Dynamic Restricted Window**: Online bookings are strictly enforced to a 7-day window before departure to ensure operational accuracy.
*   **Real-Time Availability**: Live seat counters show exactly how many spots remain. Automatically switches to "Waitlist" when full.
*   **Multi-Passenger Support**: Add multiple travelers in a single transaction with individual fare type selection (Adult, Senior, Student, etc.).
*   **Profile Integration**: Logged-in users can instantly add themselves ("Me") or saved family members to a booking via profile shortcuts.
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

### 5. Self-Service Suite
*   **My Bookings**: History of all past and upcoming trips with current payment and reservation status.
*   **Profile Management**: Manage personal PII and a directory of family members for faster future bookings.
*   **Digital Itinerary**: A secure, printable summary of travel details with a unique 6-character booking reference and terminal instructions.
*   **Privacy Guard**: Transparent disclosure of the 90-day data retention policy.

---

## 🏗️ Administrative Command Center (RBAC)
Granular control for Super Admins, Operations Managers, and Station Managers.

### 1. Operational Dashboard
*   **Fleet Readiness**: Visual monitor of "In Service" vs "Under Maintenance" vessels with health alerts.
*   **Boarding Efficiency**: Progress bars tracking the ratio of boarded vs. paid passengers for the day.
*   **Financial Momentum**: Real-time revenue charts (Monthly Trends & Route Volume).
*   **Trip Punctuality**: High-level count of delayed or cancelled voyages for the current date.
*   **Waitlist Burden**: Visibility into total waitlisted passengers across the operation.

### 2. Booking & Revenue Management
*   **Ghost Reservation Purge**: Administrative alert and cleanup tool to delete unpaid "Ghost" reservations 1 hour before departure to release capacity.
*   **Atomic Waitlist Promotion**: Automated First-Come, First-Served engine that promotes waitlisted passengers when seats open via transaction logic.
*   **Payment Correction**: "Undo Payment" action for accidental entries, reverting status from Confirmed back to Reserved.
*   **Desk Booking**: Fast-entry interface for terminal walk-ins with integrated passenger profile search (Email/Phone). Allows an extended 60-day booking window.
*   **Multi-Criteria Filtering**: Search and filter global bookings by date, route, status, or passenger identity.

### 3. Operations & Fleet Management
*   **Fleet Readiness Registry**: Centralized database of all vessels including name, vessel type, and passenger capacity.
*   **Recurring Schedule Templates**: Engine for creating "Daily" recurring trip patterns that serve as the blueprint for all future voyages.
*   **Maintenance Control Center**: Advanced tool for scheduling dry-dock or repairs with detailed descriptions.
*   **Auto-Lock Status Sync**: Intelligent logic that automatically marks vessels as "Under Maintenance" during scheduled repairs, preventing accidental deployment in trip management.
*   **Assigned Crew Visibility**: Real-time lookup of staff members currently assigned to specific ships during schedule planning.

### 4. Trip Management (Digital Manifests)
*   **Trip Lifecycle Control**: Manage trip phases: Set status (On Time/Delayed/Cancelled), Start Boarding, Close Boarding, Depart, and Arrived.
*   **Vessel Assignment**: Assign specific ships to trips right before boarding starts.
*   **Safety Compliance Gate**: Programmatic locks on boarding and departure buttons until mandatory Pre-Boarding and Pre-Departure checklists (including Vessel Stability & Weight) are signed.
*   **Real-Time Boarding Manifest**: Interactive crew interface to "Board" or "Deboard" individual passengers with instant synchronization.
*   **Compliance Manifests**: Generate and print official passenger manifests for port authority and regulatory compliance.

### 5. Network Configuration
*   **Port Management**: Master registry of terminal locations. Defines the physical nodes of the network and serves as the anchor for staff role assignments.
*   **Route Mapping**: Configure travel paths between ports including distance tracking and allowed passenger types.
*   **Fare Tables**: Route-specific pricing matrices for different passenger types (Adult, Senior, Student, etc.).
*   **Advisory Management**: Centralized hub for posting public announcements categorized by severity (Weather, Route, Fare, Service Disruption).

### 6. Reporting & Compliance
*   **Financial Reconciliation**: Detailed breakdown of Gross, Net, and Earned revenue.
*   **Fee Tracking**: Monitoring of rebooking fees, no-show penalties, and cancellation fees.
*   **CSV Exports**: One-click data generation for accounting and regulatory compliance.
*   **Data Retention**: Automated 90-day PII purge tool to ensure global privacy compliance.
*   **SOP Repository**: Digital access to Service Interruption Protocols (including Vessel Stability & Loading) for staff training and emergency response.
