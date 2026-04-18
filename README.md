# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment Workflow (Studio -> GitHub -> Live)

To make this app accessible to the public, you **must** use GitHub. Firebase App Hosting requires a Git connection to build and serve your Next.js application.

1.  **Create a GitHub Repo**: Create a new repository on GitHub.
2.  **Push your Code**: Push all files from this workspace to the **root** of your GitHub repo.
3.  **Connect to App Hosting**: 
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Select **App Hosting** > **Get Started**.
    *   Connect your GitHub account and select your repository.
4.  **Fix Root Directory**: During setup (or in Settings later), ensure the **Root directory** is set to `/`.

## 🛡️ Security & Secrets
- **Firebase API Keys are Public**: These identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules**. Even with an API key, no one can read or write data unless they meet the criteria defined in `firestore.rules`.
- **Private Keys**: Never commit `.env` files or Service Account JSONs. Use the Firebase Console to manage environment variables for production.

## 🔑 Transfer of Ownership

1.  **Firebase Project**: Add the new owner's email in **Project Settings > Users and Permissions** with the "Owner" role.
2.  **GitHub Repository**: Transfer the repo via **Settings > General > Danger Zone**.
3.  **Admin Override**: Update the `isPlatformAdmin()` function in `firestore.rules` with the new owner's email to grant them master access.

## 📦 Production Readiness Checklist
- [ ] `package-lock.json` is committed (Run `npm install` locally to generate it).
- [ ] `apphosting.yaml` is in the root directory.
- [ ] Root directory setting in Firebase Console is set to `/`.
- [ ] Environment variables (like `GEMINI_API_KEY`) are added in the App Hosting dashboard.

## Key Features
- **Traveler Experience**: Self-service booking, family management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Security**: Granular RBAC (Role-Based Access Control) enforced at the database level.
