
# Isla Konek: Maritime Command & Booking System

Isla Konek is a dedicated maritime management platform designed to digitalize shipping and ferry operations.

## 🚀 Deployment & Build Fixes
If you see "Site Not Found" or a "Detection Failed" error in Step 3:

1.  **The Correct URL**: For Next.js apps, Firebase App Hosting uses a unique URL ending in **`.run.app`**. You can find this in the **Firebase Console -> App Hosting** dashboard. The old `.web.app` URL will not work for this project type.
2.  **Root Directory**: In the Firebase Console, go to **App Hosting -> Settings**. Ensure **Root Directory** is set to **`/`** (a single forward slash). If it says `.idx`, the build will fail.
3.  **Lock File Required**: The build system **MUST** see a `package-lock.json` file. Run `npm install` on your computer and push the resulting file to GitHub.
4.  **Multiple Backends**: If you see two backends (e.g., `islakonek` and `Studio`), both are valid. Typically, you pick one as your "Production" environment and share its `.run.app` URL with your users.

## 📂 Project Structure
- `/src`: Application source code (Next.js App Router).
- `/dataconnect`: PostgreSQL schema and GraphQL operations.
- `apphosting.yaml`: Production environment configuration.
- `firebase.json`: Firebase CLI configuration.

## 🛡️ Security & Secrets
- **Firebase API Keys**: These are public identifiers and are safe to be in GitHub.
- **Data Protection**: Access is secured via `firestore.rules`. Always verify rules are deployed.
- **Private Secrets**: Manage keys like `GEMINI_API_KEY` in the Firebase Console under **App Hosting > Settings > Environment Variables**.

## 🤝 Transfer of Ownership
1.  **Firebase**: Add the new owner's email as an **Owner** in Project Settings > Users and Permissions.
2.  **GitHub**: Transfer the repository in the "Danger Zone" of the repository settings.
3.  **Platform Admin**: Update `isPlatformAdmin()` in `firestore.rules` to include the new owner's email for full system access.

## Key Features
- **Traveler Experience**: Self-service booking, profile management, and live trip status.
- **Command Center**: Fleet/Route management, smart scheduling, and boarding manifests.
- **Reporting**: Financial reconciliation and passenger volume analytics.
