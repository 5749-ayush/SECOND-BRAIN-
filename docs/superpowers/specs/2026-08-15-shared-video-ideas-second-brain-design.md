# Shared Video Ideas Second Brain — Product and Technical Design

**Date:** 2026-08-15  
**Status:** Approved design, awaiting written-spec review  
**Product owner:** `ayushamitjain@gmail.com`

## 1. Source of truth

The product brief in `my idea.md` is the source of truth. This specification translates every requirement in that brief into a buildable Firebase-native application. Supporting behavior may be added only when it is necessary for security, reliability, accessibility, or operation of a stated requirement.

## 2. Product goal

Build a private, shared visual second brain where a team can collect anything that could become future video content. Humans use a premium, calm visual library. Authorized agents use a structured, credential-protected API to read and modify the same information.

The app must feel like a private creative operating system rather than an admin dashboard or spreadsheet.

## 3. Required outcomes

The first release must provide:

- A responsive masonry library of glassmorphic, image-led cards.
- Saving of YouTube, X/Twitter, Instagram, article, image, reference, reaction, hook, and loose-idea content.
- Best-effort automatic metadata and rich previews for links.
- Manual preview editing and image replacement when a source blocks extraction.
- Manually or agent-created categories, with no categories created by default.
- An optional planned film date on every idea.
- Search, filtering, and useful sorting.
- Google sign-in and an owner-managed member allowlist.
- Firebase-backed database, file storage, authentication, server functions, and hosting.
- A secure agent API with revocable credentials.
- A copyable profile instruction block that teaches Codex, Claude Code, or another capable agent how to use the API.

## 4. Scope boundaries

### Included in v1

- One shared workspace.
- Owner and member roles.
- Google sign-in.
- URL, text, and image-based ideas.
- Rich preview extraction and graceful manual fallback.
- Category and film-date management.
- Secure read/write agent operations.
- Desktop, tablet, and mobile layouts.
- Firebase emulator and browser verification.

### Not included in v1

- Multiple independent workspaces.
- Public sharing pages.
- Comments, reactions between teammates, or approval workflows.
- AI-generated summaries, automatic category suggestions, or automatic category creation.
- Native mobile applications.
- Paid third-party metadata services.
- A calendar product separate from the film-date field and filters.

These exclusions keep the first release focused on the exact creative-library and agent-memory goal.

## 5. Architecture

The app uses a Firebase-native architecture:

- **Web client:** React, TypeScript, and Vite.
- **Design layer:** Focused CSS design system with responsive masonry layout and restrained motion.
- **Authentication:** Firebase Authentication with Google sign-in.
- **Database:** Cloud Firestore.
- **File storage:** Firebase Storage.
- **Backend:** TypeScript Firebase Cloud Functions.
- **Hosting:** Firebase Hosting.
- **Local verification:** Firebase Emulator Suite.

The system is divided into three bounded parts:

1. **Human application:** sign-in, visual library, save/edit flows, search and filters, member management, and agent credential management.
2. **Metadata ingestion:** validates URLs, retrieves permitted public metadata, sanitizes results, and updates preview state.
3. **Agent API:** validates bearer credentials and exposes narrowly scoped operations over ideas and categories.

The boundaries allow a specialist metadata provider to be added later without redesigning the web app, database, or agent API.

## 6. Visual direction

The visual language is calm, premium, and editorial:

- Deep ink-blue background rather than pure black.
- Warm ivory primary text.
- Muted stone secondary text.
- Restrained amber accent for selection and important actions.
- Frosted translucent surfaces with subtle borders, blur, and soft depth.
- Large preview imagery with varied card heights in a masonry composition.
- Generous spacing and minimal chrome.
- Clear typography and quiet motion.
- No generic dashboard sidebar, dense tables, bright gradients, or excessive metrics.

The interface must remain usable with reduced motion, keyboard navigation, visible focus states, sufficient contrast, and descriptive control labels.

## 7. Human experience

### 7.1 Authentication and authorization

- Google is the only sign-in method in v1.
- `ayushamitjain@gmail.com` is the sole bootstrap owner.
- A matching authenticated email receives owner access after server-side validation.
- No other signed-in account can read workspace data until the owner adds its email to the member allowlist.
- The owner can add, remove, and view members.
- Members can manage ideas and categories but cannot manage members or agent credentials.
- Removed members lose access at the security-rules layer, not only in the interface.

### 7.2 Library

The primary screen is an image-led masonry grid. Each idea card may display:

- Preview image, uploaded screenshot, or a refined source-specific fallback.
- Title.
- Source type.
- Creator, channel, publication, or source host where available.
- User note excerpt.
- Assigned categories.
- Planned film date.
- Original source indication.

Cards must not reserve empty visual areas for missing optional data. Cards without source imagery use a designed typographic treatment so loose ideas still feel intentional.

### 7.3 Save flow

The primary “Save an idea” action opens a focused composer with three entry modes:

- Paste a URL.
- Upload a screenshot or reference image.
- Write a loose idea.

The form supports an optional title, note, existing categories, newly created categories, and planned film date. Categories remain empty unless a human or agent explicitly creates one.

For a URL, the idea is saved immediately with a `pending` preview state. The library shows a calm skeleton treatment while the backend retrieves metadata. Extraction success updates the card automatically. Extraction failure preserves the idea and exposes manual title, attribution, and image controls.

### 7.4 Search, filters, and sorting

The library supports:

- Client-side text search over the currently loaded workspace collection.
- Category filters.
- Source-type filters.
- Film-date states: any date, planned, unplanned, and overdue.
- Sorting by newest, oldest, and nearest upcoming film date.

Text search covers title, note, creator/channel, source name, URL, and denormalized category names. A hosted search product is deliberately excluded from v1 because this is a private team library; the search layer will remain replaceable if the collection later becomes too large for client-side search.

### 7.5 Idea detail and editing

Selecting a card opens a responsive detail panel or full-screen mobile sheet. Authorized users can:

- View the full preview and metadata.
- Open the original source in a new tab.
- Edit title, note, creator/attribution, and source type.
- Upload, replace, or remove a custom preview image.
- Add or remove categories.
- Set or clear the planned film date.
- Retry metadata extraction.
- Delete the idea after explicit confirmation.

### 7.6 Profile and settings

The profile area contains:

- Signed-in identity.
- Sign-out action.
- Owner-only member management.
- Owner-only agent credential management.
- Agent instruction block generation and copying.

## 8. Data design

All workspace content is scoped to a fixed v1 workspace identifier. Server timestamps are used for authoritative creation and update times.

### `workspaces/{workspaceId}`

- `name`
- `ownerUid`
- `ownerEmail`
- `createdAt`
- `updatedAt`

### `workspaces/{workspaceId}/members/{uid}`

- `email`
- `displayName`
- `photoURL`
- `role`: `owner` or `member`
- `status`: `active`
- `createdAt`
- `createdBy`

An owner-controlled email invitation/allowlist record supports authorization before the invited user has signed in.

### `workspaces/{workspaceId}/memberInvites/{normalizedEmail}`

- `email`
- `role`: `member`
- `createdAt`
- `createdBy`

### `workspaces/{workspaceId}/ideas/{ideaId}`

- `kind`: `link`, `image`, or `note`
- `sourceType`: `youtube`, `x`, `instagram`, `article`, `image`, `reference`, `reaction`, `hook`, `note`, or `other`
- `url` or `null`
- `canonicalUrl` or `null`
- `title`
- `note`
- `creatorName` or `null`
- `sourceName` or `null`
- `previewImageUrl` or `null`
- `customImagePath` or `null`
- `categoryIds`: array
- `categoryNames`: denormalized array for search display
- `filmDate`: date-only timestamp or `null`
- `metadataStatus`: `not_required`, `pending`, `ready`, or `failed`
- `metadataErrorCode` or `null`
- `metadataFetchedAt` or `null`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `workspaces/{workspaceId}/categories/{categoryId}`

- `name`
- `normalizedName`
- `color`
- `createdAt`
- `createdBy`
- `updatedAt`

No seed process creates category documents.

### `workspaces/{workspaceId}/agentKeys/{keyId}`

- `name`
- `tokenPrefix`
- `tokenHash`
- `scopes`
- `status`: `active` or `revoked`
- `createdAt`
- `createdBy`
- `lastUsedAt` or `null`
- `revokedAt` or `null`

Raw agent tokens are never stored after being returned once to the owner.

## 9. Metadata ingestion

Metadata retrieval runs only in Cloud Functions so the client does not expose server behavior or encounter browser cross-origin restrictions.

The flow is:

1. Validate and normalize the submitted URL.
2. Reject local, private-network, unsupported-protocol, oversized, redirect-loop, and unsafe destinations.
3. Identify known providers by hostname.
4. Retrieve the best permitted public metadata with time, redirect, and response-size limits.
5. Prefer provider-specific public data for YouTube and supported embed metadata.
6. Fall back to Open Graph, Twitter Card, and standard HTML metadata for normal public pages.
7. Sanitize all text and URLs.
8. Write a normalized preview to the idea.
9. Record a safe failure code without exposing internal errors.

YouTube previews should normally include thumbnail, title, channel, and URL. X and Instagram previews are best-effort because those platforms may restrict automated access. When blocked, the app provides a polished source fallback plus manual image and attribution controls. The original idea remains available regardless of metadata outcome.

Remote metadata is treated as untrusted input. The function includes server-side request forgery protections and never renders retrieved HTML.

## 10. Agent access

### 10.1 Credential lifecycle

- Only the owner can create agent credentials.
- Credential generation happens in a callable Cloud Function after Firebase Authentication and owner-role verification.
- The function generates a high-entropy token, returns it once, and stores only a strong cryptographic hash plus a short display prefix.
- The owner gives the credential a human-readable name.
- The owner can revoke a credential immediately.
- Regeneration creates a new credential and revokes the previous one.
- The UI never claims it can reveal an existing raw credential after the creation view is closed.

### 10.2 Copyable instruction block

Immediately after credential creation, the profile displays a copyable Markdown instruction block containing:

- The purpose of the second brain.
- The HTTPS API base URL.
- The bearer token.
- Supported endpoints and payload examples.
- Rules for preserving source URLs and not inventing metadata.
- Rules for categories: create or assign only when explicitly requested; never seed defaults.
- Rules for film dates and date formatting.
- A warning not to expose the credential in chat, logs, source control, or public files.

### 10.3 Agent API operations

The versioned HTTPS API supports:

- Health check without private data.
- Search/list ideas with filters and pagination.
- Read a single idea.
- Create an idea.
- Update allowed idea fields.
- Delete an idea.
- Retry link metadata.
- List categories.
- Create a category.
- Update a category.
- Delete an unused category or remove its assignments with explicit intent.

Every private request requires `Authorization: Bearer <token>`. Failed authentication returns no workspace data. Inputs are schema-validated. Writes record the agent key identifier as the actor. Destructive operations require a specific resource identifier and do not support unbounded deletion.

## 11. Security design

Security is enforced independently of the visual interface:

- Firestore rules require an active workspace member document for reads and ordinary writes.
- Owner-only collections and operations require the owner role.
- Storage rules use the same active-member check and restrict uploads to approved image MIME types and size limits.
- The bootstrap owner email is checked server-side and cannot be replaced by a client request.
- Agent API writes use Admin SDK only after credential verification and payload validation.
- Agent tokens are hashed and compared using timing-safe logic.
- Functions apply request-size limits, rate limits, structured validation, and safe error responses.
- Metadata retrieval blocks private IP ranges and unsafe redirects.
- User-provided strings render as text, not executable HTML.
- Firebase browser configuration is treated as public configuration; authorization depends on Authentication, rules, and server validation.
- Sensitive function secrets are stored through Firebase-supported server secret configuration, never committed to client code.

## 12. Error and empty states

The app provides designed states for:

- First sign-in and unauthorized account.
- Empty library.
- Empty search or filter results.
- Metadata pending, success, partial, and failure.
- Offline or interrupted writes.
- Upload validation and failure.
- Expired session.
- Revoked or invalid agent credential.
- Permission changes while the app is open.

Errors use plain language and retain the user's idea whenever safe. Retrying an operation must not create duplicate ideas.

## 13. Testing and verification

### Automated tests

- Unit tests for URL normalization, source detection, metadata normalization, date handling, search matching, and token helpers.
- Component tests for save, edit, filtering, empty states, and credential-generation views.
- Firestore rules tests for owner, member, invited, removed, and unauthenticated cases.
- Storage rules tests for membership, file type, size, and path ownership.
- Cloud Function tests for authorization, validation, metadata failure handling, and agent CRUD behavior.
- End-to-end browser tests against Firebase emulators for the main human journeys.

### Manual and visual verification

- Google sign-in configuration and owner bootstrap behavior.
- Desktop, tablet, and mobile layouts.
- Realistic collections containing mixed card types and heights.
- Keyboard navigation, focus visibility, reduced motion, contrast, and screen-size behavior.
- URL, image, and note creation.
- Category-empty initial state.
- Film-date creation, removal, filters, and sorting.
- Preview fallback and manual replacement.
- Agent instruction copying, valid access, invalid access, and revocation.
- Production build and Firebase configuration validation.

## 14. Deployment and operation

The repository will include:

- Firebase project configuration.
- Hosting configuration.
- Firestore indexes and security rules.
- Storage security rules.
- Cloud Functions source.
- Emulator configuration.
- Environment example files without secrets.
- Setup, local-run, test, deployment, and owner-bootstrap documentation.

Deployment will target the supplied Firebase project `shared-space-cca50`. Actual deployment requires a locally authenticated Firebase CLI session and any required billing support for the selected Cloud Functions runtime. The build will be completed and locally verifiable even if deployment credentials are unavailable.

## 15. Acceptance criteria

The release is accepted when:

1. The owner can sign in with Google and an unapproved account cannot access workspace data.
2. The owner can add and remove team members.
3. A user can save a URL, image, or loose idea and see it in the visual masonry library.
4. A YouTube URL produces a preview containing the best available thumbnail, title, channel, and URL.
5. X, Instagram, and article links produce the best available preview and retain a manual fallback path.
6. The library begins with zero categories.
7. Humans and authorized agents can create categories and assign them to ideas.
8. Every idea can have an optional planned film date managed by humans or authorized agents.
9. Search, category/source/date filters, and required sorting work correctly.
10. The owner can create a credential and copy an operational agent instruction block.
11. A valid agent can read and modify allowed workspace data through the API.
12. An absent, invalid, or revoked credential cannot read or modify anything.
13. Firestore and Storage rules reject unauthorized direct access.
14. The interface is responsive, accessible, visually calm, and clearly distinct from a generic admin dashboard.
15. Automated tests and the production build pass, and the main flows are visually verified in a browser.

## 16. Locked decisions

- Firebase-native architecture.
- React, TypeScript, and Vite client.
- One shared workspace in v1.
- Google sign-in only.
- Bootstrap owner: `ayushamitjain@gmail.com`.
- Owner-managed member allowlist.
- No categories by default.
- Best-effort platform metadata with manual fallback.
- No paid metadata provider in v1, with a replaceable ingestion boundary for future use.
- One-time-reveal, revocable, hashed agent credentials.
- Dark editorial visual direction with ink-blue, ivory, stone, and amber tones.
