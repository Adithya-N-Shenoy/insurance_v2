## Aikyam Healthcare Insurance

This project now uses Firebase for backend storage:

- Firestore for claims, companies, agents, notes, and status history
- Firebase Storage for uploaded bills, room photos, and requested documents
- Gemini for bill extraction

### Required environment variables

Copy `.env.example` to `.env.local` and fill in:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `GEMINI_API_KEY`

### Run locally

```powershell
npm install
npm run dev
```

### Firebase collections used

- `insurance_companies`
- `claims`
- `claim_items`
- `agents`
- `document_requests`
- `claim_status_history`
- `review_notes`
- `notifications`
