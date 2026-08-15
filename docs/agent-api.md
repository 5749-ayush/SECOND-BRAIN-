# Agent API reference

The Agent API lets a credential-bearing agent use the same shared second brain as the human web app. It is JSON over HTTPS and is versioned under `/v1`.

## Connection

Production base URL:

```text
https://asia-south1-shared-space-cca50.cloudfunctions.net/agentApi/v1
```

Every route except health requires the exact credential generated in the owner profile:

```http
Authorization: Bearer sb_live_...
Content-Type: application/json
```

The raw credential is displayed once. A revoked or unknown credential receives `401`. Requests are limited to 256 KiB and approximately 120 authenticated requests per minute per warm Function instance.

## Idea shape

Creating an idea requires every field shown here. Categories are always explicit; use an empty array when none were requested.

```json
{
  "kind": "link",
  "sourceType": "youtube",
  "url": "https://www.youtube.com/watch?v=example",
  "title": "",
  "note": "Study the first 30 seconds",
  "creatorName": null,
  "categoryIds": [],
  "filmDate": null
}
```

Allowed `kind` values are `link`, `image`, and `note`. Allowed `sourceType` values are `youtube`, `x`, `instagram`, `article`, `image`, `reference`, `reaction`, `hook`, `note`, and `other`. Film dates use `YYYY-MM-DD` or `null`.

## Routes

### Health

`GET /health` is public and returns the API version.

### List and search ideas

`GET /ideas`

Optional query parameters:

- `q`: searches titles, notes, creators, sources, URLs, and category names.
- `categoryId`: exact category document ID.
- `sourceType`: one allowed source type.
- `filmDateState`: `planned`, `unplanned`, or `overdue`.
- `limit`: 1–100; defaults to 50.
- `cursor`: the previous response's `nextCursor` value.

Response:

```json
{
  "items": [],
  "nextCursor": null
}
```

### Create an idea

`POST /ideas` with the complete idea shape. Link ideas are saved immediately and metadata enrichment starts in the background.

### Read, edit, or delete one idea

- `GET /ideas/:ideaId`
- `PATCH /ideas/:ideaId` with one or more idea fields.
- `DELETE /ideas/:ideaId`

Deleting is permanent. Agents should search, show the exact result, and confirm the ID with the human before deletion.

### Retry metadata

`POST /ideas/:ideaId/enrich` returns `202` when enrichment has been queued.

### Categories

- `GET /categories`
- `POST /categories` with `{ "name": "Hooks", "color": "#d5a65a" }`. Color is optional.
- `PATCH /categories/:categoryId` with a new `name`, `color`, or both.
- `DELETE /categories/:categoryId?removeAssignments=true`

Deleting a category that is used by ideas returns `409` unless `removeAssignments=true` is explicitly supplied. The delete then removes the category assignment from those ideas.

## Example requests

Set these only in the current terminal; never save the token in source control:

```powershell
$agentApi = "https://asia-south1-shared-space-cca50.cloudfunctions.net/agentApi/v1"
$agentToken = "paste-the-one-time-token"
$headers = @{ Authorization = "Bearer $agentToken" }
```

Search:

```powershell
Invoke-RestMethod -Uri "$agentApi/ideas?q=storytelling&limit=25" -Headers $headers
```

Create a loose idea with no category and no film date:

```powershell
$body = @{
  kind = "note"
  sourceType = "note"
  url = $null
  title = "Open with the uncomfortable truth"
  note = "Make the viewer recognize the problem first."
  creatorName = $null
  categoryIds = @()
  filmDate = $null
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$agentApi/ideas" -Headers $headers -ContentType "application/json" -Body $body
```

## Error format

Errors use a stable JSON envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "A link idea needs a URL."
  }
}
```

Common status codes are `400` invalid request, `401` missing/invalid/revoked credential, `404` unknown route or item, `409` category still in use, `413` payload too large, and `500` safe internal error.

## Agent operating rules

- Preserve the original source URL unless the human explicitly asks to change it.
- Never invent titles, creators, attribution, dates, or metadata.
- Never create default categories. Create or assign one only when explicitly requested.
- Search before creating when a duplicate is plausible.
- Use `null` to clear a film date.
- Keep a saved link when enrichment fails; do not fabricate the preview.
- Never print or repeat the credential in ordinary chat, logs, screenshots, or files.
