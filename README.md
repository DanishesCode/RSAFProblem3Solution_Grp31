# RSAFProblem3Solution_Grp31
# RSAF Problem 3 – Firestore Migration
IMPORTANT: Currently, Gemini AI DOES NOT FUNCTION AS INTENDED. Will fix soon
This project uses **Firebase Firestore** as the backend database via the **Firebase Admin SDK**.

## ⚠️ Important: Secrets are NOT included
For security reasons, Firebase credentials and environment variables are **not committed** to this repository.

Each developer must configure their own local environment.

---

## 🧩 Prerequisites
- Node.js v18+
- npm
- A Firebase project with Firestore enabled

---

## 🔐 Firebase Admin SDK Setup (Required)

### 1️⃣ Create a Firebase service account
1. Go to **Firebase Console**
2. Project Settings → **Service accounts**
3. Click **Generate new private key**
4. Download the JSON file

---

### 2️⃣ Place the service account key
Create this folder at the project root:

/secrets


Place the downloaded JSON inside:

/secrets/firebase-service-account.json


⚠️ This file is gitignored and must NOT be committed.
