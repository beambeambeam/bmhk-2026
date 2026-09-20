// @vitest-environment jsdom
/* oxlint-disable promise/avoid-new */
/* oxlint-disable typescript/no-unsafe-type-assertion */
/* eslint-disable promise/avoid-new */
/* eslint-disable require-await */

import { useForm } from "@tanstack/react-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserProvider } from "@/contexts/user-context";
import TeamStep from "../register/team";
import { RegisterFormContext } from "../register";
import type { RegistrationFormData } from "../register";

const TEAM_ID = "019c7bb1-dbe0-7000-8000-000000000001";

interface TestFetchResponse {
  json?: () => Promise<unknown>;
  ok: boolean;
}
type TestFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<TestFetchResponse>;

const api = vi.hoisted(() => ({
  createTeam: vi.fn<() => Promise<unknown>>(),
  getTeam: vi.fn<() => Promise<unknown>>(),
  updateTeam: vi.fn<() => Promise<unknown>>(),
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- The session boundary fake supplies only the methods used by this route.
vi.mock("@bmhk-2026/client/auth-client", () => ({
  authClient: {
    signOut: vi.fn<() => Promise<void>>(),
    useSession: () => ({
      data: { user: { name: "Team Owner" } },
      isPending: false,
    }),
  },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- The RPC boundary fake supplies only the procedures used by this route.
vi.mock("@bmhk-2026/client/orpc", () => ({
  client: {
    schools: {
      list: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
    },
    teamConsents: {
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
      update: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
    },
    teamRegistrationStatus: {
      get: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
    },
    teams: {
      create: api.createTeam,
      get: api.getTeam,
      update: api.updateTeam,
    },
  },
}));

const initialRegistration: RegistrationFormData = {
  advisor: {
    chronicConditionsAndFirstAidNotes: "",
    dietaryRequirements: "",
    drugAllergies: "",
    email: "advisor@example.com",
    firstNameEn: "Advisor",
    firstNameTh: "อาจารย์",
    foodAllergies: "",
    identityDocumentFile: null,
    identityDocumentName: "",
    identityDocumentUrl: "",
    lastNameEn: "Teacher",
    lastNameTh: "ผู้สอน",
    lineId: "",
    middleNameEn: "",
    middleNameTh: "",
    phone: "0891234567",
    teacherStatusDocumentFile: null,
    teacherStatusDocumentName: "",
    teacherStatusDocumentUrl: "",
    titleEn: "Mr.",
    titleTh: "นาย",
  },
  entrant1: {
    academicRecordDocumentFile: null,
    academicRecordDocumentName: "",
    academicRecordDocumentUrl: "",
    chronicConditionsAndFirstAidNotes: "",
    dateOfBirth: "2008-01-01",
    dietaryRequirements: "",
    drugAllergies: "",
    email: "entrant@example.com",
    firstNameEn: "Somchai",
    firstNameTh: "สมชาย",
    foodAllergies: "",
    identityDocumentFile: null,
    identityDocumentName: "",
    identityDocumentUrl: "",
    lastNameEn: "Bangmod",
    lastNameTh: "บางมด",
    lineId: "",
    middleNameEn: "",
    middleNameTh: "",
    phone: "0812345678",
    portraitPhotoFile: null,
    portraitPhotoName: "",
    portraitPhotoUrl: "",
    titleEn: "Mr.",
    titleTh: "นาย",
  },
  entrant2: {
    academicRecordDocumentFile: null,
    academicRecordDocumentName: "",
    academicRecordDocumentUrl: "",
    chronicConditionsAndFirstAidNotes: "",
    dateOfBirth: "2008-01-01",
    dietaryRequirements: "",
    drugAllergies: "",
    email: "entrant2@example.com",
    firstNameEn: "Somsak",
    firstNameTh: "สมศักดิ์",
    foodAllergies: "",
    identityDocumentFile: null,
    identityDocumentName: "",
    identityDocumentUrl: "",
    lastNameEn: "Bangmod",
    lastNameTh: "บางมด",
    lineId: "",
    middleNameEn: "",
    middleNameTh: "",
    phone: "0812345679",
    portraitPhotoFile: null,
    portraitPhotoName: "",
    portraitPhotoUrl: "",
    titleEn: "Mr.",
    titleTh: "นาย",
  },
  entrant3: {
    academicRecordDocumentFile: null,
    academicRecordDocumentName: "",
    academicRecordDocumentUrl: "",
    chronicConditionsAndFirstAidNotes: "",
    dateOfBirth: "2008-01-01",
    dietaryRequirements: "",
    drugAllergies: "",
    email: "entrant3@example.com",
    firstNameEn: "Somsri",
    firstNameTh: "สมศรี",
    foodAllergies: "",
    identityDocumentFile: null,
    identityDocumentName: "",
    identityDocumentUrl: "",
    lastNameEn: "Bangmod",
    lastNameTh: "บางมด",
    lineId: "",
    middleNameEn: "",
    middleNameTh: "",
    phone: "0812345680",
    portraitPhotoFile: null,
    portraitPhotoName: "",
    portraitPhotoUrl: "",
    titleEn: "Mr.",
    titleTh: "นาย",
  },
  status: null,
  success: null,
  team: {
    name: "Team Alpha",
    photoFile: null,
    photoName: null,
    photoUrl: null,
    school: "School",
    teamSize: 2,
  },
  terms: {
    TermOfServicesAccepted: true,
    codernTermsAccepted: true,
    competitionRulesAccepted: true,
    guardianConsentObtained: true,
    healthDataConsent: true,
    privacyPolicyAccepted: true,
    publicityMediaConsent: true,
  },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

let testFormValues = initialRegistration;

function getFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Team photo input is missing");
  }
  return input;
}

function TeamTestRoot() {
  const form = useForm({ defaultValues: testFormValues });

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <RegisterFormContext.Provider value={form}>
          <Outlet />
        </RegisterFormContext.Provider>
      </UserProvider>
    </QueryClientProvider>
  );
}

function createTeamTestRouter(overrides?: Partial<RegistrationFormData>) {
  testFormValues = overrides ? { ...initialRegistration, ...overrides } : initialRegistration;
  const rootRoute = createRootRoute({ component: TeamTestRoot });
  const teamRoute = createRoute({
    component: TeamStep,
    getParentRoute: () => rootRoute,
    path: "/register/team",
  });
  const advisorRoute = createRoute({
    component: () => <p>Advisor step</p>,
    getParentRoute: () => rootRoute,
    path: "/register/advisor",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/team"] }),
    routeTree: rootRoute.addChildren([teamRoute, advisorRoute]),
  });
}

describe("team registration required uploads", () => {
  beforeEach(() => {
    testFormValues = initialRegistration;
    vi.clearAllMocks();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn<() => { matches: boolean }>(() => ({ matches: false })),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn<() => void>(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("requires a team photo before continuing", async () => {
    api.createTeam.mockResolvedValue({
      id: TEAM_ID,
      memberCount: 2,
      name: "Team Alpha",
      school: "S",
    });
    const router = createTeamTestRouter();
    await router.load();

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

    await expect(screen.findByText("กรุณาแนบรูปโปรไฟล์ทีม")).resolves.toBeDefined();
    expect(router.state.location.pathname).toBe("/register/team");
    expect(api.createTeam).not.toHaveBeenCalled();
    expect(api.getTeam).not.toHaveBeenCalled();
  });

  it("continues with a saved team photo without uploading it again", async () => {
    api.createTeam.mockResolvedValue({
      id: TEAM_ID,
      memberCount: 2,
      name: "Team Alpha",
      school: "S",
    });
    const router = createTeamTestRouter({
      team: {
        ...initialRegistration.team,
        photoName: "team.png",
        photoUrl: "https://files.example/team.png",
      },
    });
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

    await expect(screen.findByText("Advisor step")).resolves.toBeDefined();
    expect(api.createTeam).toHaveBeenCalledOnce();
    expect(api.getTeam).not.toHaveBeenCalled();
  });

  it("reuses a created team after an image upload failure and saves the uploaded image", async () => {
    const team = {
      id: TEAM_ID,
      memberCount: 2,
      name: "Team Alpha",
      school: "S",
    };
    api.createTeam.mockResolvedValue(team);
    api.updateTeam.mockResolvedValue(team);
    api.getTeam.mockResolvedValue({
      ...team,
      image: {
        contentType: "image/png",
        id: "019c7bb1-dbe0-7000-8000-000000000002",
        originalName: "team.png",
        sizeBytes: 5,
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        url: "https://files.example/team.png",
      },
    });
    const fetchMock = vi.fn<TestFetch>();
    fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
      json: async () => team,
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createTeamTestRouter({
      team: { ...initialRegistration.team, school: "S" },
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const input = getFileInput();
    fireEvent.change(input, {
      target: {
        files: [new File(["image"], "team.png", { type: "image/png" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await waitFor(() => {
      expect(api.createTeam).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: "ถัดไป" });
      if (!(nextButton instanceof HTMLButtonElement)) {
        throw new Error("Next button is missing");
      }
      expect(nextButton.disabled).toBeFalsy();
    });

    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await waitFor(() => {
      expect(api.updateTeam).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(api.getTeam).toHaveBeenCalledWith({ id: TEAM_ID });
    });

    expect(api.createTeam).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByText("Advisor step")).toBeDefined();
    });

    await router.navigate({ to: "/register/team" });
    await waitFor(() => {
      expect(document.querySelector('img[src="https://files.example/team.png"]')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await waitFor(() => {
      expect(screen.getByText("Advisor step")).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the accepted photo when a replacement is rejected", async () => {
    const team = {
      id: TEAM_ID,
      memberCount: 2,
      name: "Team Alpha",
      school: "S",
    };
    api.createTeam.mockResolvedValue(team);
    api.getTeam.mockResolvedValue({
      ...team,
      image: {
        contentType: "image/png",
        id: "019c7bb1-dbe0-7000-8000-000000000002",
        originalName: "team.png",
        sizeBytes: 5,
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        url: "https://files.example/team.png",
      },
    });
    const fetchMock = vi.fn<TestFetch>().mockResolvedValue({
      json: async () => team,
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createTeamTestRouter({
      team: { ...initialRegistration.team, school: "S" },
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const input = getFileInput();
    const acceptedFile = new File(["image"], "accepted.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [acceptedFile] } });
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(6 * 1024 * 1024)], "too-large.png", { type: "image/png" }),
        ],
      },
    });

    await expect(screen.findByText("ไฟล์นี้มีขนาดเกิน 5 MB")).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const requestBody = request?.body;
    if (!(requestBody instanceof FormData)) {
      throw new Error("Team image request is missing its form data");
    }
    const uploadedFile = requestBody.get("file");
    expect(uploadedFile).toBe(acceptedFile);
  });

  it("ignores a duplicate next press while team save is pending", async () => {
    api.createTeam.mockReturnValue(new Promise(() => {}));
    const router = createTeamTestRouter({
      team: { ...initialRegistration.team, school: "S" },
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const input = getFileInput();
    fireEvent.change(input, {
      target: { files: [new File(["image"], "team.png", { type: "image/png" })] },
    });
    const nextButton = screen.getByRole("button", { name: "ถัดไป" });

    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(api.createTeam).toHaveBeenCalledOnce();
    });
    if (!(nextButton instanceof HTMLButtonElement)) {
      throw new Error("Next button is missing");
    }
    expect(nextButton.disabled).toBeTruthy();

    fireEvent.click(nextButton);
    expect(api.createTeam).toHaveBeenCalledOnce();
  });
});
