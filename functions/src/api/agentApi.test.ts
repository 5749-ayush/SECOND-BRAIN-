import { describe, expect, it, vi } from "vitest";
import { handleAgentRequest, type AgentApiDependencies } from "./agentApi.js";

function dependencies(): AgentApiDependencies {
  return {
    authenticate: vi.fn(async (token) =>
      token === "valid-token" ? { keyId: "key-1" } : null
    ),
    listIdeas: vi.fn(async () => ({ items: [], nextCursor: null })),
    getIdea: vi.fn(async (id) => (id === "idea-1" ? { id, title: "Saved idea" } : null)),
    createIdea: vi.fn(async (input, actorId) => ({ id: "new-idea", ...input, actorId })),
    updateIdea: vi.fn(async (id, input) => ({ id, ...input })),
    deleteIdea: vi.fn(async () => true),
    enrichIdea: vi.fn(async () => true),
    listCategories: vi.fn(async () => []),
    createCategory: vi.fn(async (input) => ({ id: "new-category", ...input })),
    updateCategory: vi.fn(async (id, input) => ({ id, ...input })),
    deleteCategory: vi.fn(async () => true)
  };
}

describe("handleAgentRequest", () => {
  it("returns a health response without private data or authentication", async () => {
    const response = await handleAgentRequest(
      { method: "GET", path: "/v1/health", query: {}, body: null, authorization: null },
      dependencies()
    );
    expect(response).toEqual({ status: 200, body: { status: "ok", version: "v1" } });
  });

  it("rejects missing and invalid bearer credentials before reading data", async () => {
    const deps = dependencies();
    const missing = await handleAgentRequest(
      { method: "GET", path: "/v1/ideas", query: {}, body: null, authorization: null },
      deps
    );
    const invalid = await handleAgentRequest(
      {
        method: "GET",
        path: "/v1/ideas",
        query: {},
        body: null,
        authorization: "Bearer wrong-token"
      },
      deps
    );

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(deps.listIdeas).not.toHaveBeenCalled();
  });

  it("validates and creates a loose idea for an authenticated agent", async () => {
    const deps = dependencies();
    const response = await handleAgentRequest(
      {
        method: "POST",
        path: "/v1/ideas",
        query: {},
        authorization: "Bearer valid-token",
        body: {
          kind: "note",
          sourceType: "note",
          url: null,
          title: "A useful hook",
          note: "Start with the unexpected result.",
          creatorName: null,
          categoryIds: [],
          filmDate: null
        }
      },
      deps
    );

    expect(response.status).toBe(201);
    expect(deps.createIdea).toHaveBeenCalledWith(
      expect.objectContaining({ title: "A useful hook", categoryIds: [] }),
      "key-1"
    );
  });

  it("rejects invalid payloads and unknown routes safely", async () => {
    const deps = dependencies();
    const invalid = await handleAgentRequest(
      {
        method: "POST",
        path: "/v1/ideas",
        query: {},
        authorization: "Bearer valid-token",
        body: { kind: "note" }
      },
      deps
    );
    const unknown = await handleAgentRequest(
      {
        method: "GET",
        path: "/v1/private-dump",
        query: {},
        authorization: "Bearer valid-token",
        body: null
      },
      deps
    );

    expect(invalid.status).toBe(400);
    expect(invalid.body).not.toHaveProperty("stack");
    expect(unknown.status).toBe(404);
  });
});
