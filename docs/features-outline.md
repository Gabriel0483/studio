
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
*   **Fleet Readiness Monitor**: Real-time KPI tracking the percentage of the fleet currently "In Service." Alerts when readiness drops below 80%.
*   **Boarding Efficiency Tracker**: Visual progress bars comparing boarded passengers vs. paid reservations for the day.
*   **Financial Momentum Analytics**: Monthly revenue trends and top-performing route volume charts.
*   **Trip Punctuality**: Real-time count of delayed or cancelled voyages for the selected date.
*   **Waitlist Burden Indicator**: High-level visibility into total waitlisted passengers across the entire operation.

### 2. Booking & Revenue Management
*   **Ghost Reservation Purge**: Administrative tool to identify and bulk-delete unpaid "Ghost" bookings 1 hour before departure to recover seat capacity.
*   **Atomic Waitlist Promotion**: Automated First-Come, First-Served engine that promotes waitlisted passengers when seats are released via cancellation or deletion.
*   **Payment Correction Tools**: "Undo Payment" actions for correcting entry errors, reverting status from Confirmed back to Reserved.
*   **Desk Booking Interface**: Optimized fast-entry for walk-ins with a 60-day booking window and integrated passenger profile search (Email/Phone).
*   **Deep-Dive Manifest Filtering**: Search and filter global bookings by date, specific trip, route, status, or passenger identity.

### 3. Operations & Fleet Management
*   **Fleet Readiness Registry**: Centralized database tracking vessel types, names, and passenger capacities.
*   **Recurring Schedule Templates**: Engine for defining "Daily" recurring trip blueprints that automatically spawn trip instances.
*   **Intelligent Maintenance Scheduler**: Tool for planning repairs that automatically marks vessels as "Under Maintenance," locking them from active trip assignment.
*   **Auto-Status Sync**: Ships automatically revert to "In Service" once scheduled maintenance windows expire.
*   **Assigned Crew Visibility**: Real-time lookup of staff members associated with specific ships during scheduling.

### 4. Trip Management (Digital Manifests)
*   **Trip Lifecycle Control**: Active management of trip phases: Set status (On Time/Delayed/Cancelled), Start/Close Boarding, Depart, and Arrived.
*   **Vessel Assignment**: Assign specific ships to trips right before boarding, restricted to "In Service" vessels only.
*   **State-Locked Safety Compliance**: Programmatic locks on "Start Boarding" and "Depart" buttons until mandatory digital safety checklists (Pre-Boarding & Pre-Departure) are signed.
*   **Real-Time Interactive Manifest**: Crew interface to "Board" or "Deboard" individuals with instant head-count synchronization to the dashboard.
*   **Compliance Printing**: Generate and print official passenger manifests formatted for port authority and coast guard regulations.

### 5. Network Configuration
*   **Port Management**: Master terminal location registry. Defines the physical nodes of the network and serves as the anchor for port-based RBAC.
*   **Route Mapping**: Configure nautical travel paths between ports. Includes nautical distance tracking and the definition of allowed passenger segments (Adult, Senior, etc.).
*   **Fare Tables**: Route-specific pricing matrices. Prices are bound to the passenger segments defined in the Route module and sync instantly across all booking channels.
*   **Advisory Broadcast Hub**: Centralized station for posting public announcements categorized by severity (Weather, Route, Fare, Service Disruption).

### 6. Reporting & Compliance
*   **Financial Reconciliation**: Detailed period-based breakdown of Gross, Net, and Earned revenue.
*   **Fee & Refund Tracking**: Dedicated monitoring of rebooking fees, no-show penalties, and cancellation fee retention.
*   **CSV Data Streaming**: One-click generation of transaction data for accounting and regulatory compliance audits.
*   **Data Retention Policy**: Automated 90-day PII purge tool to ensure global privacy compliance.
*   **SOP Repository**: Digital access to Standard Operating Procedures for staff training and emergency incident response.
