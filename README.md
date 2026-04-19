
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 CRITICAL: Deployment Checklist
If you are seeing "Site Not Found" or "No buildpack groups passed detection":

1.  **Generate Lock File (REQUIRED)**: On your local computer, run `npm install` in this folder. You **MUST** commit and push the newly created `package-lock.json` to your GitHub repo. The build system cannot start without it.
2.  **Firebase Console**: Go to **App Hosting** -> Your Backend -> **Settings** tab.
3.  **Root Directory**: Ensure this is set to **`/`** (not `.idx`).
4.  **Find Your URL**: Your site is hosted on **App Hosting**, not standard Firebase Hosting. Go to the App Hosting Dashboard in the Firebase Console to find your live URL (it will end in `.run.app` or a custom domain).

## 📂 Project Structure
- `/src`: Application source code (Next.js App Router).
- `/dataconnect`: PostgreSQL schema and GraphQL operations.
- `apphosting.yaml`: Production environment configuration.
- `firebase.json`: Firebase CLI configuration.

## 🛡️ Security & Secrets
- **Firebase API Keys are Public**: These identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules**.
- **Private Keys**: Use the Firebase Console (App Hosting > Settings > Environment Variables) to manage secrets like `GEMINI_API_KEY`.

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
