
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated, single-tenant maritime management platform designed to digitalize shipping and ferry operations. It provides a comprehensive ecosystem for operators to manage their fleets and for passengers to book and track their sea journeys.

## 🚀 Getting to Production

While you are building in **Firebase Studio**, your production deployment relies on **GitHub**. Follow these steps to take your app live:

1.  **Create a GitHub Repository**: Create a new repository on your GitHub account.
2.  **Push your Code**: Push the files from this environment to your new GitHub repository.
3.  **Connect to Firebase App Hosting**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Select your project.
    *   Navigate to **App Hosting** in the sidebar.
    *   Click "Get Started" and connect your GitHub repository.
    *   Firebase will automatically build and deploy your app every time you push to your main branch.

## Key Features

### 1. Traveler Experience
- **Secure Online Booking**: Multi-step reservation process with real-time availability.
- **Passenger Profiles**: Save personal and family details for faster "one-click" bookings.
- **Live Trip Status**: Real-time dashboard for today's departures and arrivals.
- **Public Advisories**: Urgent service updates and weather alerts.

### 2. Command Center (Admin Dashboard)
- **Fleet & Route Management**: Control ships, ports, and transit networks.
- **Smart Scheduling**: Manage recurring daily templates and special voyage instances.
- **Real-time Manifest**: Digital boarding workflow for ground staff with printable manifests.
- **Desk Booking Agent Portal**: Streamlined interface for high-volume port-side sales.
- **RBAC & LBAC**: Role-Based and Location-Based Access Control to ensure staff only see what they need to.
- **Reports**: Financial reconciliation and sales analysis.

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **Database**: Firebase Firestore (Real-time)
- **Auth**: Firebase Authentication
- **Hosting**: Firebase App Hosting

## License
This project is licensed under the MIT License.
