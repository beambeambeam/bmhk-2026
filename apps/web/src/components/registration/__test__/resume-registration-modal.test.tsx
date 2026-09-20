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

import { getExpectedNextStep, RegisterFormContext } from "@/routes/register";
import type { RegistrationFormData } from "@/routes/register";
import type ResumeRegistrationModalComponent from "../resume-registration-modal";

const TEAM_ID = "019c7bb1-dbe0-7000-8000-000000000001";

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies only the auth method used by the rendered modal.
// @ts-expect-error -- Boundary fake intentionally implements only the auth method used by the rendered modal.
vi.mock(import("@bmhk-2026/client/auth-client"), () => ({
  authClient: {
    getSession: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ data: { user: { id: "user-1" } } }),
  },
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies only the delete procedure used by the rendered modal.
// @ts-expect-error -- Boundary fake intentionally implements only the delete procedure used by the rendered modal.
vi.mock(import("@bmhk-2026/client/orpc"), () => ({
  client: {
    teams: {
      delete: vi.fn<() => Promise<unknown>>(),
    },
  },
}));

const person = {
  academicRecordDocumentFile: null,
  academicRecordDocumentName: "academic.pdf",
  academicRecordDocumentUrl: "https://files.example/academic.pdf",
  chronicConditionsAndFirstAidNotes: "",
  dateOfBirth: "2008-01-01",
  dietaryRequirements: "",
  drugAllergies: "",
  email: "entrant@example.com",
  firstNameEn: "Entrant",
  firstNameTh: "ผู้เข้าแข่งขัน",
  foodAllergies: "",
  identityDocumentFile: null,
  identityDocumentName: "identity.pdf",
  identityDocumentUrl: "https://files.example/identity.pdf",
  lastNameEn: "One",
  lastNameTh: "หนึ่ง",
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
  entrant1: person,
  entrant2: { ...person, email: "entrant2@example.com", firstNameEn: "Entrant Two" },
  entrant3: { ...person, email: "entrant3@example.com", firstNameEn: "Entrant Three" },
  status: { isComplete: false, teamId: TEAM_ID },
  success: null,
  team: {
    name: "Team Alpha",
    photoFile: null,
    photoName: "team.png",
    photoUrl: "https://files.example/team.png",
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

let testFormValues = registration;
let ResumeRegistrationModal: typeof ResumeRegistrationModalComponent;

function RegistrationLayout() {
  const form = useForm({ defaultValues: testFormValues });

  return (
    <RegisterFormContext.Provider value={form}>
      <Outlet />
      <ResumeRegistrationModal getResumeRoute={() => getExpectedNextStep(form)} />
    </RegisterFormContext.Provider>
  );
}

function TeamPage() {
  return <p>Team page</p>;
}

function EntrantPage() {
  return <p>Entrant page</p>;
}

function createModalRouter(defaultValues: RegistrationFormData) {
  testFormValues = defaultValues;
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const registerRoute = createRoute({
    component: RegistrationLayout,
    getParentRoute: () => rootRoute,
    loader: () => ({ statusData: { isComplete: false, teamId: TEAM_ID } }),
    path: "/register",
  });
  const teamRoute = createRoute({
    component: TeamPage,
    getParentRoute: () => registerRoute,
    path: "/team",
  });
  const entrantRoute = createRoute({
    component: EntrantPage,
    getParentRoute: () => registerRoute,
    path: "/entrant/$index",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/entrant/2"] }),
    routeTree: rootRoute.addChildren([registerRoute.addChildren([teamRoute, entrantRoute])]),
  });
}

describe("resume registration modal", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const modalModule = await import("../resume-registration-modal");
    ResumeRegistrationModal = modalModule.default;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("resumes a draft without a team photo at the team step", async () => {
    const router = createModalRouter({
      ...registration,
      team: { ...registration.team, photoName: null, photoUrl: null },
    });
    await router.load();

    render(<RouterProvider router={router} />);

    await expect(screen.findByText(/ข้อมูลและไฟล์ที่บันทึกไว้/u)).resolves.toBeDefined();
    expect(screen.queryByText(/เบราว์เซอร์/u)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "กรอกฟอร์มต่อ" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/register/team");
    });
  });

  it("routes a participant with missing documents to participant one", async () => {
    const router = createModalRouter({
      ...registration,
      entrant1: { ...registration.entrant1, portraitPhotoName: null, portraitPhotoUrl: null },
    });
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "กรอกฟอร์มต่อ" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/register/entrant/1");
    });
  });
});
