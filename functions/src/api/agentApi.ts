import { z } from "zod";
import {
  agentCategoryInputSchema,
  agentCategoryPatchSchema,
  agentIdeaInputSchema,
  agentIdeaPatchSchema
} from "./schemas.js";

export interface AgentRequest {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
  body: unknown;
  authorization: string | null;
}

export interface AgentResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface AgentApiDependencies {
  authenticate: (token: string) => Promise<{ keyId: string } | null>;
  listIdeas: (query: Record<string, string | undefined>) => Promise<unknown>;
  getIdea: (id: string) => Promise<Record<string, unknown> | null>;
  createIdea: (input: z.infer<typeof agentIdeaInputSchema>, actorId: string) => Promise<unknown>;
  updateIdea: (id: string, input: z.infer<typeof agentIdeaPatchSchema>, actorId: string) => Promise<unknown>;
  deleteIdea: (id: string) => Promise<boolean>;
  enrichIdea: (id: string, actorId: string) => Promise<boolean>;
  listCategories: () => Promise<unknown[]>;
  createCategory: (input: z.infer<typeof agentCategoryInputSchema>, actorId: string) => Promise<unknown>;
  updateCategory: (id: string, input: z.infer<typeof agentCategoryPatchSchema>, actorId: string) => Promise<unknown>;
  deleteCategory: (id: string, removeAssignments: boolean) => Promise<boolean>;
}

function bearer(authorization: string | null) {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  return match?.[1] ?? null;
}

function failure(status: number, code: string, message: string): AgentResponse {
  return { status, body: { error: { code, message } } };
}

export async function handleAgentRequest(
  request: AgentRequest,
  dependencies: AgentApiDependencies
): Promise<AgentResponse> {
  if (request.method === "GET" && request.path === "/v1/health") {
    return { status: 200, body: { status: "ok", version: "v1" } };
  }

  const token = bearer(request.authorization);
  if (!token) return failure(401, "unauthorized", "A bearer credential is required.");
  const agent = await dependencies.authenticate(token);
  if (!agent) return failure(401, "unauthorized", "The agent credential is invalid or revoked.");

  try {
    if (request.path === "/v1/ideas") {
      if (request.method === "GET") {
        return { status: 200, body: (await dependencies.listIdeas(request.query)) as Record<string, unknown> };
      }
      if (request.method === "POST") {
        const input = agentIdeaInputSchema.parse(request.body);
        return {
          status: 201,
          body: { item: await dependencies.createIdea(input, agent.keyId) }
        };
      }
    }

    const enrichment = /^\/v1\/ideas\/([^/]+)\/enrich$/.exec(request.path);
    if (enrichment?.[1] && request.method === "POST") {
      const found = await dependencies.enrichIdea(enrichment[1], agent.keyId);
      return found ? { status: 202, body: { status: "pending" } } : failure(404, "not_found", "Idea not found.");
    }

    const idea = /^\/v1\/ideas\/([^/]+)$/.exec(request.path);
    if (idea?.[1]) {
      if (request.method === "GET") {
        const item = await dependencies.getIdea(idea[1]);
        return item ? { status: 200, body: { item } } : failure(404, "not_found", "Idea not found.");
      }
      if (request.method === "PATCH") {
        const input = agentIdeaPatchSchema.parse(request.body);
        return { status: 200, body: { item: await dependencies.updateIdea(idea[1], input, agent.keyId) } };
      }
      if (request.method === "DELETE") {
        return (await dependencies.deleteIdea(idea[1]))
          ? { status: 200, body: { status: "deleted", id: idea[1] } }
          : failure(404, "not_found", "Idea not found.");
      }
    }

    if (request.path === "/v1/categories") {
      if (request.method === "GET") {
        return { status: 200, body: { items: await dependencies.listCategories() } };
      }
      if (request.method === "POST") {
        const input = agentCategoryInputSchema.parse(request.body);
        return { status: 201, body: { item: await dependencies.createCategory(input, agent.keyId) } };
      }
    }

    const category = /^\/v1\/categories\/([^/]+)$/.exec(request.path);
    if (category?.[1]) {
      if (request.method === "PATCH") {
        const input = agentCategoryPatchSchema.parse(request.body);
        return { status: 200, body: { item: await dependencies.updateCategory(category[1], input, agent.keyId) } };
      }
      if (request.method === "DELETE") {
        const removed = await dependencies.deleteCategory(
          category[1],
          request.query.removeAssignments === "true"
        );
        return removed
          ? { status: 200, body: { status: "deleted", id: category[1] } }
          : failure(409, "category_in_use", "Set removeAssignments=true to remove assigned category references.");
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(400, "invalid_request", error.issues.map((issue) => issue.message).join(" "));
    }
    return failure(500, "internal_error", "The request could not be completed.");
  }

  return failure(404, "not_found", "No API route matches this request.");
}
