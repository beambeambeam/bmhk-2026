// @vitest-environment jsdom

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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserProvider } from "@/contexts/user-context";
import TeamStep from "../register/team";
import { RegisterFormContext, Route as RegisterRoute } from "../register";
import type { RegistrationFormData } from "../register";

const { TEAM_ID } = vi.hoisted(() => ({
  TEAM_ID: "019c7bb1-dbe0-7000-8000-000000000001",
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies session methods.
vi.mock("@bmhk-2026/client/auth-client", () => ({
  authClient: {
    signOut: vi.fn<() => Promise<void>>(),
    useSession: () => ({
      data: { user: { name: "Team Owner" } },
      isPending: false,
    }),
  },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
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
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: TEAM_ID }),
      update: vi.fn<() => Promise<unknown>>().mockResolvedValue({
        id: TEAM_ID,
        memberCount: 2,
        name: "123456789012345678",
        school: "Test School",
      }),
    },
  },
}));

const entrant = {
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
};

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
  entrant1: entrant,
  entrant2: entrant,
  entrant3: entrant,
  status: null,
  success: null,
  team: {
    name: "",
    photoFile: null,
    photoName: null,
    photoUrl: null,
    school: "Test School",
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
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

let testFormValues: RegistrationFormData = initialRegistration;

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

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/team"] }),
    routeTree: rootRoute.addChildren([teamRoute]),
  });
}

describe("TeamStep rendered component", () => {
  beforeEach(() => {
    testFormValues = initialRegistration;
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(RegisterRoute, "useLoaderData").mockReturnValue({
      advisorData: null,
      entrant1Data: null,
      entrant2Data: null,
      entrant3Data: null,
      statusData: null,
      teamData: null,
      termsData: null,
    });
  });

  afterEach(cleanup);

  it("displays validation error when entering an oversized team name and clicking next", async () => {
    const router = createTeamTestRouter();
    await router.load();

    render(<RouterProvider router={router} />);

    const input = screen.getByLabelText<HTMLInputElement>(/ชื่อทีม/u);
    fireEvent.change(input, { target: { value: "123456789012345678" } });

    const nextButton = screen.getByRole("button", { name: "ถัดไป" });
    fireEvent.click(nextButton);

    expect(screen.getByText("ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร")).toBeDefined();
  });

  it("updates input value when typing a valid name", async () => {
    const router = createTeamTestRouter();
    await router.load();

    render(<RouterProvider router={router} />);

    const input = screen.getByLabelText<HTMLInputElement>(/ชื่อทีม/u);
    fireEvent.change(input, { target: { value: "ทีมหมูปิ้ง 1" } });

    expect(input.value).toBe("ทีมหมูปิ้ง 1");
  });

  it("displays validation error when entering special characters and clicking next", async () => {
    const router = createTeamTestRouter();
    await router.load();

    render(<RouterProvider router={router} />);

    const input = screen.getByLabelText<HTMLInputElement>(/ชื่อทีม/u);
    fireEvent.change(input, { target: { value: "Team@1" } });

    const nextButton = screen.getByRole("button", { name: "ถัดไป" });
    fireEvent.click(nextButton);

    expect(
      screen.getByText(
        "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ",
      ),
    ).toBeDefined();
  });

  it("does not show validation error for existing grandfathered team name when unchanged", async () => {
    const router = createTeamTestRouter({
      status: { teamId: TEAM_ID },
      team: {
        ...initialRegistration.team,
        name: "123456789012345678",
        school: "Test School",
      },
    });
    await router.load();

    render(<RouterProvider router={router} />);

    const input = screen.getByLabelText<HTMLInputElement>(/ชื่อทีม/u);
    expect(input.value).toBe("123456789012345678");
    expect(screen.queryByText("ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร")).toBeNull();

    const nextButton = screen.getByRole("button", { name: "ถัดไป" });
    fireEvent.click(nextButton);

    expect(screen.queryByText("ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร")).toBeNull();
  });

  it("shows validation error when existing grandfathered team name is modified to another invalid name", async () => {
    const router = createTeamTestRouter({
      status: { teamId: TEAM_ID },
      team: {
        ...initialRegistration.team,
        name: "123456789012345678",
        school: "Test School",
      },
    });
    await router.load();

    render(<RouterProvider router={router} />);

    const input = screen.getByLabelText<HTMLInputElement>(/ชื่อทีม/u);
    fireEvent.change(input, { target: { value: "DifferentInvalid18" } });

    const nextButton = screen.getByRole("button", { name: "ถัดไป" });
    fireEvent.click(nextButton);

    expect(screen.getByText("ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร")).toBeDefined();
  });

  it("omits name in update payload when grandfathered team name is unchanged and school is changed", async () => {
    const { client } = await import("@bmhk-2026/client/orpc");
    const router = createTeamTestRouter({
      status: { teamId: TEAM_ID },
      team: {
        ...initialRegistration.team,
        name: "123456789012345678",
        school: "Test School",
      },
    });
    await router.load();

    render(<RouterProvider router={router} />);

    const schoolInput = screen.getByLabelText<HTMLInputElement>(/สถานศึกษา/u);
    fireEvent.change(schoolInput, { target: { value: "New University" } });

    const nextButton = screen.getByRole("button", { name: "ถัดไป" });
    fireEvent.click(nextButton);

    const updateCalls = vi.mocked(client.teams.update).mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);
    const lastCall = updateCalls.at(-1);
    expect(lastCall?.[0].id).toBe(TEAM_ID);
    expect(lastCall?.[0].data).not.toHaveProperty("name");
  });
});
