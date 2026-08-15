// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "shared-space-cca50",
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080
    }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "workspaces/main/members/owner"), {
      email: "ayushamitjain@gmail.com",
      role: "owner",
      status: "active"
    });
    await setDoc(doc(context.firestore(), "workspaces/main/members/member"), {
      email: "member@example.com",
      role: "member",
      status: "active"
    });
    await setDoc(doc(context.firestore(), "workspaces/main/ideas/idea-1"), {
      title: "Private idea"
    });
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe("Firestore workspace rules", () => {
  it("blocks unauthenticated and unapproved reads", async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const visitor = environment.authenticatedContext("visitor").firestore();

    await assertFails(getDoc(doc(anonymous, "workspaces/main/ideas/idea-1")));
    await assertFails(getDoc(doc(visitor, "workspaces/main/ideas/idea-1")));
  });

  it("allows active members to read and write ideas", async () => {
    const member = environment.authenticatedContext("member").firestore();

    await assertSucceeds(getDoc(doc(member, "workspaces/main/ideas/idea-1")));
    await assertSucceeds(
      setDoc(doc(member, "workspaces/main/ideas/idea-2"), {
        title: "New idea",
        kind: "note"
      })
    );
  });

  it("restricts member administration and agent keys to the owner", async () => {
    const owner = environment.authenticatedContext("owner").firestore();
    const member = environment.authenticatedContext("member").firestore();
    const invite = doc(owner, "workspaces/main/memberInvites/team@example.com");
    const key = doc(owner, "workspaces/main/agentKeys/key-1");

    await assertSucceeds(setDoc(invite, { email: "team@example.com", role: "member" }));
    await assertSucceeds(setDoc(key, { name: "Codex", status: "active" }));
    await assertFails(
      setDoc(doc(member, "workspaces/main/memberInvites/other@example.com"), {
        email: "other@example.com",
        role: "member"
      })
    );
    await assertFails(
      setDoc(doc(member, "workspaces/main/agentKeys/key-2"), {
        name: "Unapproved",
        status: "active"
      })
    );
  });
});
