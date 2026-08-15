// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "shared-space-cca50",
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080
    },
    storage: {
      rules: readFileSync(resolve("storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199
    }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "workspaces/main/members/member"), {
      email: "member@example.com",
      role: "member",
      status: "active"
    });
  });
});

afterAll(async () => environment.cleanup());

describe("Storage rules", () => {
  it("allows an active member to upload an approved image", async () => {
    const memberStorage = environment.authenticatedContext("member").storage();
    const image = ref(memberStorage, "workspaces/main/ideas/idea-1/reference.webp");

    await assertSucceeds(
      uploadBytes(image, new Uint8Array([1, 2, 3]), { contentType: "image/webp" })
    );
  });

  it("blocks unapproved users and non-image content", async () => {
    const visitorStorage = environment.authenticatedContext("visitor").storage();
    const memberStorage = environment.authenticatedContext("member").storage();

    await assertFails(
      uploadBytes(
        ref(visitorStorage, "workspaces/main/ideas/idea-1/reference.webp"),
        new Uint8Array([1]),
        { contentType: "image/webp" }
      )
    );
    await assertFails(
      uploadBytes(
        ref(memberStorage, "workspaces/main/ideas/idea-1/notes.pdf"),
        new Uint8Array([1]),
        { contentType: "application/pdf" }
      )
    );
  });

  it("blocks images larger than ten MiB", async () => {
    const memberStorage = environment.authenticatedContext("member").storage();
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);

    await assertFails(
      uploadBytes(
        ref(memberStorage, "workspaces/main/ideas/idea-1/too-large.jpg"),
        oversized,
        { contentType: "image/jpeg" }
      )
    );
  });
});
