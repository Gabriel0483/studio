
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 CRITICAL: Deployment Checklist
If you are seeing "No buildpack groups passed detection" or "Invalid root directory" in your logs:

1.  **Generate Lock File**: On your local computer, run `npm install` in this folder.
2.  **Commit Lock File**: Push the newly created `package-lock.json` to your GitHub repo.
3.  **Firebase Console**: Go to **App Hosting** -> Your Backend -> **Settings** tab.
4.  **Root Directory**: Ensure this is set to **`/`** (not `.idx`).
5.  **Restart Build**: Go to the Dashboard and click **"Start Rollout"**.

## 🛡️ Security & Secrets
- **Firebase API Keys are Public**: These identify your project. They are safe to be in GitHub.
- **Rules are the Guard**: Your data is secured by **Firestore Security Rules**.
- **Private Keys**: Use the Firebase Console (App Hosting > Settings > Environment Variables) to manage secrets like `GEMINI_API_KEY`.

## 📂 Backend Systems
- **Firestore**: Currently used for real-time fleet operations and booking state.
- **Data Connect (GraphQL)**: Schema initialized in `/dataconnect` for future relational data scaling with PostgreSQL.

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
