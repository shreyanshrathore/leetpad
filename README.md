# LeetCode Whiteboard MVP

A simple realtime whiteboard for LeetCode problems. Use the Chrome extension on your Mac and the hosted web app on your iPad. Both stay in sync through Firebase Firestore.

## What it does

- Detects the current LeetCode problem slug from the URL
- Opens a drawing whiteboard in a Chrome side panel
- Syncs drawings in realtime between Mac and iPad
- Saves one board per user per problem in Firestore
- Reloads saved drawings when you revisit the same problem

## Tech stack

- React + Vite + TypeScript
- Chrome Extension Manifest V3 with Side Panel API
- Firebase Authentication (Google sign-in)
- Firebase Firestore (realtime sync + persistence)
- tldraw (drawing canvas, Apple Pencil friendly)

## Project structure

```text
leetcode-extension/
├── public/
│   ├── manifest.json      # Chrome MV3 manifest
│   └── background.js      # Enables side panel on LeetCode pages
├── src/
│   ├── App.tsx              # Main layout and problem header
│   ├── firebase.ts          # Firebase initialization
│   ├── components/
│   │   ├── AuthGate.tsx     # Google login gate
│   │   └── Whiteboard.tsx   # tldraw canvas wrapper
│   ├── hooks/
│   │   ├── useAuth.ts       # Firebase auth state
│   │   ├── useProblemSlug.ts# Slug detection for extension + hosted app
│   │   └── useRealtimeBoard.ts # Firestore save/load/sync
│   └── lib/
│       └── problemSlug.ts   # URL parsing helpers
├── index.html               # Hosted iPad/web app entry
├── sidepanel.html           # Chrome extension side panel entry
└── vite.config.ts
```

## 1. Setup commands

```bash
cd leetcode-extension
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase web app config values.

## 2. Firebase setup

### Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Add a **Web app**
4. Copy the config values into `.env`

### Enable Google sign-in

1. Firebase Console -> **Authentication** -> **Sign-in method**
2. Enable **Google**
3. Add your support email

### Create Firestore database

1. Firebase Console -> **Firestore Database**
2. Create database in **production mode**
3. Choose a region close to you

### Firestore security rules

Use simple per-user rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/boards/{problemSlug} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/previews/{problemSlug} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Authorized domains

Add these domains in Firebase Console -> **Authentication** -> **Settings** -> **Authorized domains**:

- `localhost`
- Your deployed hosting domain (for example `your-app.web.app`)

Hosted app sign-in uses `signInWithPopup`. The Chrome extension uses a separate Google OAuth flow (below), so `chrome-extension://...` is optional for this MVP.

### Chrome extension Google OAuth (required for extension sign-in)

`signInWithPopup` does not work inside Chrome extension side panels. The extension uses `chrome.identity` instead.

#### Step 1: Get your extension ID and redirect URI

1. Run `npm run build` and load the extension from `dist`
2. Open the extension side panel — it shows your **redirect URI** and **extension ID**
3. Or find the extension ID on `chrome://extensions`

The redirect URI always looks like:

```text
https://YOUR_EXTENSION_ID.chromiumapp.org/
```

#### Step 2: Create a Web application OAuth client (recommended)

Use **Web application**, not Chrome Extension — this avoids `redirect_uri_mismatch`.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Select project **`leetpad-264dc`** (same as Firebase)
3. Click **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Name: `LeetCode Whiteboard Extension`
6. Under **Authorized redirect URIs**, click **Add URI** and paste your redirect URI exactly, for example:

```text
https://fkelebhdeieanbggohanjlabobpopbfa.chromiumapp.org/
```

7. Click **Create** and copy the **Client ID**

#### Step 3: Add Client ID to `.env` and rebuild

```bash
VITE_GOOGLE_OAUTH_CLIENT_ID=729497727270-xxxxx.apps.googleusercontent.com
npm run build
```

Reload the extension on `chrome://extensions`.

#### If you already created a Chrome Extension OAuth client

Either edit it so the Item ID matches your current extension ID exactly, or create a new **Web application** client with the redirect URI above and use that Client ID instead.

## 3. Local development

### Hosted web app (iPad / browser testing)

```bash
npm run dev
```

Open:

- `http://localhost:5173/?problem=two-sum`

Sign in with Google and start drawing.

### Chrome extension

Build first:

```bash
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

Open a LeetCode problem page, for example:

- `https://leetcode.com/problems/two-sum/`

Click the extension icon to open the side panel.

## 4. How slug detection works

LeetCode URL:

```text
https://leetcode.com/problems/two-sum/
```

Extracted slug:

```text
two-sum
```

Firestore document path:

```text
users/{userId}/boards/two-sum
```

Hosted iPad URL format:

```text
https://your-deployed-app.web.app/?problem=two-sum
```

## 5. Sync model (local edit + save)

Flow:

1. **One canvas per problem** — loads the last saved board when you open it
2. **Draw and erase locally** on iPad — no Firestore reload during the session
3. Click **Save** — writes the final board to `users/{userId}/boards/{problemSlug}`
4. **Mac extension** mirrors when you press Save on iPad
5. **Refresh** — reloads the last saved board

This keeps erase/draw reliable and avoids overlapping strokes from constant sync.

## 6. Deployment

### Option A: Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

When prompted:

- Public directory: `dist`
- Single-page app: `No`
- Build before deploy: `Yes` with `npm run build`

Deploy:

```bash
npm run build
firebase deploy --only hosting
```

### Option B: Vercel

1. Push the repo to GitHub
2. Import the project in Vercel
3. Set the same `VITE_FIREBASE_*` environment variables
4. Build command: `npm run build`
5. Output directory: `dist`

After deploy, open on iPad:

```text
https://your-app.vercel.app/?problem=two-sum
```

## 7. Test realtime sync between Mac and iPad

1. Deploy the hosted app or run `npm run dev` on your Mac
2. Load the Chrome extension from `dist`
3. Sign in with the same Google account on both devices
4. Open the same problem slug on both:
   - Mac: LeetCode problem page + extension side panel
   - iPad: hosted URL with `?problem=...`
5. Draw on iPad with Apple Pencil
6. Confirm the drawing appears on the Mac side panel
7. Refresh or revisit the problem and confirm the board reloads

## 8. Rebuild extension after code changes

```bash
npm run build
```

Then click **Reload** on `chrome://extensions`.

## 9. Troubleshooting

### Google sign-in fails in the extension

- Add `VITE_GOOGLE_OAUTH_CLIENT_ID` to `.env` (Chrome Extension OAuth client, not the Firebase web client)
- Create the OAuth client in Google Cloud Console as type **Chrome Extension**
- Rebuild with `npm run build` and reload the extension
- Confirm Google provider is enabled in Firebase Authentication

### Google sign-in fails on localhost / iPad

- Confirm `.env` has valid `VITE_FIREBASE_*` values
- Confirm `localhost` is in Firebase authorized domains
- Confirm Google provider is enabled in Firebase Authentication

### Side panel does not open

- Make sure you are on a `leetcode.com/problems/...` page
- Confirm the extension has `sidePanel` permission

### iPad page asks for manual slug input

- Use `?problem=two-sum` in the URL

### Drawings do not sync

- Confirm both devices use the same Google account
- Confirm both devices use the same problem slug
- Check Firestore rules and browser console for errors

## 10. Bonus features included

- Undo/redo: built into tldraw
- Auto-save: debounced Firestore writes
- Dark mode: basic CSS `prefers-color-scheme` support

## License

MIT
