
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚨 CRITICAL: Deployment Fixes (Read First)
If your build is failing with **"No buildpack groups passed detection"** or **"Invalid root directory"**:

1.  **Root Directory (Manual Step)**: Go to the **Firebase Console** -> **App Hosting** -> Select your backend -> **Settings** tab. Change the **Root Directory** from `.idx` to **`/`** (a single forward slash).
2.  **Lock File Required**: You **MUST** run `npm install` on your local computer to generate `package-lock.json`. This file must be committed and pushed to GitHub for the build system to work.
3.  **Live URL**: Your public site is hosted on **App Hosting**. Find the unique URL in the Firebase Console dashboard (it will end in `.run.app`).

## 📂 Project Structure
- `/src`: Application source code (Next.js App Router).
- `/dataconnect`: PostgreSQL schema and GraphQL operations.
- `apphosting.yaml`: Production environment configuration.
- `firebase.json`: Firebase CLI configuration.

## 🛡️ Security & Secrets
- **Firebase API Keys**: These are public and identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Access to data is secured via **Firestore Security Rules**.
- **Private Secrets**: Manage sensitive keys (like `GEMINI_API_KEY`) in the Firebase Console under App Hosting > Settings > Environment Variables.

## 🤝 Transfer of Ownership
1.  **Firebase**: Add the new owner's email as an **Owner** in Project Settings > Users and Permissions.
2.  **GitHub**: Transfer the repository to the new owner's account via Repository Settings > General > Danger Zone.
3.  **Platform Admin**: Update `isPlatformAdmin()` in `firestore.rules` to include the new owner's email address for full system-level access.

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
