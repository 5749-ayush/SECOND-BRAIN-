# Shared Video Ideas Second Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete private Firebase-native visual second brain specified in `my idea.md` and the approved product design.

**Architecture:** A React and TypeScript single-page client uses Firebase Authentication, Firestore, Storage, and callable functions. TypeScript Cloud Functions provide owner bootstrap, safe metadata ingestion, member administration, one-time agent-key creation, and a versioned HTTPS agent API. Firestore and Storage rules independently enforce membership and owner boundaries.

**Tech Stack:** React 19.2.8, TypeScript 7.0.2, Vite 8.2.1, Firebase Web SDK 12.17.1, Firebase Functions 7.3.2, Firebase Admin 14.2.0, Node.js 22 Functions runtime, Zod 4.4.3, Vitest 4.1.10, Testing Library 16.3.2, Playwright 1.62.1, Firebase Emulator Suite 15.27.0.

## Global Constraints

- `my idea.md` is the product source of truth.
- Firebase project ID is `shared-space-cca50`.
- Bootstrap owner email is exactly `ayushamitjain@gmail.com` after lowercase normalization.
- The application has one shared workspace with identifier `main`.
- Google is the only sign-in provider.
- Categories begin empty and are created only by a human or authorized agent.
- Every idea has an optional planned film date.
- X and Instagram metadata is best-effort and always has a manual fallback.
- Raw agent credentials are returned once and never stored.
- Firestore and Storage security rules must independently deny unauthorized direct access.
- The visual design is dark editorial: ink-blue, warm ivory, muted stone, restrained amber, frosted masonry cards, and no generic admin-dashboard treatment.
- Do not commit server secrets, generated agent tokens, emulator exports, dependencies, or build output.
- Use Node.js 22 for deployed Cloud Functions, as supported by current Firebase documentation.
- Complete each task with its focused tests before starting the next task.

## File and responsibility map

```text
/
├── src/
│   ├── app/                 # composition, routing state, providers, shell
│   ├── components/          # shared accessible UI primitives
│   ├── domain/              # schemas, types, pure search/date/source logic
│   ├── features/
│   │   ├── auth/            # Google sign-in and access gate
│   │   ├── ideas/           # library, cards, composer, detail editor
│   │   ├── categories/      # category creation and assignment
│   │   ├── filters/         # search, filter, sort controls
│   │   ├── members/         # owner-only member administration
│   │   └── agents/          # credentials and copyable instruction block
│   ├── lib/                 # Firebase initialization and shared helpers
│   ├── styles/              # tokens, global layout, components, motion
│   └── test/                # Vitest setup and fixtures
├── functions/src/
│   ├── auth/                # owner bootstrap and member authorization
│   ├── metadata/            # safe URL retrieval and preview normalization
│   ├── agents/              # API-key lifecycle and bearer authentication
│   ├── api/                 # versioned agent HTTP routes
│   ├── shared/              # Admin SDK, schemas, errors, rate limits
│   └── index.ts             # exported Firebase functions
├── test/rules/              # Firestore and Storage security tests
├── e2e/                     # Playwright emulator journeys
├── firestore.rules          # database authorization
├── storage.rules            # upload authorization
├── firestore.indexes.json   # required compound indexes
├── firebase.json            # Hosting, Functions, rules, and emulators
└── README.md                # setup, tests, owner flow, deployment, agent use
```

---

### Task 1: Project foundation and verified toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.firebaserc`
- Create: `firebase.json`
- Create: `firestore.indexes.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/test/setup.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: Firebase project configuration from `Firebase.md`.
- Produces: `App(): JSX.Element`, root scripts `dev`, `build`, `test`, `test:rules`, `test:e2e`, and `emulators`.

- [ ] **Step 1: Write the failing application smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("renders the product identity", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /second brain/i })).toBeVisible();
});
```

- [ ] **Step 2: Create the package and tool configuration**

Use exact runtime dependencies `react@19.2.8`, `react-dom@19.2.8`, `firebase@12.17.1`, `zod@4.4.3`, and `lucide-react@1.31.0`. Use exact development dependencies `vite@8.2.1`, `@vitejs/plugin-react@6.0.5`, `typescript@7.0.2`, `vitest@4.1.10`, `jsdom@30.0.1`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@7.0.1`, `@testing-library/user-event@14.6.4`, `@playwright/test@1.62.1`, `@firebase/rules-unit-testing@5.0.1`, and `firebase-tools@15.27.0`.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:rules": "firebase emulators:exec --only firestore,storage \"vitest run test/rules\"",
    "test:e2e": "playwright test",
    "emulators": "firebase emulators:start",
    "deploy": "firebase deploy"
  }
}
```

- [ ] **Step 3: Create Firebase and emulator configuration**

Set `.firebaserc` default project to `shared-space-cca50`. Configure Hosting to serve `dist` with SPA rewrites, Functions from `functions`, Firestore rules/indexes, Storage rules, and emulator ports Auth `9099`, Functions `5001`, Firestore `8080`, Hosting `5000`, Storage `9199`, UI `4000`.

- [ ] **Step 4: Implement the smallest visible app**

```tsx
export function App() {
  return (
    <main>
      <p>Private creative workspace</p>
      <h1>Second Brain</h1>
    </main>
  );
}
```

- [ ] **Step 5: Install packages and run the smoke test**

Run: `npm install`  
Run: `npm test -- src/app/App.test.tsx`  
Expected: one passing smoke test.

- [ ] **Step 6: Run the first production build**

Run: `npm run build`  
Expected: TypeScript succeeds and Vite creates `dist/`.

- [ ] **Step 7: Commit the foundation**

```powershell
git add package.json package-lock.json tsconfig.json tsconfig.app.json vite.config.ts vitest.config.ts index.html .gitignore .firebaserc firebase.json firestore.indexes.json src
git commit -m "build: establish Firebase web app foundation"
```

---

### Task 2: Domain schemas and pure library behavior

**Files:**
- Create: `src/domain/idea.ts`
- Create: `src/domain/category.ts`
- Create: `src/domain/member.ts`
- Create: `src/domain/source.ts`
- Create: `src/domain/libraryQuery.ts`
- Test: `src/domain/source.test.ts`
- Test: `src/domain/libraryQuery.test.ts`

**Interfaces:**
- Consumes: Zod 4.4.3.
- Produces: `Idea`, `IdeaInput`, `Category`, `Member`, `SourceType`, `detectSourceType(url)`, and `queryIdeas(ideas, query)`.

- [ ] **Step 1: Write failing source-detection tests**

```ts
expect(detectSourceType("https://youtu.be/abc")).toBe("youtube");
expect(detectSourceType("https://x.com/user/status/1")).toBe("x");
expect(detectSourceType("https://www.instagram.com/p/abc/")).toBe("instagram");
expect(detectSourceType("https://example.com/story")).toBe("article");
```

- [ ] **Step 2: Define exact idea and category schemas**

```ts
export const sourceTypeSchema = z.enum([
  "youtube", "x", "instagram", "article", "image", "reference",
  "reaction", "hook", "note", "other"
]);

export const ideaInputSchema = z.object({
  kind: z.enum(["link", "image", "note"]),
  sourceType: sourceTypeSchema,
  url: z.string().url().nullable(),
  title: z.string().trim().max(240),
  note: z.string().trim().max(10_000),
  creatorName: z.string().trim().max(160).nullable(),
  categoryIds: z.array(z.string().min(1)).max(20),
  filmDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
});
```

- [ ] **Step 3: Implement deterministic source detection**

Normalize the hostname, strip `www.`, map `youtube.com` and `youtu.be` to `youtube`, `x.com` and `twitter.com` to `x`, and `instagram.com` to `instagram`. Other HTTP(S) URLs map to `article`.

- [ ] **Step 4: Write failing search/filter/sort tests**

Cover case-insensitive title and note search, category intersection, source filtering, planned/unplanned/overdue film dates, newest/oldest/upcoming sorting, and missing optional fields.

```ts
const result = queryIdeas(fixtures, {
  text: "launch",
  categoryIds: ["strategy"],
  sourceTypes: ["youtube"],
  filmDateState: "planned",
  sort: "upcoming",
  today: "2026-08-15"
});
expect(result.map((idea) => idea.id)).toEqual(["matching-idea"]);
```

- [ ] **Step 5: Implement `queryIdeas` as a pure function**

Build a lowercase search document from title, note, creator name, source name, URL, and category names. Apply filters before a stable sort. Treat date-only strings lexicographically to avoid timezone shifts.

- [ ] **Step 6: Run domain tests**

Run: `npm test -- src/domain`  
Expected: all source, validation, search, filter, and sort cases pass.

- [ ] **Step 7: Commit domain behavior**

```powershell
git add src/domain
git commit -m "feat: define idea domain and library querying"
```

---

### Task 3: Firebase client, Functions foundation, and Google access gate

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/features/auth/AuthProvider.tsx`
- Create: `src/features/auth/SignInScreen.tsx`
- Create: `src/features/auth/AccessGate.tsx`
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/shared/firebaseAdmin.ts`
- Create: `functions/src/auth/ensureMemberProfile.ts`
- Create: `functions/src/index.ts`
- Create: `firestore.rules`
- Test: `src/features/auth/AccessGate.test.tsx`
- Test: `test/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: Firebase config from `Firebase.md`; workspace ID `main`; owner email constant.
- Produces: `useAuth()`, `signInWithGoogle()`, callable `ensureMemberProfile`, and active-member Firestore rule helpers.

- [ ] **Step 1: Write failing access-gate component tests**

Test loading, signed-out, unauthorized, member, and owner states. The unauthorized state must show the signed-in email and a sign-out action but no library content.

- [ ] **Step 2: Initialize the modular Firebase client**

Create `app`, `auth`, `db`, `storage`, and `functions` exports with the supplied public web configuration. When `VITE_USE_FIREBASE_EMULATORS=true`, connect once to Auth `9099`, Firestore `8080`, Storage `9199`, and Functions `5001`.

- [ ] **Step 3: Implement Google authentication**

Use `GoogleAuthProvider`. Use popup sign-in on desktop and redirect fallback when popup is blocked. Observe auth state with `onAuthStateChanged`; do not store Google OAuth access tokens.

- [ ] **Step 4: Create the Functions workspace**

Use exact dependencies `firebase-admin@14.2.0`, `firebase-functions@7.3.2`, and `zod@4.4.3`; set `engines.node` to `22`; compile TypeScript to `functions/lib`.

- [ ] **Step 5: Implement server-side owner bootstrap**

`ensureMemberProfile` must:

```ts
const OWNER_EMAIL = "ayushamitjain@gmail.com";
const WORKSPACE_ID = "main";
```

Require Firebase Authentication and a verified email. In a Firestore transaction, create the workspace and owner member only when the normalized email equals `OWNER_EMAIL`. For any other email, create membership only when a matching `memberInvites/{normalizedEmail}` document exists. Otherwise return `{ status: "unauthorized" }` without creating access.

- [ ] **Step 6: Write failing Firestore rule tests**

Verify unauthenticated and unapproved users cannot read ideas; active members can read/write ideas and categories; only owners can read/write invites and agent-key records; removed members immediately lose access.

- [ ] **Step 7: Implement Firestore rule helpers**

```rules
function memberPath() {
  return /databases/$(database)/documents/workspaces/main/members/$(request.auth.uid);
}
function isMember() {
  return request.auth != null && exists(memberPath());
}
function isOwner() {
  return isMember() && get(memberPath()).data.role == "owner";
}
```

Validate allowed top-level idea/category fields and deny all unmatched paths.

- [ ] **Step 8: Run auth and rules tests**

Run: `npm test -- src/features/auth`  
Run: `npm run test:rules`  
Expected: owner/member/unauthorized matrices pass.

- [ ] **Step 9: Commit authentication and authorization**

```powershell
git add src/lib src/features/auth functions firestore.rules test/rules package.json package-lock.json
git commit -m "feat: secure Google sign-in and workspace access"
```

---

### Task 4: Editorial design system and masonry library

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/components.css`
- Create: `src/components/Button.tsx`
- Create: `src/components/Modal.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/features/ideas/IdeaCard.tsx`
- Create: `src/features/ideas/IdeaGrid.tsx`
- Create: `src/features/ideas/LibraryScreen.tsx`
- Create: `src/test/ideaFixtures.ts`
- Test: `src/features/ideas/IdeaCard.test.tsx`
- Test: `src/features/ideas/LibraryScreen.test.tsx`

**Interfaces:**
- Consumes: `Idea` domain type and auth state.
- Produces: `IdeaCard({ idea, onOpen })`, `IdeaGrid({ ideas, onOpen })`, and `LibraryScreen`.

- [ ] **Step 1: Write failing card and empty-library tests**

Assert rich cards expose source, title, attribution, categories, and film date. Assert note-only cards do not render empty image containers. Assert zero ideas shows a welcoming save-first-idea state.

- [ ] **Step 2: Define visual tokens**

```css
:root {
  --ink-950: #071218;
  --ink-900: #0b1921;
  --ink-800: #122630;
  --ivory-100: #f4efe6;
  --stone-300: #b8b2a8;
  --amber-400: #d5a65a;
  --glass: rgba(18, 38, 48, 0.64);
  --glass-border: rgba(244, 239, 230, 0.12);
  --shadow-card: 0 22px 70px rgba(0, 0, 0, 0.28);
  --radius-card: 24px;
}
```

Use a bundled/system-safe editorial font stack, fluid type with `clamp`, a maximum content width, and reduced-motion overrides.

- [ ] **Step 3: Build accessible UI primitives**

Buttons expose loading and disabled states. Modal uses `role="dialog"`, labelled title, Escape close, focus trapping, and focus restoration. Empty state accepts title, description, and action.

- [ ] **Step 4: Build masonry cards**

Use responsive CSS columns with `break-inside: avoid`, one column on small screens, two on medium screens, and three or four on wide screens. Use real `<img>` elements with useful alt text, lazy loading, and aspect-ratio-aware containers.

- [ ] **Step 5: Compose the library shell**

Create a quiet header with product mark, search area placeholder, save action, and profile action. Keep primary content visual; do not add metrics, charts, or a dashboard sidebar.

- [ ] **Step 6: Run UI tests and production build**

Run: `npm test -- src/features/ideas src/components`  
Run: `npm run build`  
Expected: card states, empty state, accessibility roles, and build pass.

- [ ] **Step 7: Commit the visual library**

```powershell
git add src/styles src/components src/app src/features/ideas src/test
git commit -m "feat: create editorial masonry idea library"
```

---

### Task 5: Firestore idea CRUD, composer, detail editor, categories, and film dates

**Files:**
- Create: `src/features/ideas/ideaRepository.ts`
- Create: `src/features/ideas/useIdeas.ts`
- Create: `src/features/ideas/IdeaComposer.tsx`
- Create: `src/features/ideas/IdeaDetail.tsx`
- Create: `src/features/categories/categoryRepository.ts`
- Create: `src/features/categories/CategoryPicker.tsx`
- Create: `src/features/filters/LibraryControls.tsx`
- Modify: `src/features/ideas/LibraryScreen.tsx`
- Test: `src/features/ideas/IdeaComposer.test.tsx`
- Test: `src/features/ideas/IdeaDetail.test.tsx`
- Test: `src/features/filters/LibraryControls.test.tsx`

**Interfaces:**
- Consumes: `IdeaInput`, `queryIdeas`, authenticated user, Firestore.
- Produces: `subscribeToIdeas`, `createIdea`, `updateIdea`, `deleteIdea`, `subscribeToCategories`, `createCategory`, and interactive library flows.

- [ ] **Step 1: Write failing composer tests**

Cover URL, image, and note entry modes; optional title/note; no pre-existing categories; new-category creation; optional `YYYY-MM-DD` film date; submit disabled for an empty composer; one submission per click.

- [ ] **Step 2: Implement Firestore repositories**

Use `onSnapshot` ordered by `createdAt desc`. Create server timestamps and actor UIDs in the repository. Store film dates as date-only strings in the client model and convert them explicitly at the Firestore boundary. Use batched writes to keep idea `categoryIds` and `categoryNames` synchronized.

- [ ] **Step 3: Implement the three-mode composer**

For URL mode, detect source type and save with `metadataStatus: "pending"`. For image mode, wait for Task 6 upload integration and temporarily require an injected `uploadImage` interface. For note mode, set `metadataStatus: "not_required"` and render the note as the visual content.

- [ ] **Step 4: Write failing detail-editor tests**

Assert title, note, attribution, category, and film-date edits persist; source opens safely in a new tab; clearing a date stores `null`; delete requires confirmation; cancel preserves content.

- [ ] **Step 5: Implement detail editing and deletion**

Use a draft state, explicit Save button, close confirmation only when dirty, and a separate destructive confirmation. Preserve the original source URL unless the user explicitly edits it.

- [ ] **Step 6: Implement categories without seeding**

`CategoryPicker` lists snapshot data, supports trimmed case-insensitive unique creation, and never creates a category as a side effect of loading. Category deletion removes assignments through a callable server operation to keep denormalized names consistent.

- [ ] **Step 7: Connect library search, filters, and sorting**

Bind `LibraryControls` to `queryIdeas`; include text, category, source, film-date state, and sort. Show a reset action and an intentional no-results state distinct from an empty library.

- [ ] **Step 8: Run CRUD and filtering tests**

Run: `npm test -- src/features/ideas src/features/categories src/features/filters`  
Expected: create/edit/delete/category/date/search/filter/sort paths pass.

- [ ] **Step 9: Commit the interactive library**

```powershell
git add src/features/ideas src/features/categories src/features/filters
git commit -m "feat: add idea capture editing categories and film dates"
```

---

### Task 6: Image uploads and Storage authorization

**Files:**
- Create: `src/features/ideas/imageUpload.ts`
- Create: `src/components/ImageDropzone.tsx`
- Create: `storage.rules`
- Modify: `src/features/ideas/IdeaComposer.tsx`
- Modify: `src/features/ideas/IdeaDetail.tsx`
- Test: `src/components/ImageDropzone.test.tsx`
- Test: `test/rules/storage.rules.test.ts`

**Interfaces:**
- Consumes: authenticated member and Firebase Storage.
- Produces: `uploadIdeaImage({ workspaceId, ideaId, file })` returning `{ path, downloadUrl }`.

- [ ] **Step 1: Write failing upload validation tests**

Accept JPEG, PNG, WebP, and GIF images up to 10 MiB. Reject other MIME types, empty files, and larger files with plain-language messages.

- [ ] **Step 2: Implement image validation and upload paths**

Use `workspaces/main/ideas/{ideaId}/{crypto.randomUUID()}-{safeName}`. Show upload progress, allow retry, and write `customImagePath` plus resolved URL only after a successful upload.

- [ ] **Step 3: Write failing Storage rule tests**

Verify active members can read/write approved images inside `workspaces/main/ideas`; unauthenticated, unapproved, and removed users cannot read or write; non-image and over-10-MiB writes fail; unmatched paths fail.

- [ ] **Step 4: Implement Storage rules**

Use a Firestore membership lookup in rules and validate `request.resource.contentType.matches('image/(jpeg|png|webp|gif)')` plus `request.resource.size < 10 * 1024 * 1024`.

- [ ] **Step 5: Integrate upload and replacement controls**

Composer image mode creates the Firestore idea ID first, uploads the file, then completes the idea. If upload fails, remove the incomplete document. Detail replacement preserves the previous image until the new upload succeeds, then deletes the old owned file.

- [ ] **Step 6: Run upload and Storage tests**

Run: `npm test -- src/components/ImageDropzone.test.tsx`  
Run: `npm run test:rules`  
Expected: client validation and Storage authorization pass.

- [ ] **Step 7: Commit uploads**

```powershell
git add src/components/ImageDropzone.tsx src/features/ideas storage.rules test/rules
git commit -m "feat: support secure idea image uploads"
```

---

### Task 7: Safe metadata ingestion and rich previews

**Files:**
- Create: `functions/src/metadata/urlSafety.ts`
- Create: `functions/src/metadata/fetchPage.ts`
- Create: `functions/src/metadata/providers.ts`
- Create: `functions/src/metadata/normalizeMetadata.ts`
- Create: `functions/src/metadata/enrichIdea.ts`
- Modify: `functions/src/index.ts`
- Modify: `src/features/ideas/ideaRepository.ts`
- Test: `functions/src/metadata/urlSafety.test.ts`
- Test: `functions/src/metadata/providers.test.ts`
- Test: `functions/src/metadata/enrichIdea.test.ts`

**Interfaces:**
- Consumes: idea URL and authenticated member or trusted server trigger.
- Produces: callable `enrichIdea({ ideaId })` and normalized `PreviewMetadata`.

- [ ] **Step 1: Write failing URL-safety tests**

Reject non-HTTP protocols, embedded credentials, localhost, `.local`, loopback, link-local, private IPv4 and IPv6 ranges, unsafe redirect targets, more than five redirects, bodies over 2 MiB, and responses exceeding an eight-second timeout.

- [ ] **Step 2: Implement safe URL validation**

Resolve every hostname before fetch and reject if any resolved address is private or reserved. Revalidate every redirect. Allow only ports 80 and 443. Send a descriptive user agent and accept HTML/JSON responses needed for public metadata.

- [ ] **Step 3: Write failing provider tests**

Use saved test fixtures for YouTube oEmbed-style data, Open Graph article HTML, X/Instagram restricted pages, missing images, malformed metadata, and relative image URLs. No test reaches the live internet.

- [ ] **Step 4: Implement provider normalization**

Use YouTube public oEmbed for title, author/channel, and thumbnail when permitted. For normal pages, parse Open Graph, Twitter Card, `<title>`, canonical URL, and site name with Cheerio 1.2.0. For X and Instagram, use public embed/Open Graph data when accessible and return a source-specific fallback when restricted.

- [ ] **Step 5: Implement the enrichment function**

Require active membership for callable requests. Transactionally change `pending` to `ready` with sanitized fields or `failed` with one of `blocked`, `not_found`, `timeout`, `unsafe_url`, `unsupported`, or `invalid_response`. Preserve user-edited title, attribution, or custom image by tracking manual override fields.

- [ ] **Step 6: Connect enrichment to create and retry flows**

After a link idea is created, call `enrichIdea({ ideaId })`. Retry reuses the same idea. The UI observes status changes, displays a skeleton while pending, and exposes manual fields on failure.

- [ ] **Step 7: Run metadata and integration tests**

Run: `npm --prefix functions test -- metadata`  
Run: `npm test -- src/features/ideas`  
Expected: safe URL handling, provider normalization, and pending/ready/failed UI pass.

- [ ] **Step 8: Commit metadata ingestion**

```powershell
git add functions/src/metadata functions/src/index.ts src/features/ideas
git commit -m "feat: enrich links with safe rich metadata"
```

---

### Task 8: Owner-managed team membership

**Files:**
- Create: `functions/src/auth/manageMember.ts`
- Create: `src/features/members/memberRepository.ts`
- Create: `src/features/members/MemberSettings.tsx`
- Modify: `functions/src/index.ts`
- Modify: `src/app/AppShell.tsx`
- Test: `functions/src/auth/manageMember.test.ts`
- Test: `src/features/members/MemberSettings.test.tsx`

**Interfaces:**
- Consumes: authenticated owner, normalized email.
- Produces: callable `inviteMember({ email })`, `removeMember({ uid, email })`, and member settings UI.

- [ ] **Step 1: Write failing authorization and validation tests**

Verify only the owner can list invites, add an invitation, or remove a member; invalid emails fail; owner self-removal fails; duplicate normalized emails are idempotent; removing an invite or active member blocks future access.

- [ ] **Step 2: Implement member callables**

Normalize email with `trim().toLowerCase()`. `inviteMember` upserts `memberInvites/{normalizedEmail}`. `removeMember` deletes the invite and any active member record matching that email in a bounded transaction. Never accept a client-supplied role of `owner`.

- [ ] **Step 3: Build owner-only member settings**

Show active accounts and pending allowed emails, with add and remove actions. Members do not receive a hidden-but-callable owner interface; the component is absent and server functions still enforce owner status.

- [ ] **Step 4: Run team-access tests**

Run: `npm --prefix functions test -- auth`  
Run: `npm test -- src/features/members`  
Run: `npm run test:rules`  
Expected: owner-only membership administration passes across UI, function, and rules layers.

- [ ] **Step 5: Commit team management**

```powershell
git add functions/src/auth src/features/members functions/src/index.ts src/app firestore.rules test/rules
git commit -m "feat: add owner-managed team access"
```

---

### Task 9: Agent credentials and versioned agent API

**Files:**
- Create: `functions/src/agents/token.ts`
- Create: `functions/src/agents/createAgentKey.ts`
- Create: `functions/src/agents/revokeAgentKey.ts`
- Create: `functions/src/agents/authenticateAgent.ts`
- Create: `functions/src/api/schemas.ts`
- Create: `functions/src/api/ideas.ts`
- Create: `functions/src/api/categories.ts`
- Create: `functions/src/api/agentApi.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/agents/token.test.ts`
- Test: `functions/src/api/agentApi.test.ts`

**Interfaces:**
- Consumes: owner authentication for key lifecycle; `Authorization: Bearer sb_live_<id>_<secret>` for API calls.
- Produces: callable `createAgentKey`, callable `revokeAgentKey`, and HTTPS function `agentApi` with `/v1` routes.

- [ ] **Step 1: Write failing token-lifecycle tests**

Verify a token has at least 256 bits of randomness, raw token is returned once, persisted record contains only prefix and HMAC-SHA-256 digest, invalid comparison fails, revoked key fails, and successful use updates `lastUsedAt` without blocking the response.

- [ ] **Step 2: Implement one-time agent credentials**

Generate `keyId` and 32 random bytes with Node `crypto`. Format the raw token as `sb_live_{keyId}_{base64urlSecret}`. Compute an HMAC-SHA-256 digest using a Functions secret named `AGENT_TOKEN_PEPPER`. Compare digests with `timingSafeEqual`.

- [ ] **Step 3: Implement owner-only key callables**

`createAgentKey({ name })` validates a 1–80 character name, creates an active record with fixed v1 scopes, and returns `{ keyId, token, name, createdAt }`. `revokeAgentKey({ keyId })` marks the key revoked. Neither callable can reveal an existing token.

- [ ] **Step 4: Write failing API contract tests**

Cover:

```text
GET    /v1/health
GET    /v1/ideas?q=&categoryId=&sourceType=&filmDateState=&limit=&cursor=
POST   /v1/ideas
GET    /v1/ideas/:ideaId
PATCH  /v1/ideas/:ideaId
DELETE /v1/ideas/:ideaId
POST   /v1/ideas/:ideaId/enrich
GET    /v1/categories
POST   /v1/categories
PATCH  /v1/categories/:categoryId
DELETE /v1/categories/:categoryId
```

Assert health returns no private data; all other routes reject missing, malformed, unknown, and revoked tokens; validation errors return safe JSON; delete requires an exact ID; pagination is bounded to 100 items.

- [ ] **Step 5: Implement API schemas and handlers**

Reuse the domain field names in Zod server schemas. Preserve URL and manual overrides on partial update. Agent-created ideas record `actorType: "agent"` and `actorId: keyId`. Category creation enforces normalized uniqueness. Category deletion requires `?removeAssignments=true` when the category is in use.

- [ ] **Step 6: Implement HTTPS middleware**

Set JSON responses, a 256 KiB request limit, narrow methods, safe request IDs, bearer authentication, per-key rate limiting, and error mapping without stack traces. Do not enable permissive browser CORS because agents are server-side clients.

- [ ] **Step 7: Run agent security and API tests**

Run: `npm --prefix functions test -- agents api`  
Expected: token lifecycle, auth failures, CRUD, validation, pagination, rate limits, and revocation pass.

- [ ] **Step 8: Commit agent backend**

```powershell
git add functions/src/agents functions/src/api functions/src/index.ts
git commit -m "feat: provide secure agent credentials and API"
```

---

### Task 10: Profile, agent instruction block, and credential UX

**Files:**
- Create: `src/features/agents/agentRepository.ts`
- Create: `src/features/agents/AgentKeyManager.tsx`
- Create: `src/features/agents/buildAgentInstructions.ts`
- Create: `src/features/agents/AgentInstructions.tsx`
- Create: `src/features/auth/ProfileSettings.tsx`
- Modify: `src/app/AppShell.tsx`
- Test: `src/features/agents/buildAgentInstructions.test.ts`
- Test: `src/features/agents/AgentKeyManager.test.tsx`

**Interfaces:**
- Consumes: `createAgentKey`, `revokeAgentKey`, deployed API base URL.
- Produces: owner profile controls and `buildAgentInstructions({ apiBaseUrl, token, workspaceName })`.

- [ ] **Step 1: Write failing instruction-block tests**

Assert the Markdown includes API URL, bearer token, read/create/update/category/date operations, no-default-category rule, source-preservation rule, date format, deletion caution, and credential secrecy warning. Assert it contains no fabricated credentials when token is absent.

- [ ] **Step 2: Implement deterministic Markdown generation**

Generate a self-contained instruction block suitable for Codex or Claude Code. Use concrete `curl` examples with the real generated token only in the one-time view. Existing key rows show only name, prefix, dates, status, revoke, and regenerate actions.

- [ ] **Step 3: Write failing credential-manager tests**

Cover owner-only rendering, name validation, one-time token reveal, copy success/failure, closing the reveal, revocation confirmation, regeneration, and inability to reveal an old token.

- [ ] **Step 4: Implement profile settings**

Combine identity, sign-out, member settings, and agent-key management in a calm settings sheet. Keep raw tokens in component memory only; clear them on close, navigation, sign-out, or page reload.

- [ ] **Step 5: Run profile and credential tests**

Run: `npm test -- src/features/agents src/features/auth/ProfileSettings.test.tsx`  
Expected: instruction content and secure one-time UX pass.

- [ ] **Step 6: Commit agent profile experience**

```powershell
git add src/features/agents src/features/auth/ProfileSettings.tsx src/app
git commit -m "feat: add copyable agent access instructions"
```

---

### Task 11: End-to-end emulator journeys, accessibility, and visual QA

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/library.spec.ts`
- Create: `e2e/access.spec.ts`
- Create: `e2e/agent-api.spec.ts`
- Create: `scripts/seed-emulator.mjs`
- Modify: `src/styles/global.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: complete client, rules, functions, and emulators.
- Produces: reproducible automated journeys and verified responsive UI.

- [ ] **Step 1: Write failing owner/member access journeys**

Use the Auth emulator to create owner, approved member, and unauthorized identities. Assert owner and member enter the library, unauthorized identity sees no private data, owner settings exist only for owner, and removed member access fails after refresh.

- [ ] **Step 2: Write failing content journeys**

Cover creating a note, saving a mocked YouTube link, uploading an image, editing a note, creating the first category, assigning it, setting and clearing film date, searching, filtering, sorting, manual preview fallback, and confirmed deletion.

- [ ] **Step 3: Write failing agent journeys**

Create a test key through the owner callable, use the API to create/search/update/date/categorize/delete an idea, revoke the key, and assert the same bearer credential then receives `401` without private response data.

- [ ] **Step 4: Make emulator execution deterministic**

Run emulators with project ID `shared-space-cca50`, clear Firestore/Auth/Storage between suites, mock external metadata fixtures inside the Functions emulator, and avoid any production Firebase writes.

- [ ] **Step 5: Run complete automated verification**

Run: `npm test`  
Run: `npm --prefix functions test`  
Run: `npm run test:rules`  
Run: `npm run test:e2e`  
Run: `npm run build`  
Expected: all unit, component, rules, function, end-to-end tests, and production build pass.

- [ ] **Step 6: Perform visual browser verification**

Inspect widths 390, 768, 1280, and 1536 pixels. Verify masonry balance, image cropping, note-only cards, long titles, empty categories, pending/failed metadata, modal focus, keyboard navigation, reduced motion, contrast, and no horizontal overflow. Save screenshots under `artifacts/visual-qa/` and exclude them from production output.

- [ ] **Step 7: Fix only verified QA findings and rerun affected checks**

For each finding, record the failing state, change the focused component or style, rerun its test, and repeat the relevant viewport check. Finish by rerunning `npm test` and `npm run build`.

- [ ] **Step 8: Commit verified application behavior**

```powershell
git add playwright.config.ts e2e scripts package.json package-lock.json src
git commit -m "test: verify complete second brain journeys"
```

---

### Task 12: Operational documentation and deployment readiness

**Files:**
- Create: `.env.example`
- Create: `functions/.secret.local.example`
- Create: `README.md`
- Create: `docs/agent-api.md`
- Modify: `.gitignore`
- Modify: `Firebase.md`

**Interfaces:**
- Consumes: finished app, CLI scripts, Firebase project settings.
- Produces: repeatable local setup, testing, deployment, owner bootstrap, and agent API operation.

- [ ] **Step 1: Write the setup documentation**

Document Node.js 22 for Functions, `npm install`, `npm --prefix functions install`, emulator prerequisites, Google provider/authorized-domain checks, project ID, local environment values, and the exact local commands. Explain that Firebase browser configuration is public configuration and that authorization is enforced by Auth, rules, and Functions.

- [ ] **Step 2: Write deployment and secret setup**

Document authenticated Firebase CLI check, Blaze-plan requirement for Cloud Functions deployment, `firebase functions:secrets:set AGENT_TOKEN_PEPPER`, rules/index deployment, Functions deployment, Hosting deployment, and post-deploy owner sign-in. Never place the real pepper or an agent token in documentation.

- [ ] **Step 3: Write the agent API reference**

Document every `/v1` route, bearer header, request/response schemas, pagination, safe error codes, category rules, film-date `YYYY-MM-DD` format, deletion semantics, rate limits, and revocation behavior.

- [ ] **Step 4: Reframe `Firebase.md` as safe configuration documentation**

Preserve every configuration value supplied by the owner. Wrap the existing snippet in a JavaScript code fence and add only a short note that it is web configuration rather than an authorization secret; point to the rules and server credential setup without including any secret.

- [ ] **Step 5: Run the final clean verification**

Run: `npm ci`  
Run: `npm --prefix functions ci`  
Run: `npm test`  
Run: `npm --prefix functions test`  
Run: `npm run test:rules`  
Run: `npm run test:e2e`  
Run: `npm run build`  
Run: `git status --short`  
Expected: all checks pass; only intentional documentation or source changes are present; no raw credentials or secrets appear in tracked files.

- [ ] **Step 6: Commit documentation and deployment readiness**

```powershell
git add .env.example functions/.secret.local.example README.md docs/agent-api.md Firebase.md .gitignore
git commit -m "docs: add setup agent API and deployment guide"
```

## Final completion gate

Before reporting completion:

- Confirm every acceptance criterion in the approved design has an implementation and verification result.
- Confirm `my idea.md` has not been weakened or replaced by implementation assumptions.
- Confirm the library starts with zero categories.
- Confirm an absent or revoked agent credential cannot read private data.
- Confirm `ayushamitjain@gmail.com` is the only bootstrap owner.
- Confirm the production build, unit tests, function tests, rules tests, and end-to-end tests pass from a clean install.
- Confirm browser screenshots show the intended premium editorial experience on desktop and mobile.
- Report deployment separately from build completion; do not claim production deployment unless Firebase CLI returns success for the supplied project.
