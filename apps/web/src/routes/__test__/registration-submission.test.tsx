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
import { Toaster } from "sonner";

import { UserProvider } from "@/contexts/user-context";
import EntrantStep from "../register/entrant.$index";
import { getExpectedNextStep, RegisterFormContext } from "../register";
import { termsSchema } from "../register/terms";
import type { RegistrationFormData } from "../register";

const TEAM_ID = "019c7bb1-dbe0-7000-8000-000000000001";

const api = vi.hoisted(() => ({
  createConsents: vi.fn<(input: unknown) => Promise<unknown>>(),
  getStatus: vi.fn<() => Promise<unknown>>(),
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
      create: api.createConsents,
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
      get: api.getStatus,
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

function createRegistrationRouter(defaultValues: RegistrationFormData = registration) {
  function RegistrationTestRoot() {
    const form = useForm({ defaultValues });

    return (
      <UserProvider>
        <RegisterFormContext.Provider value={form}>
          <Outlet />
          <Toaster />
        </RegisterFormContext.Provider>
      </UserProvider>
    );
  }

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
  const teamRoute = createRoute({
    component: () => <p>Complete team information</p>,
    getParentRoute: () => rootRoute,
    path: "/register/team",
  });
  const advisorRoute = createRoute({
    component: () => <p>Complete advisor information</p>,
    getParentRoute: () => rootRoute,
    path: "/register/advisor",
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/register/entrant/2"] }),
    routeTree: rootRoute.addChildren([
      entrantRoute,
      successRoute,
      errorRoute,
      teamRoute,
      advisorRoute,
    ]),
  });
}

function DraftNextStepProbe({
  defaultValues = registration,
}: {
  defaultValues?: RegistrationFormData;
}) {
  const form = useForm({
    defaultValues,
  });

  return <p>{getExpectedNextStep(form)}</p>;
}

describe("registration submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(cleanup);

  it("requires health consent while allowing publicity consent to be declined", () => {
    const requiredTerms = {
      TermOfServicesAccepted: true,
      codernTermsAccepted: true,
      competitionRulesAccepted: true,
      privacyPolicyAccepted: true,
      publicityMediaConsent: false,
    };

    expect(() => termsSchema.parse(requiredTerms)).toThrow(/ข้อมูลสุขภาพ/u);
    expect(termsSchema.parse({ ...requiredTerms, healthDataConsent: true })).toMatchObject({
      publicityMediaConsent: false,
    });
  });

  it("resumes a complete draft at the final entrant step", () => {
    render(<DraftNextStepProbe />);

    expect(screen.getByText("/register/entrant/2")).toBeDefined();
  });

  it("allows a complete draft without an optional team photo to reach submission", () => {
    render(
      <DraftNextStepProbe
        defaultValues={{
          ...registration,
          status: { team: "IN_PROGRESS", teamId: TEAM_ID },
          team: { ...registration.team, photoName: null, photoUrl: null },
        }}
      />,
    );

    expect(screen.getByText("/register/entrant/2")).toBeDefined();
  });

  it("returns an advisor with a missing document to the advisor step", () => {
    render(
      <DraftNextStepProbe
        defaultValues={{
          ...registration,
          advisor: {
            ...registration.advisor,
            teacherStatusDocumentName: null,
            teacherStatusDocumentUrl: null,
          },
        }}
      />,
    );

    expect(screen.getByText("/register/advisor")).toBeDefined();
  });

  it("returns a named participant without a portrait to their step", () => {
    render(
      <DraftNextStepProbe
        defaultValues={{
          ...registration,
          entrant1: { ...entrant, portraitPhotoName: null, portraitPhotoUrl: null },
          status: { participant1: "IN_PROGRESS", teamId: TEAM_ID },
        }}
      />,
    );

    expect(screen.getByText("/register/entrant/1")).toBeDefined();
  });

  it("resumes a team without consent data at the terms step", () => {
    function MissingConsentNextStepProbe() {
      const defaultValues: RegistrationFormData = {
        ...registration,
        status: { submissionState: "DRAFT", teamId: TEAM_ID },
        terms: {
          ...registration.terms,
          TermOfServicesAccepted: false,
          codernTermsAccepted: false,
          competitionRulesAccepted: false,
          healthDataConsent: false,
          privacyPolicyAccepted: false,
        },
      };
      const form = useForm({
        defaultValues,
      });

      return <p>{getExpectedNextStep(form)}</p>;
    }

    render(<MissingConsentNextStepProbe />);

    expect(screen.getByText("/register/terms")).toBeDefined();
  });

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
    expect(
      screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }).hasAttribute("disabled"),
    ).toBeTruthy();

    submission.resolve({ submissionState: "SUBMITTED", teamId: TEAM_ID });

    await expect(screen.findByText("Registration submitted")).resolves.toBeDefined();
  });

  it("derives guardian consent from the accepted privacy policy", async () => {
    api.updateParticipant.mockResolvedValue({});
    api.updateConsents.mockResolvedValue({});
    api.submitRegistration.mockResolvedValue({ submissionState: "SUBMITTED", teamId: TEAM_ID });
    const router = createRegistrationRouter({
      ...registration,
      terms: { ...registration.terms, guardianConsentObtained: false },
    });
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }));

    await expect(screen.findByText("Registration submitted")).resolves.toBeDefined();
    expect(api.updateConsents).toHaveBeenCalledWith({
      data: {
        codernTermsAccepted: true,
        competitionRulesAccepted: true,
        guardianConsentObtained: true,
        healthDataConsent: true,
        privacyPolicyAccepted: true,
        publicityMediaConsent: true,
      },
      teamId: TEAM_ID,
    });
  });

  it("recreates missing consent data before final submission", async () => {
    api.updateParticipant.mockResolvedValue({});
    api.updateConsents.mockRejectedValue(new Error("Consent not found"));
    api.createConsents.mockResolvedValue({});
    api.submitRegistration.mockResolvedValue({ submissionState: "SUBMITTED", teamId: TEAM_ID });
    const router = createRegistrationRouter({
      ...registration,
      terms: {
        ...registration.terms,
        guardianConsentObtained: false,
        publicityMediaConsent: false,
      },
    });
    await router.load();

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }));

    await expect(screen.findByText("Registration submitted")).resolves.toBeDefined();
    expect(api.createConsents).toHaveBeenCalledWith({
      codernTermsAccepted: true,
      competitionRulesAccepted: true,
      guardianConsentObtained: true,
      healthDataConsent: true,
      privacyPolicyAccepted: true,
      publicityMediaConsent: false,
      teamId: TEAM_ID,
    });
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

  it.each([
    {
      destination: "Complete team information",
      message: "กรุณาตรวจสอบข้อมูลทีมให้ครบถ้วน",
      section: "team",
    },
    {
      destination: "Complete advisor information",
      message: "กรุณากรอกข้อมูลอาจารย์และแนบเอกสารให้ครบถ้วน",
      section: "advisor",
    },
    {
      destination: "เอกสารสำหรับผู้เข้าแข่งขันคนที่ 1",
      message: "กรุณากรอกข้อมูลและแนบเอกสารของผู้เข้าแข่งขันคนที่ 1 ให้ครบถ้วน",
      section: "participant1",
    },
  ])(
    "directs an incomplete submission back to $section with an explanation",
    async ({ destination, message, section }) => {
      api.updateConsents.mockResolvedValue({});
      api.submitRegistration.mockRejectedValue({
        code: "TEAM_REGISTRATION_INCOMPLETE",
        status: 409,
      });
      api.getStatus.mockResolvedValue({
        advisor: "COMPLETED",
        isComplete: false,
        memberCount: 2,
        participant1: "COMPLETED",
        participant2: "COMPLETED",
        participant3: "NOT_APPLICABLE",
        submissionState: "DRAFT",
        team: "COMPLETED",
        teamId: TEAM_ID,
        termsAndConditions: "COMPLETED",
        [section]: "IN_PROGRESS",
      });
      const router = createRegistrationRouter();
      await router.load();

      render(<RouterProvider router={router} />);
      fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนเข้าแข่งขัน" }));

      await expect(screen.findByText(destination)).resolves.toBeDefined();
      expect(screen.getByText(message)).toBeDefined();
      expect(screen.queryByText("Registration failed")).toBeNull();
    },
  );
});
