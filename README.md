
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Getting to Production (Deployment Fixes)

If you see the error **"No buildpack groups passed detection"**, it means the build system cannot find your project configuration. Ensure your GitHub repository follows this exact structure:

### 1. Correct Repository Structure
Your repository should look like this (no subfolders for the main project):
```text
/ (Repository Root)
├── .next/
├── src/
├── public/
├── apphosting.yaml      <-- Must be here
├── next.config.ts       <-- Must be here
├── package.json         <-- Must be here
├── package-lock.json    <-- REQUIRED (Run 'npm install' locally)
└── tsconfig.json
```

### 2. Required Step: Generate a Lock File
Firebase App Hosting **requires** a lock file to install dependencies. 
1. Open your terminal on your local computer.
2. Navigate to your project folder.
3. Run: `npm install`
4. This creates `package-lock.json`.
5. **Commit and push** this file to GitHub.

### 3. App Hosting Setup
*   Go to the [Firebase Console](https://console.firebase.google.com/).
*   Navigate to **App Hosting** and connect your repository.
*   If you use AI features, add `GEMINI_API_KEY` in the App Hosting environment settings.

## Key Features
- **Traveler Experience**: Online booking, passenger profiles, live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, real-time manifest.
- **Security**: RBAC & LBAC implemented via Firestore Security Rules.

## Technical Stack
- **Framework**: Next.js 15 (Standalone Output)
- **Database/Auth**: Firebase
- **Runtime**: Node.js 20
