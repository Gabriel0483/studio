# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment Troubleshooting

If you encounter errors during deployment, follow these steps:

### 1. Fix "Invalid Root Directory" Error
If the build fails with: *"Invalid root directory specified. No buildable app found rooted at '/workspace/studio/.idx'"*:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **App Hosting** > [Your App] > **Settings**.
3. In the **Deployment** section, find the **Root directory** setting.
4. Ensure it is set to **`/`** (the absolute root of your repository). **Do not point it to the .idx folder.**

### 2. Fix "No buildpack groups passed detection"
This happens if the build system can't identify your project. Ensure:
*   `package.json`, `apphosting.yaml`, and `next.config.ts` are in the **root** of your GitHub repository.
*   You have committed a `package-lock.json` file. (Run `npm install` locally to generate it).
*   Your project uses Node.js 20 (already configured in `package.json`).

### 3. Production Environment Variables
If you use AI features, add your `GEMINI_API_KEY` in the Firebase Console under **App Hosting** > **Settings** > **Environment variables**.

## Key Features
- **Traveler Experience**: Online booking, passenger profiles, live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, real-time manifest.
- **Security**: RBAC & LBAC implemented via Firestore Security Rules.

## Technical Stack
- **Framework**: Next.js 15 (Standalone Output)
- **Database/Auth**: Firebase
- **Runtime**: Node.js 20