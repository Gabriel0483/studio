
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Getting to Production

To fix the "No buildpack groups passed detection" error, ensure your repository follows this structure exactly:

1.  **Root Directory**: All files (like `package.json`, `apphosting.yaml`, `next.config.ts`) must be in the **root** of your GitHub repository. **Do not put them in a subfolder.**
2.  **Lock File**: You **MUST** include a `package-lock.json` file in your repository.
    *   On your local machine, run `npm install` inside your project folder.
    *   Commit the generated `package-lock.json` to GitHub.
3.  **App Hosting Setup**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to **App Hosting** and connect your repository.
4.  **Secrets**: Add `GEMINI_API_KEY` in the App Hosting settings if you use AI features.

## Key Features
- **Traveler Experience**: Online booking, passenger profiles, live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, real-time manifest.
- **Security**: RBAC & LBAC implemented via Firestore Security Rules.

## Technical Stack
- **Framework**: Next.js 15 (Standalone Output)
- **Database/Auth**: Firebase
- **Runtime**: Node.js 20
