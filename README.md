# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚨 CRITICAL: Fix Deployment Build Errors
If you see "Invalid root directory" or "No buildpack groups passed detection" in your logs, follow these steps:

1.  **Firebase Console**: Go to [App Hosting](https://console.firebase.google.com/).
2.  **App Settings**: Click your backend -> **Settings** tab.
3.  **Root Directory**: Change the value from `.idx` to **`/`** (just a forward slash).
4.  **Save & Redeploy**: Save changes and click "Release" or "Start Rollout" to start a new build.

## 🚀 Deployment Workflow (Studio -> GitHub -> Live)

To make this app accessible to the public, you **must** use GitHub. 

1.  **Create a GitHub Repo**: Create a new repository on GitHub.
2.  **Push your Code**: Push all files from this workspace to the **root** of your GitHub repo.
3.  **Generate Lock File**: Run `npm install` on your local machine to create `package-lock.json` and push it to GitHub.
4.  **Connect to App Hosting**: 
    *   Go to the [Firebase Console](http://console.firebase.google.com/).
    *   Select **App Hosting** > **Get Started**.
    *   Connect your GitHub account and select your repository.

## 🛡️ Security & Secrets
- **Firebase API Keys are Public**: These identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules**. Even with an API key, no one can read or write data unless they meet the criteria defined in `firestore.rules`.
- **Private Keys**: Never commit `.env` files. Use the Firebase Console (App Hosting > Settings > Environment Variables) to manage secrets like `GEMINI_API_KEY` for production.

## 🔑 Transfer of Ownership

1.  **Firebase Project**: Add the new owner's email in **Project Settings > Users and Permissions** with the "Owner" role.
2.  **GitHub Repository**: Transfer the repo via **Settings > General > Danger Zone**.
3.  **Admin Override**: Update the `isPlatformAdmin()` function in `firestore.rules` with the new owner's email to grant them master access.

## 📦 Production Readiness Checklist
- [x] `apphosting.yaml` is in the root directory.
- [ ] `package-lock.json` is committed (Run `npm install` locally to generate it).
- [ ] **Root directory** setting in Firebase Console is set to `/`.
- [ ] Environment variables added in the App Hosting dashboard.

## Key Features
- **Traveler Experience**: Self-service booking, family management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Security**: Granular RBAC (Role-Based Access Control) enforced at the database level.
