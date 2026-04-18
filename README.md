# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🔗 Live Application & Public Access
Once your build is successful, your application is **publicly accessible** at the URL provided in the Firebase Console.

1.  **Where to find the URL**: Go to **App Hosting** > Select your app. The domain will be under the "Dashboard" tab.
2.  **Who can see it?**: Anyone with the link can view the public portal (Home, Booking, Status).
3.  **Is it secure?**: Yes. The **Command Center (/dashboard)** and all sensitive passenger data are protected by Firebase Authentication and specialized Security Rules. Only users with "Staff" roles can manage the fleet.

## 🛡️ Security & Secrets
You may see warnings from GitHub about "Secrets Detected" regarding your `firebaseConfig`. 
- **Firebase API Keys are Public**: Unlike traditional server-side secrets, Firebase web API keys are designed to be included in client-side code. They identify your project to Google.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules** and **Firebase Authentication**, not by keeping the API key secret. 
- **Private Keys**: NEVER commit Service Account JSON keys or private Admin SDK keys to GitHub. These are NOT used in this project's client code.

## 🚀 Deployment Troubleshooting (Action Required)

If your build status shows an error, follow these critical steps:

### 1. Fix "Invalid Root Directory" Error
This is the most common reason for build failures.
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **App Hosting** > [Your App] > **Settings**.
3.  In the **Deployment** section, find the **Root directory** setting.
4.  **Crucial**: Set this to **`/`** (a single forward slash). 
5.  **Save** and trigger a new rollout. This allows the system to find your `package.json`.

### 2. Lock File Requirement
The build system requires a `package-lock.json` to install dependencies. 
- Ensure you have run `npm install` locally.
- Ensure `package-lock.json` is committed to the root of your GitHub repository.

## Key Features
- **Traveler Experience**: Self-service booking with "Passenger Details" auto-fill, family management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and real-time boarding manifests.
- **Security**: Granular RBAC (Role-Based Access Control) enforced at the database level.

## Technical Stack
- **Framework**: Next.js 15 (Standalone Output)
- **Database/Auth**: Firebase (Firestore & Auth)
- **Runtime**: Node.js 20
