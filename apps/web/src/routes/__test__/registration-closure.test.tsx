// @vitest-environment jsdom

import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserProvider } from "@/contexts/user-context";
import { Route as RegisterRoute } from "../register";
import ErrorStep, { Route as ErrorRoute } from "../register/error";

const TEAM_ID = "019c7bb1-dbe0-7000-8000-000000000001";

const api = vi.hoisted(() => ({
  getAdvisor: vi.fn<(input: unknown) => Promise<unknown>>(),
  getConsents: vi.fn<(input: unknown) => Promise<unknown>>(),
  getFeatureFlags: vi.fn<() => Promise<unknown>>(),
  getParticipant: vi.fn<(input: unknown) => Promise<unknown>>(),
  getStatus: vi.fn<() => Promise<unknown>>(),
  getTeam: vi.fn<(input: unknown) => Promise<unknown>>(),
}));

const auth = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<unknown>>(),
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies the session methods used by the route.
vi.mock("@bmhk-2026/client/auth-client", () => ({
  authClient: {
    getSession: auth.getSession,
    useSession: () => ({
      data: { user: { name: "Team Owner" } },
      isPending: false,
    }),
  },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies the registration reads used by the route.
vi.mock("@bmhk-2026/client/orpc", () => ({
  client: {
    featureFlags: {
      getAll: api.getFeatureFlags,
    },
    teamAdvisors: {
      get: api.getAdvisor,
    },
    teamConsents: {
      get: api.getConsents,
    },
    teamParticipants: {
      get: api.getParticipant,
    },
    teamRegistrationStatus: {
      get: api.getStatus,
    },
    teams: {
      get: api.getTeam,
    },
  },
}));

const draftStatus = {
  advisor: "COMPLETED",
  isComplete: true,
  memberCount: 2,
  participant1: "COMPLETED",
  participant2: "COMPLETED",
  participant3: "NOT_APPLICABLE",
  submissionState: "DRAFT",
  submittedAt: null,
  team: "COMPLETED",
  teamId: TEAM_ID,
  termsAndConditions: "COMPLETED",
};

const incompleteDraftStatus = {
  ...draftStatus,
  advisor: "IN_PROGRESS",
  isComplete: false,
};

const team = {
  id: TEAM_ID,
  memberCount: 2,
  name: "Test Team",
  school: "Test School",
};

const teamNotFoundError = {
  data: { code: "TEAM_NOT_FOUND" },
  status: 404,
};

function createRegistrationRouter(initialEntry: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- File-route test harness attaches the generated route to a test root.
  const registerRoute = RegisterRoute.update({
    getParentRoute: () => rootRoute,
    id: "/register",
    path: "/register",
  } as never);
  const registerChildren = [
    createRoute({
      component: () => <p>Registration flow</p>,
      getParentRoute: () => registerRoute,
      path: "/entrant/$index",
    }),
    createRoute({
      component: () => <p>Registration closed</p>,
      getParentRoute: () => registerRoute,
      path: "/error",
    }),
    createRoute({
      component: () => <p>Registration flow</p>,
      getParentRoute: () => registerRoute,
      path: "/team",
    }),
  ];
  const registerRouteWithChildren = registerRoute.addChildren(registerChildren);
  const homeRoute = createRoute({
    component: () => <p>Home</p>,
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const myTeamRoute = createRoute({
    component: () => <p>My team</p>,
    getParentRoute: () => rootRoute,
    path: "/my-team",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: rootRoute.addChildren([registerRouteWithChildren, homeRoute, myTeamRoute]),
  });
}

function createErrorPageRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <UserProvider>
        <Outlet />
      </UserProvider>
    ),
  });
  const errorRoute = createRoute({
    component: ErrorStep,
    getParentRoute: () => rootRoute,
    path: "/register/error",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/error"] }),
    routeTree: rootRoute.addChildren([errorRoute]),
  });
}

describe("registration closure routing", () => {
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { user: { name: "Team Owner" } } });
    api.getAdvisor.mockResolvedValue(null);
    api.getConsents.mockResolvedValue(null);
    api.getFeatureFlags.mockResolvedValue({ registration: true });
    api.getParticipant.mockResolvedValue(null);
    api.getStatus.mockResolvedValue(draftStatus);
    api.getTeam.mockResolvedValue(team);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("redirects a closed registration with no team to the closed error route", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    api.getStatus.mockRejectedValue(teamNotFoundError);
    const router = createRegistrationRouter("/register");

    await router.load();

    expect(router.state.location.href).toBe("/register/error?reason=registration_closed");
  });

  it("redirects a closed registration with an incomplete draft to the closed error route", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    api.getStatus.mockResolvedValue(incompleteDraftStatus);
    const router = createRegistrationRouter("/register/team");

    await router.load();

    expect(router.state.location.href).toBe("/register/error?reason=registration_closed");
  });

  it("redirects a closed registration with a complete unsubmitted draft to the closed error route", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    const router = createRegistrationRouter("/register/team");

    await router.load();

    expect(router.state.location.href).toBe("/register/error?reason=registration_closed");
  });

  it("sends a submitted team to my-team after registration closes", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    api.getStatus.mockResolvedValue({ ...draftStatus, submissionState: "SUBMITTED" });
    const router = createRegistrationRouter("/register");

    await router.load();

    expect(router.state.location.pathname).toBe("/my-team");
  });

  it("keeps a draft in the existing registration flow while registration is open", async () => {
    const router = createRegistrationRouter("/register/team");

    await router.load();

    expect(router.state.location.pathname).toBe("/register/team");
  });

  it("redirects direct child-route access after registration closes", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    const router = createRegistrationRouter("/register/entrant/2");

    await router.load();

    expect(router.state.location.href).toBe("/register/error?reason=registration_closed");
  });

  it("does not redirect-loop when the closed error route is already current", async () => {
    api.getFeatureFlags.mockResolvedValue({ registration: false });
    api.getStatus.mockRejectedValue(teamNotFoundError);
    const router = createRegistrationRouter("/register/error");

    await router.load();

    expect(router.state.location.pathname).toBe("/register/error");
  });
});

describe("registration error page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the closed-registration message and home action", async () => {
    vi.spyOn(ErrorRoute, "useSearch").mockReturnValue({ reason: "registration_closed" });
    const router = createErrorPageRouter();

    await router.load();
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { name: "ปิดรับสมัครแล้ว" })).toBeDefined();
    expect(screen.getByText("หมดเขตรับสมัครแล้ว ไม่สามารถส่งใบสมัครได้")).toBeDefined();
    expect(screen.getByRole("link", { name: "กลับหน้าหลัก" })).toBeDefined();
  });

  it("keeps the generic registration error message without a closure reason", async () => {
    vi.spyOn(ErrorRoute, "useSearch").mockReturnValue({});
    const router = createErrorPageRouter();

    await router.load();
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { name: "ลงทะเบียนเข้าแข่งขันไม่สำเร็จ" })).toBeDefined();
    expect(screen.getByText("เกิดข้อผิดพลาดขึ้นในระหว่างการลงทะเบียน กรุณาลองอีกครั้ง")).toBeDefined();
    expect(screen.getByRole("link", { name: "ลองอีกครั้ง" })).toBeDefined();
  });
});
