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
    teamRegistrationStatus: {
      get: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
    },
    teams: {
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: TEAM_ID }),
      update: vi.fn<() => Promise<unknown>>().mockResolvedValue({ id: TEAM_ID }),
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

function TeamTestRoot() {
  const form = useForm({ defaultValues: initialRegistration });

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

function createTeamTestRouter() {
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
});
