# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment & Build Fixes
If you see "Site Not Found" or a "Detection Failed" error during deployment:

1.  **Finding your Live URL**: 
    - Go to the **Firebase Console -> App Hosting**.
    - Select your backend (e.g., `islakonek`).
    - The live **URL** (ending in **`.hosted.app`**) is listed on the **Dashboard** under the **Domains** section.

2.  **Root Directory Fix**: 
    - In the Firebase Console, go to **App Hosting -> Settings**. 
    - Ensure **Root Directory** is set to **`/`** (a single forward slash). 

## 🔐 Authentication & Domain Security
1.  **Authorize Your Domain**:
    - Go to **Firebase Console > Authentication > Settings > Authorized Domains**.
    - Add your production domain: `islakonek--studio-8432386314-93bd2.asia-east1.hosted.app`.

2.  **Public Auth Features**:
    - Integrated **Email Verification** for all new passenger signups.
    - Token-based **Password Reset** for secure account recovery.

## 🛡️ Security & Encryption
- **Data Protection**: Access is secured via `firestore.rules` with strict Role-Based Access Control (RBAC).
- **SSL/TLS**: All connections are encrypted via HTTPS. Modern security headers (HSTS, X-Frame-Options) are enforced via `next.config.ts`.
- **Ghost Protection**: System automatically identifies and purges stale unpaid reservations 1 hour before departure.

## 📂 Documentation
- [Comprehensive Feature Outline](/docs/features-outline.md)
- [Backend Data IR](/docs/backend.json)

## Key Features
- **Traveler Experience**: 7-day window booking, profile management, verified signups, live trip status, and public advisories.
- **Command Center**: Fleet/Route management, atomic waitlist promotion, and real-time boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics with CSV exports.
