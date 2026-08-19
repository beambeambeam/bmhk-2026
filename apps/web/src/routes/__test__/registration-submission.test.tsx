// @vitest-environment jsdom

import { useForm } from "@tanstack/react-form";
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
import EntrantStep from "../register/entrant.$index";
import { RegisterFormContext } from "../register";
import type { RegistrationFormData } from "../register";

const TEAM_ID = "019c7bb1-dbe0-7000-8000-000000000001";

const api = vi.hoisted(() => ({
  submitRegistration: vi.fn<(input: { teamId: string }) => Promise<unknown>>(),
  updateConsents: vi.fn<(input: unknown) => Promise<unknown>>(),
  updateParticipant: vi.fn<(input: unknown) => Promise<unknown>>(),
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies only session methods rendered by the wizard.
vi.mock("@bmhk-2026/client/auth-client", () => ({
  authClient: {
    signOut: vi.fn<() => Promise<void>>(),
    useSession: () => ({
      data: { user: { name: "Team Owner" } },
      isPending: false,
    }),
  },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies only registration procedures exercised by this route.
vi.mock("@bmhk-2026/client/orpc", () => ({
  client: {
    teamConsents: {
      create: vi.fn<(input: unknown) => Promise<unknown>>(),
      update: api.updateConsents,
    },
    teamParticipants: {
      academicRecordDocument: vi.fn<(input: unknown) => Promise<unknown>>(),
      create: vi.fn<(input: unknown) => Promise<unknown>>(),
      identityDocument: vi.fn<(input: unknown) => Promise<unknown>>(),
      portraitPhoto: vi.fn<(input: unknown) => Promise<unknown>>(),
      update: api.updateParticipant,
    },
    teamRegistrationStatus: {
      get: vi.fn<() => Promise<unknown>>(),
      submit: api.submitRegistration,
    },
  },
}));

const entrant = {
  academicRecordDocumentFile: null,
  academicRecordDocumentName: "record.pdf",
  academicRecordDocumentUrl: "https://files.example/record.pdf",
  chronicConditionsAndFirstAidNotes: "",
  dateOfBirth: "2008-01-01",
  dietaryRequirements: "",
  drugAllergies: "",
  email: "entrant@example.com",
  firstNameEn: "Somchai",
  firstNameTh: "สมชาย",
  foodAllergies: "",
  identityDocumentFile: null,
  identityDocumentName: "identity.pdf",
  identityDocumentUrl: "https://files.example/identity.pdf",
  lastNameEn: "Bangmod",
  lastNameTh: "บางมด",
  lineId: "",
  middleNameEn: "",
  middleNameTh: "",
  phone: "0812345678",
  portraitPhotoFile: null,
  portraitPhotoName: "portrait.png",
  portraitPhotoUrl: "https://files.example/portrait.png",
  titleEn: "Mr.",
  titleTh: "นาย",
};

const registration: RegistrationFormData = {
  advisor: {
    chronicConditionsAndFirstAidNotes: "",
    dietaryRequirements: "",
    drugAllergies: "",
    email: "advisor@example.com",
    firstNameEn: "Advisor",
    firstNameTh: "อาจารย์",
    foodAllergies: "",
    identityDocumentFile: null,
    identityDocumentName: "advisor-identity.pdf",
    identityDocumentUrl: "https://files.example/advisor-identity.pdf",
    lastNameEn: "Teacher",
    lastNameTh: "ผู้สอน",
    lineId: "",
    middleNameEn: "",
    middleNameTh: "",
    phone: "0891234567",
    teacherStatusDocumentFile: null,
    teacherStatusDocumentName: "teacher-status.pdf",
    teacherStatusDocumentUrl: "https://files.example/teacher-status.pdf",
    titleEn: "Mr.",
    titleTh: "นาย",
  },
  entrant1: entrant,
  entrant2: entrant,
  entrant3: entrant,
  status: { teamId: TEAM_ID },
  success: null,
  team: {
    name: "Test Team",
    photoFile: null,
    photoName: "team.png",
    photoUrl: "https://files.example/team.png",
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

function RegistrationTestRoot() {
  const form = useForm({ defaultValues: registration });

  return (
    <UserProvider>
      <RegisterFormContext.Provider value={form}>
        <Outlet />
      </RegisterFormContext.Provider>
    </UserProvider>
  );
}

function createRegistrationRouter() {
  const rootRoute = createRootRoute({ component: RegistrationTestRoot });
  const entrantRoute = createRoute({
    component: EntrantStep,
    getParentRoute: () => rootRoute,
    path: "/register/entrant/$index",
  });
  const successRoute = createRoute({
    component: () => <p>Registration submitted</p>,
    getParentRoute: () => rootRoute,
    path: "/register/success",
  });
  const errorRoute = createRoute({
    component: () => <p>Registration failed</p>,
    getParentRoute: () => rootRoute,
    path: "/register/error",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/entrant/2"] }),
    routeTree: rootRoute.addChildren([entrantRoute, successRoute, errorRoute]),
  });
}

describe("registration submission", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(cleanup);

  it("waits for final registration submission before showing success", async () => {
    const submission = Promise.withResolvers<unknown>();
    api.updateParticipant.mockResolvedValue({});
    api.updateConsents.mockResolvedValue({});
    api.submitRegistration.mockReturnValue(submission.promise);
    const router = createRegistrationRouter();
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }));

    await waitFor(() => {
      expect(api.submitRegistration).toHaveBeenCalledWith({ teamId: TEAM_ID });
    });
    expect(screen.queryByText("Registration submitted")).toBeNull();

    submission.resolve({ submissionState: "SUBMITTED", teamId: TEAM_ID });

    await expect(screen.findByText("Registration submitted")).resolves.toBeDefined();
  });

  it("shows the failure route when final registration submission fails", async () => {
    api.updateParticipant.mockResolvedValue({});
    api.updateConsents.mockResolvedValue({});
    api.submitRegistration.mockRejectedValue(new Error("Submission failed"));
    const router = createRegistrationRouter();
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }));

    await expect(screen.findByText("Registration failed")).resolves.toBeDefined();
    expect(screen.queryByText("Registration submitted")).toBeNull();
  });
});
