# Second Brain

A private, shared visual library for future video ideas. People use a calm masonry interface; approved agents use a credential-protected JSON API.

The product brief is preserved exactly in [`my idea.md`](./my%20idea.md), and the Firebase project information supplied by the owner is preserved in [`Firebase.md`](./Firebase.md).

## What is included

- Google sign-in, with `ayushamitjain@gmail.com` locked as the first owner.
- Owner-approved team membership. An unapproved Google account cannot read the workspace.
- Link, image, and loose-note ideas in a responsive visual masonry library.
- Rich previews for YouTube, X/Twitter, Instagram, and general web pages, with safe fallbacks.
- Manual categories with no categories created by default.
- Optional planned film dates, search, filters, editing, and deletion.
- Firebase Storage image uploads with file type and 10 MiB size enforcement.
- Owner-generated agent credentials, shown once and revocable from the profile.
- A versioned agent API for ideas, categories, metadata retries, and search.

## Simple setup

You need [Node.js 22](https://nodejs.org/), a Java 21 runtime for Firebase emulator tests, and access to the Firebase project `shared-space-cca50`.

1. Install the app and function packages:

   ```powershell
   npm install
   npm --prefix functions install
   ```

2. Sign in to Firebase and confirm the selected project:

   ```powershell
   npx firebase login
   npx firebase use shared-space-cca50
   ```

3. Create the private server-side pepper used to hash agent credentials. Generate a random value, then paste it when Firebase asks:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   npx firebase functions:secrets:set AGENT_TOKEN_PEPPER
   ```

4. Build and deploy the Firebase rules, indexes, Functions, Storage rules, and Hosting site:

   ```powershell
   npm run build
   npx firebase deploy
   ```

Cloud Functions deployment requires the Firebase project to use the Blaze billing plan. The app does not require an OpenAI API key or a separate database.

After deployment, open the Hosting URL and sign in as `ayushamitjain@gmail.com`. That account is bootstrapped as the owner. Invite teammates by exact Google email from the profile menu.

## Local development

Start the web app against the live Firebase project:

```powershell
npm run dev
```

For local Firebase emulators:

1. Copy `.env.example` to `.env.local` and set `VITE_USE_FIREBASE_EMULATORS=true`.
2. Copy `functions/.secret.local.example` to `functions/.secret.local` and replace the sample pepper.
3. Start the emulator suite:

   ```powershell
   npm run emulators
   ```

4. In another terminal, start the browser app:

   ```powershell
   npm run dev
   ```

The emulator dashboard is at `http://127.0.0.1:4000`.

## Verification commands

Run these sequentially on a normal laptop so browser tests do not compete with unit tests for CPU:

```powershell
npm test
npm --prefix functions test
npm run build
npm --prefix functions run build
npm run test:rules
npm run test:e2e
```

The Playwright suite uses a compile-time-only visual QA library. Production builds do not include or expose a test bypass for Firebase authentication.

## Agent access

Only the owner can generate or revoke an agent credential. In the app:

1. Open the profile.
2. Create a named agent key, such as `Codex` or `Claude Code`.
3. Copy the generated instruction block immediately. The raw token is intentionally shown only once.
4. Give that block only to the intended agent. Revoke the key if it is exposed.

The deployed API base is:

```text
https://asia-south1-shared-space-cca50.cloudfunctions.net/agentApi/v1
```

See [`docs/agent-api.md`](./docs/agent-api.md) for the full route and payload reference.

## Security model

The Firebase web configuration in the repository identifies the Firebase project; it is not the private agent credential. Firestore and Storage rules enforce signed-in active membership. Privileged membership and key actions run only in server Functions. Agent tokens are stored as keyed hashes and raw tokens are never recoverable after their one-time display.

Do not commit `.env.local`, `functions/.secret.local`, agent tokens, exported Firebase service-account files, or copied instruction blocks containing a token.

Current dependency note (checked 2026-08-15): the browser production dependencies audit cleanly. The Functions tree reports a moderate `uuid` advisory through Firebase Admin's Google Storage dependency even though `firebase-admin@14.2.0` and `firebase-functions@7.3.2` are the latest releases. The automated force-fix proposes an unsafe downgrade to Firebase Admin 10, so it has intentionally not been applied. Recheck after future Firebase Admin releases.
