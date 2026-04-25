
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

---

## 🏗️ Administrative Command Center (RBAC)
Granular control for Super Admins, Operations Managers, and Station Managers.

### 1. Operational Dashboard
*   **Fleet Readiness Monitor**: Real-time KPI tracking the percentage of the fleet currently "In Service." Alerts when readiness drops below 80%.
*   **Boarding Efficiency Tracker**: Visual progress bars comparing boarded passengers vs. boarded passengers for the day.
*   **Financial Momentum Analytics**: Monthly revenue trends and top-performing route volume charts.
*   **Trip Punctuality**: Real-time count of delayed or cancelled voyages for the selected date.
*   **Waitlist Burden Indicator**: High-level visibility into total waitlisted passengers across the entire operation.

### 2. Waitlist Lifecycle Management (The Atomic Engine)
Isla Konek uses a First-Come, First-Served (FCFS) priority queue.
*   **Automated Entry**: Triggered when `availableSeats` is less than the requested group size.
*   **Capacity Throttle**: Admins can set `waitlistLimit` per trip template to manage terminal congestion.
*   **Atomic Promotion**: A transaction-safe loop that identifies the next eligible passenger group in the queue whose size fits the newly available capacity. Triggers include deletions, refunds, and ghost purges.

### 3. Booking & Revenue Management
*   **Reserved Status Management**: Handles seat allocation for unpaid bookings. "Reserved" records lock capacity but are subject to strict expiry rules.
*   **Ghost Reservation Purge**: Administrative tool to identify and bulk-delete unpaid "Ghost" bookings 1 hour before departure to recover seat capacity.
*   **Payment Correction Tools**: "Undo Payment" actions for correcting entry errors, reverting status from Confirmed back to Reserved.
*   **Desk Booking Interface**: Optimized fast-entry for walk-ins with a 60-day booking window and integrated passenger profile search (Email/Phone).

### 4. Operations & Fleet Management
*   **Fleet Readiness Registry**: Centralized database tracking vessel types, names, and passenger capacities.
*   **Recurring Schedule Templates**: Engine for defining "Daily" recurring trip blueprints that automatically spawn trip instances.
*   **Intelligent Maintenance Scheduler**: Tool for planning repairs that automatically marks vessels as "Under Maintenance," locking them from active trip assignment.

### 5. Trip Management (Digital Manifests)
*   **Trip Lifecycle Control**: Active management of trip phases: Set status (On Time/Delayed/Cancelled), Start/Close Boarding, Depart, and Arrived.
*   **Vessel Assignment**: Assign specific ships to trips right before boarding, restricted to "In Service" vessels only.
*   **State-Locked Safety Compliance**: Programmatic locks on "Start Boarding" and "Depart" buttons until mandatory digital safety checklists are signed.

### 6. Financial Services (Refunds & Rebooking)
*   **Integrated Refund Calculator**: Apply customizable cancellation fees and calculate final refund amounts automatically.
*   **Force Majeure Integrity Policy**: Specialized toggle to waive all Rebooking, Cancellation, and No-show fees in cases of severe weather, technical disruptions, or other force majeure events.
*   **Penalty Management**: Centralized configuration for **Rebooking Fees**, **Cancellation Fees**, and **No-show Fees** within the module for operational ease.
*   **Audit Logging**: Mandatory "Reason" input for all cancellations and fee history tracking.

### 7. Reporting & Compliance
*   **Financial Reconciliation**: Detailed period-based breakdown of Gross, Net, and Earned revenue.
*   **Fee & Refund Tracking**: Dedicated monitoring of rebooking fees, no-show penalties, and cancellation fee retention.
*   **Data Retention Policy**: Automated 90-day PII purge tool to ensure global privacy compliance.
