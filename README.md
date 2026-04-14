
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated, single-tenant maritime management platform designed to digitalize shipping and ferry operations. It provides a comprehensive ecosystem for operators to manage their fleets and for passengers to book and track their sea journeys.

## 🚀 Getting to Production

While you are building in **Firebase Studio**, your production deployment relies on **GitHub**. Follow these steps to take your app live:

1.  **Create a GitHub Repository**: Create a new repository on your GitHub account.
2.  **Push your Code**: Push the files from this environment to your new GitHub repository.
3.  **Connect to Firebase App Hosting**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to **App Hosting** in the sidebar and connect your repository.
4.  **Set Environment Variables**:
    *   In the Firebase Console, go to your App Hosting backend settings.
    *   Add any required variables (like `GEMINI_API_KEY`) under the "Environment Variables" tab.

## 🔑 Environment Variables

The app uses a `.env` file for local development. See `.env.example` for the required structure.
- **Firebase Config**: Found in `src/firebase/config.ts`.
- **Secrets**: Store sensitive keys like AI API tokens in `.env` (excluded from GitHub).

## Key Features

### 1. Traveler Experience
- **Secure Online Booking**: Port-to-destination search with real-time availability.
- **Passenger Profiles**: Save details and family members for faster booking.
- **Live Trip Status**: Real-time dashboard for today's departures and arrivals.
- **Public Advisories**: Urgent service updates and weather alerts.

### 2. Command Center (Admin Dashboard)
- **Fleet & Route Management**: Control ships, ports, and transit networks.
- **Smart Scheduling**: Manage recurring daily templates and special voyage instances.
- **Real-time Manifest**: Digital boarding workflow for ground staff with printable manifests.
- **Desk Booking Agent Portal**: Streamlined interface for high-volume port-side sales.
- **RBAC & LBAC**: Role-Based and Location-Based Access Control.
- **Reports**: Financial reconciliation and sales analysis.

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Firebase (Firestore & Authentication)
- **AI**: Genkit (Gemini)
- **Styling**: Tailwind CSS + ShadCN UI

## License
This project is licensed under the MIT License.
