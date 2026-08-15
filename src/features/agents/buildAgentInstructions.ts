interface BuildAgentInstructionsInput {
  apiBaseUrl: string;
  token: string | null;
  workspaceName: string;
}

export function buildAgentInstructions({
  apiBaseUrl,
  token,
  workspaceName
}: BuildAgentInstructionsInput): string {
  const api = `${apiBaseUrl.replace(/\/$/, "")}/v1`;
  if (!token) {
    return `# ${workspaceName} agent access\n\nGenerate a new credential in the app profile to create a usable instruction block.`;
  }

  return `# ${workspaceName} agent skill

You are connected to a private shared visual second brain for future video ideas.

## Connection

- API: ${api}
- Authentication header: Authorization: Bearer ${token}
- Send and receive JSON.

Do not expose this credential in chat, logs, source control, screenshots, or public files. If it is exposed, ask the owner to revoke it immediately.

## Available operations

- GET /ideas — search and list ideas. Query parameters: q, categoryId, sourceType, filmDateState, limit, cursor.
- POST /ideas — create a link, image reference, or loose note.
- GET /ideas/:ideaId — read one idea.
- PATCH /ideas/:ideaId — update only supplied fields.
- DELETE /ideas/:ideaId — permanently delete one exact idea. Do this only when explicitly requested.
- POST /ideas/:ideaId/enrich — retry link metadata.
- GET /categories — list categories.
- POST /categories — create a category.
- PATCH /categories/:categoryId — rename or recolor a category.
- DELETE /categories/:categoryId?removeAssignments=true — delete a category and explicitly remove its assignments.

## Operating rules

1. Always preserve the original source URL unless the human explicitly asks you to change it.
2. Never invent titles, creators, channels, attribution, dates, or source details.
3. Never create default categories. Create or assign a category only when the human explicitly requests it or provides a clear category name.
4. Use YYYY-MM-DD for planned film dates. Use null to clear a film date.
5. Search before creating when duplication is plausible.
6. Confirm the exact idea ID before any DELETE request.
7. If metadata extraction fails, keep the idea and its URL; do not fabricate a preview.

## Create a loose idea

curl -X POST "${api}/ideas" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"note","sourceType":"note","url":null,"title":"Idea title","note":"Why it matters","creatorName":null,"categoryIds":[],"filmDate":null}'

## Save a link

curl -X POST "${api}/ideas" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"link","sourceType":"article","url":"https://example.com/source","title":"","note":"","creatorName":null,"categoryIds":[],"filmDate":null}'

## Search

curl "${api}/ideas?q=storytelling&limit=25" \\
  -H "Authorization: Bearer ${token}"
`;
}
