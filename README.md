# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 CRITICAL: Deployment Checklist (Fixing Build Errors)
If you are seeing "No buildpack groups passed detection" or "Invalid root directory" in your logs, you **must** complete these steps:

1.  **Generate Lock File**: On your local computer, run `npm install` in this folder.
2.  **Commit Lock File**: Push the newly created `package-lock.json` to your GitHub repo.
3.  **Firebase Console**: Go to [App Hosting](https://console.firebase.google.com/) -> Your Backend -> **Settings** tab.
4.  **Root Directory**: Ensure this is set to **`/`** (not `.idx`).
5.  **Restart Build**: Go to the Dashboard and click **"Start Rollout"**.

## 🛡️ Security & Secrets
- **Firebase API Keys are Public**: These identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules**. Even with an API key, no one can read or write data unless they meet the criteria defined in `firestore.rules`.
- **Private Keys**: Use the Firebase Console (App Hosting > Settings > Environment Variables) to manage secrets like `GEMINI_API_KEY`.

## 📦 Project Structure
For deployment to work, these files must be in the **root** of your GitHub repo:
- `package.json`
- `package-lock.json` (Required!)
- `apphosting.yaml`
- `next.config.ts`

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
