
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment & Build Fixes
If you see "Site Not Found" or a "Detection Failed" error during deployment:

1.  **Finding your Live URL**: 
    - Go to the **Firebase Console -> App Hosting**.
    - Select your backend (e.g., `islakonek`).
    - The live **URL** (ending in **`.hosted.app`**) is listed on the **Dashboard** under the **Domains** section.
    - Note: The old `.web.app` URL from standard Firebase Hosting will not work for this Next.js project.

2.  **Root Directory Fix**: 
    - In the Firebase Console, go to **App Hosting -> Settings**. 
    - Ensure **Root Directory** is set to **`/`** (a single forward slash). 

3.  **Lock File Required**: 
    - The build system **MUST** see a `package-lock.json` file in your GitHub repository. 
    - Run `npm install` on your computer and push the resulting `package-lock.json` file to GitHub.

## 🔐 Authentication & Domain Security
To avoid "Application Error" or "Unauthorized Domain" errors during Sign Up/Login:

1.  **Authorize Your Domain**:
    - Go to **Firebase Console > Authentication > Settings > Authorized Domains**.
    - Add your production domain: `islakonek--studio-8432386314-93bd2.asia-east1.hosted.app` (remove `https://` and `/welcome`).
2.  **Dynamic Links Note**: This app uses standard Password Auth. It is **not** affected by the Dynamic Links shutdown as it does not use passwordless email links or Cordova.

## 📂 Project Structure
- `/src`: Application source code (Next.js App Router).
- `/dataconnect`: PostgreSQL schema and GraphQL operations.
- `apphosting.yaml`: Production environment configuration.
- `firebase.json`: Firebase CLI configuration.

## 🛡️ Security & Secrets
- **Firebase API Keys**: These are public identifiers and are safe to be in GitHub.
- **Data Protection**: Access is secured via `firestore.rules`.
- **Private Secrets**: Manage keys like `GEMINI_API_KEY` in the Firebase Console under **App Hosting > Settings > Environment Variables**.

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
