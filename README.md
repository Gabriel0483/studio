
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment Fixes

### 1. Fixing "Invalid root directory" Error
If you see the error **"Invalid root directory specified. No buildable app found rooted at '/workspace/studio/.idx'"**, follow these steps:

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **App Hosting**.
3.  Select your backend/app.
4.  Go to the **Settings** tab (or **Deployment** tab).
5.  Find the **Root Directory** setting.
6.  Change the value from `.idx` to `/` (or leave it blank) so it points to the main project folder containing `package.json`.
7.  Save the settings and trigger a new rollout.

### 2. Correct Repository Structure
Ensure your GitHub repository follows this exact structure at the top level:
```text
/ (Repository Root)
├── src/
├── public/
├── apphosting.yaml      <-- Must be here
├── next.config.ts       <-- Must be here
├── package.json         <-- Must be here
├── package-lock.json    <-- REQUIRED (Run 'npm install' locally)
└── tsconfig.json
```

### 3. Required Step: Generate a Lock File
Firebase App Hosting **requires** a lock file to install dependencies. 
1. Open your terminal on your local computer.
2. Navigate to your project folder.
3. Run: `npm install`
4. This creates `package-lock.json`.
5. **Commit and push** this file to GitHub.

## Key Features
- **Traveler Experience**: Online booking, passenger profiles, live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, real-time manifest.
- **Security**: RBAC & LBAC implemented via Firestore Security Rules.

## Technical Stack
- **Framework**: Next.js 15 (Standalone Output)
- **Database/Auth**: Firebase
- **Runtime**: Node.js 20
