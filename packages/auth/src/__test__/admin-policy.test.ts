import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAuth } from "../auth";

async function createHarness(actorRole: "admin" | "superAdmin" = "admin") {
  const auth = betterAuth({
    ...createAuth().options,
    database: memoryAdapter({ account: [], session: [], user: [], verification: [] }),
    logger: { disabled: true },
    rateLimit: { enabled: false },
  });
  const password = "A-secure-test-password-123!";
  const actor = await auth.api.createUser({
    body: { email: "actor@kmutt.ac.th", name: "Actor", password, role: actorRole },
  });
  const target = await auth.api.createUser({
    body: { email: "target@kmutt.ac.th", name: "Target", password, role: "superAdmin" },
  });
  const signIn = await auth.api.signInEmail({
    asResponse: true,
    body: { email: actor.user.email, password },
  });
  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  async function post(path: string, body: Record<string, unknown>, authenticated = true) {
    return await auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3001",
          ...(authenticated ? { cookie } : {}),
        },
        method: "POST",
      }),
    );
  }
  return { actor: actor.user, auth, post, target: target.user };
}

describe("Better Auth administrator boundaries", () => {
  it("disables direct role changes so HTTP callers cannot bypass application auditing", async () => {
    const { post, target } = await createHarness("superAdmin");
    const response = await post("/admin/set-role", { role: "user", userId: target.id });
    expect(response.status).toBe(404);
  });

  it("rejects role changes through update-user", async () => {
    const { post, actor } = await createHarness();
    const response = await post("/admin/update-user", {
      data: { role: "superAdmin" },
      userId: actor.id,
    });
    expect(response.status).toBe(403);
  });

  it.each([
    "ban-user",
    "unban-user",
    "remove-user",
    "set-user-password",
    "update-user",
    "impersonate-user",
    "revoke-user-sessions",
    "list-user-sessions",
  ])("prevents admins from managing superAdmins through %s", async (endpoint) => {
    const { post, target } = await createHarness();
    const response = await post(`/admin/${endpoint}`, {
      data: { email: "takeover@kmutt.ac.th" },
      newPassword: "Another-secure-password-123!",
      userId: target.id,
    });
    expect(response.status).toBe(403);
  });

  it.each([
    { role: "superAdmin" },
    { data: { role: "superAdmin" } },
    { role: ["user", "superAdmin"] },
  ])("rejects privileged role creation through %j", async (roleInput) => {
    const { post } = await createHarness();
    const response = await post("/admin/create-user", {
      email: "new@kmutt.ac.th",
      name: "New",
      ...roleInput,
    });
    expect(response.status).toBe(403);
  });

  it("protects superAdmin sessions when revocation uses a token instead of a user ID", async () => {
    const { auth, post, target } = await createHarness();
    const session = await auth.api.signInEmail({
      body: { email: target.email, password: "A-secure-test-password-123!" },
    });
    const response = await post("/admin/revoke-user-session", { sessionToken: session.token });
    expect(response.status).toBe(403);
  });

  it("rejects privileged role fields in public signups", async () => {
    const { post } = await createHarness();
    const response = await post(
      "/sign-up/email",
      {
        email: "signup@example.com",
        name: "Signup",
        password: "A-secure-test-password-123!",
        role: "superAdmin",
      },
      false,
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "FIELD_NOT_ALLOWED" });
  });

  it("assigns user to ordinary public signups", async () => {
    const { post } = await createHarness();
    const response = await post(
      "/sign-up/email",
      { email: "signup@example.com", name: "Signup", password: "A-secure-test-password-123!" },
      false,
    );
    expect(response.status).toBe(200);
    const result = z.object({ user: z.object({ role: z.string() }) }).parse(await response.json());
    expect(result.user.role).toBe("user");
  });

  it("allows admins to create ordinary users and manage lower-role accounts", async () => {
    const { post } = await createHarness();
    const created = await post("/admin/create-user", {
      email: "lower@kmutt.ac.th",
      name: "Lower",
      role: "staff",
    });
    expect(created.status).toBe(200);
    const result = z.object({ user: z.object({ id: z.string() }) }).parse(await created.json());
    const banned = await post("/admin/ban-user", { userId: result.user.id });
    expect(banned.status).toBe(200);
  });

  it("allows superAdmins to manage admin accounts", async () => {
    const { post } = await createHarness("superAdmin");
    const response = await post("/admin/create-user", {
      email: "new-admin@kmutt.ac.th",
      name: "Admin",
      role: "admin",
    });
    expect(response.status).toBe(200);
  });

  it("denies unauthenticated administrator requests", async () => {
    const { post, target } = await createHarness();
    const response = await post("/admin/ban-user", { userId: target.id }, false);
    expect(response.status).toBe(401);
  });
});
