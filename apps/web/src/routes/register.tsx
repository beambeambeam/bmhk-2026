import { createContext, useContext, useEffect, useMemo } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@bmhk-2026/client/auth-client";
import { client } from "@bmhk-2026/client/orpc";
import { useUserSession } from "@/contexts/user-context";

export interface teamFormData {
  name: string;
  school: string;
  teamSize: number;
  photoFile: File | null;
  photoUrl?: string | null;
  photoName?: string | null;
}

export interface advisorFormData {
  titleTh: string;
  firstNameTh: string;
  middleNameTh: string;
  lastNameTh: string;
  titleEn: string;
  firstNameEn: string;
  middleNameEn: string;
  lastNameEn: string;
  email: string;
  phone: string;
  lineId: string;
  foodAllergies: string;
  dietaryRequirements: string;
  drugAllergies: string;
  chronicConditionsAndFirstAidNotes: string;
  identityDocumentFile: File | null;
  identityDocumentUrl?: string | null;
  identityDocumentName?: string | null;
  teacherStatusDocumentFile: File | null;
  teacherStatusDocumentUrl?: string | null;
  teacherStatusDocumentName?: string | null;
}
export interface entrantFormData {
  titleTh: string;
  firstNameTh: string;
  middleNameTh: string;
  lastNameTh: string;
  titleEn: string;
  firstNameEn: string;
  middleNameEn: string;
  lastNameEn: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  lineId: string;
  foodAllergies: string;
  dietaryRequirements: string;
  drugAllergies: string;
  chronicConditionsAndFirstAidNotes: string;
  portraitPhotoFile: File | null;
  portraitPhotoUrl?: string | null;
  portraitPhotoName?: string | null;
  identityDocumentFile: File | null;
  identityDocumentUrl?: string | null;
  identityDocumentName?: string | null;
  academicRecordDocumentFile: File | null;
  academicRecordDocumentUrl?: string | null;
  academicRecordDocumentName?: string | null;
}

export interface consentFormData {
  privacyPolicyAccepted: boolean;
  competitionRulesAccepted: boolean;
  codernTermsAccepted: boolean;
  publicityMediaConsent: boolean;
  healthDataConsent: boolean;
  guardianConsentObtained: boolean;
}

export interface RegistrationFormData {
  status: unknown;
  team: teamFormData;
  advisor: advisorFormData;
  entrant1: entrantFormData;
  entrant2: entrantFormData;
  entrant3: entrantFormData;
  terms: consentFormData;
  success: Record<string, unknown> | null;
}

/* eslint-disable react-hooks/rules-of-hooks */
/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
/* oxlint-disable no-unsafe-member-access */
function _infer() {
  return useForm({ defaultValues: {} as RegistrationFormData });
}
/* oxlint-enable react-hooks(rules-of-hooks) */
/* eslint-enable react-hooks/rules-of-hooks */
export type RegisterFormApi = ReturnType<typeof _infer>;
export const RegisterFormContext = createContext<RegisterFormApi | null>(null);

export function useRegisterForm() {
  const form = useContext(RegisterFormContext);
  if (!form) {
    throw new Error("useRegisterForm must be used within RegisterLayout only nga");
  }
  return form;
}

export const Route = createFileRoute("/register")({
  component: RegisterLayout,
  loader: async () => {
    try {
      const statusRes = await client.teamRegistrationStatus.get({});
      if (
        statusRes !== null &&
        typeof statusRes === "object" &&
        "teamId" in statusRes &&
        statusRes.teamId
      ) {
        const team = await client.teams.get({ id: statusRes.teamId });
        let advisor = null;
        try {
          advisor = await client.teamAdvisors.get({ teamId: statusRes.teamId });
        } catch (error: unknown) {
          if (
            typeof error === "object" &&
            error !== null &&
            (error as { data?: { code?: string } }).data?.code !== "TEAM_ADVISOR_NOT_FOUND" &&
            (error as { status?: number }).status !== 404 &&
            (error as { message?: string }).message?.includes("not found") !== true
          ) {
            console.error("Error fetching advisor", error);
          }
        }
        let entrant1 = null;
        let entrant2 = null;
        let entrant3 = null;
        try {
          entrant1 = await client.teamParticipants.get({ index: 1, teamId: statusRes.teamId });
        } catch {
          // Ignore error
        }
        try {
          entrant2 = await client.teamParticipants.get({ index: 2, teamId: statusRes.teamId });
        } catch {
          // Ignore error
        }
        if (team?.memberCount === 3) {
          try {
            entrant3 = await client.teamParticipants.get({ index: 3, teamId: statusRes.teamId });
          } catch {
            // Ignore error
          }
        }

        let terms = null;
        try {
          terms = await client.teamConsents.get({ teamId: statusRes.teamId });
        } catch {
          // Ignore error
        }

        return {
          advisorData: advisor,
          entrant1Data: entrant1,
          entrant2Data: entrant2,
          entrant3Data: entrant3,
          statusData: statusRes,
          teamData: team,
          termsData: terms,
        };
      }
      return {
        advisorData: null,
        entrant1Data: null,
        entrant2Data: null,
        entrant3Data: null,
        statusData: statusRes,
        teamData: null,
        termsData: null,
      };
    } catch (error) {
      console.error(error);
    }
    return {
      advisorData: null,
      entrant1Data: null,
      entrant2Data: null,
      entrant3Data: null,
      statusData: null,
      teamData: null,
      termsData: null,
    };
  },
});

// eslint-disable-next-line complexity
function getStr(obj: unknown, key: string): string {
  if (typeof obj === "object" && obj !== null) {
    const val: unknown = Reflect.get(obj, key);
    if (typeof val === "string") {
      return val;
    }
  }
  return "";
}

function getBool(obj: unknown, key: string, fallback: boolean): boolean {
  if (typeof obj === "object" && obj !== null) {
    const val: unknown = Reflect.get(obj, key);
    if (typeof val === "boolean") {
      return val;
    }
  }
  return fallback;
}

function getNum(obj: unknown, key: string, fallback: number): number {
  if (typeof obj === "object" && obj !== null) {
    const val: unknown = Reflect.get(obj, key);
    if (typeof val === "number") {
      return val;
    }
  }
  return fallback;
}

function getNestedStr(obj: unknown, key1: string, key2: string): string | null {
  if (typeof obj === "object" && obj !== null) {
    const nested: unknown = Reflect.get(obj, key1);
    if (typeof nested === "object" && nested !== null) {
      const val: unknown = Reflect.get(nested, key2);
      if (typeof val === "string") {
        return val;
      }
    }
  }
  return null;
}

function createFormOptions(
  statusData: unknown,
  teamData: unknown,
  advisorData: unknown,
  entrant1Data: unknown,
  entrant2Data: unknown,
  entrant3Data: unknown,
  termsData: unknown,
) {
  return {
    defaultValues: {
      advisor: {
        chronicConditionsAndFirstAidNotes: getStr(advisorData, "chronicConditionsAndFirstAidNotes"),
        dietaryRequirements: getStr(advisorData, "dietaryRequirements"),
        drugAllergies: getStr(advisorData, "drugAllergies"),
        email: getStr(advisorData, "email"),
        firstNameEn: getStr(advisorData, "firstNameEn"),
        firstNameTh: getStr(advisorData, "firstNameTh"),
        foodAllergies: getStr(advisorData, "foodAllergies"),
        identityDocumentFile: null,
        identityDocumentName: getNestedStr(advisorData, "identityDocument", "originalName"),
        identityDocumentUrl: getNestedStr(advisorData, "identityDocument", "url"),
        lastNameEn: getStr(advisorData, "lastNameEn"),
        lastNameTh: getStr(advisorData, "lastNameTh"),
        lineId: getStr(advisorData, "lineId"),
        middleNameEn: getStr(advisorData, "middleNameEn"),
        middleNameTh: getStr(advisorData, "middleNameTh"),
        phone: getStr(advisorData, "phone"),
        teacherStatusDocumentFile: null,
        teacherStatusDocumentName: getNestedStr(
          advisorData,
          "teacherStatusDocument",
          "originalName",
        ),
        teacherStatusDocumentUrl: getNestedStr(advisorData, "teacherStatusDocument", "url"),
        titleEn: getStr(advisorData, "titleEn"),
        titleTh: getStr(advisorData, "titleTh"),
      },
      entrant1: {
        academicRecordDocumentFile: null,
        academicRecordDocumentName: getNestedStr(
          entrant1Data,
          "academicRecordDocument",
          "originalName",
        ),
        academicRecordDocumentUrl: getNestedStr(entrant1Data, "academicRecordDocument", "url"),
        chronicConditionsAndFirstAidNotes: getStr(
          entrant1Data,
          "chronicConditionsAndFirstAidNotes",
        ),
        dateOfBirth: getStr(entrant1Data, "dateOfBirth"),
        dietaryRequirements: getStr(entrant1Data, "dietaryRequirements"),
        drugAllergies: getStr(entrant1Data, "drugAllergies"),
        email: getStr(entrant1Data, "email"),
        firstNameEn: getStr(entrant1Data, "firstNameEn"),
        firstNameTh: getStr(entrant1Data, "firstNameTh"),
        foodAllergies: getStr(entrant1Data, "foodAllergies"),
        identityDocumentFile: null,
        identityDocumentName: getNestedStr(entrant1Data, "identityDocument", "originalName"),
        identityDocumentUrl: getNestedStr(entrant1Data, "identityDocument", "url"),
        lastNameEn: getStr(entrant1Data, "lastNameEn"),
        lastNameTh: getStr(entrant1Data, "lastNameTh"),
        lineId: getStr(entrant1Data, "lineId"),
        middleNameEn: getStr(entrant1Data, "middleNameEn"),
        middleNameTh: getStr(entrant1Data, "middleNameTh"),
        phone: getStr(entrant1Data, "phone"),
        portraitPhotoFile: null,
        portraitPhotoName: getNestedStr(entrant1Data, "portraitPhoto", "originalName"),
        portraitPhotoUrl: getNestedStr(entrant1Data, "portraitPhoto", "url"),
        titleEn: getStr(entrant1Data, "titleEn"),
        titleTh: getStr(entrant1Data, "titleTh"),
      },
      entrant2: {
        academicRecordDocumentFile: null,
        academicRecordDocumentName: getNestedStr(
          entrant2Data,
          "academicRecordDocument",
          "originalName",
        ),
        academicRecordDocumentUrl: getNestedStr(entrant2Data, "academicRecordDocument", "url"),
        chronicConditionsAndFirstAidNotes: getStr(
          entrant2Data,
          "chronicConditionsAndFirstAidNotes",
        ),
        dateOfBirth: getStr(entrant2Data, "dateOfBirth"),
        dietaryRequirements: getStr(entrant2Data, "dietaryRequirements"),
        drugAllergies: getStr(entrant2Data, "drugAllergies"),
        email: getStr(entrant2Data, "email"),
        firstNameEn: getStr(entrant2Data, "firstNameEn"),
        firstNameTh: getStr(entrant2Data, "firstNameTh"),
        foodAllergies: getStr(entrant2Data, "foodAllergies"),
        identityDocumentFile: null,
        identityDocumentName: getNestedStr(entrant2Data, "identityDocument", "originalName"),
        identityDocumentUrl: getNestedStr(entrant2Data, "identityDocument", "url"),
        lastNameEn: getStr(entrant2Data, "lastNameEn"),
        lastNameTh: getStr(entrant2Data, "lastNameTh"),
        lineId: getStr(entrant2Data, "lineId"),
        middleNameEn: getStr(entrant2Data, "middleNameEn"),
        middleNameTh: getStr(entrant2Data, "middleNameTh"),
        phone: getStr(entrant2Data, "phone"),
        portraitPhotoFile: null,
        portraitPhotoName: getNestedStr(entrant2Data, "portraitPhoto", "originalName"),
        portraitPhotoUrl: getNestedStr(entrant2Data, "portraitPhoto", "url"),
        titleEn: getStr(entrant2Data, "titleEn"),
        titleTh: getStr(entrant2Data, "titleTh"),
      },
      entrant3: {
        academicRecordDocumentFile: null,
        academicRecordDocumentName: getNestedStr(
          entrant3Data,
          "academicRecordDocument",
          "originalName",
        ),
        academicRecordDocumentUrl: getNestedStr(entrant3Data, "academicRecordDocument", "url"),
        chronicConditionsAndFirstAidNotes: getStr(
          entrant3Data,
          "chronicConditionsAndFirstAidNotes",
        ),
        dateOfBirth: getStr(entrant3Data, "dateOfBirth"),
        dietaryRequirements: getStr(entrant3Data, "dietaryRequirements"),
        drugAllergies: getStr(entrant3Data, "drugAllergies"),
        email: getStr(entrant3Data, "email"),
        firstNameEn: getStr(entrant3Data, "firstNameEn"),
        firstNameTh: getStr(entrant3Data, "firstNameTh"),
        foodAllergies: getStr(entrant3Data, "foodAllergies"),
        identityDocumentFile: null,
        identityDocumentName: getNestedStr(entrant3Data, "identityDocument", "originalName"),
        identityDocumentUrl: getNestedStr(entrant3Data, "identityDocument", "url"),
        lastNameEn: getStr(entrant3Data, "lastNameEn"),
        lastNameTh: getStr(entrant3Data, "lastNameTh"),
        lineId: getStr(entrant3Data, "lineId"),
        middleNameEn: getStr(entrant3Data, "middleNameEn"),
        middleNameTh: getStr(entrant3Data, "middleNameTh"),
        phone: getStr(entrant3Data, "phone"),
        portraitPhotoFile: null,
        portraitPhotoName: getNestedStr(entrant3Data, "portraitPhoto", "originalName"),
        portraitPhotoUrl: getNestedStr(entrant3Data, "portraitPhoto", "url"),
        titleEn: getStr(entrant3Data, "titleEn"),
        titleTh: getStr(entrant3Data, "titleTh"),
      },
      status: typeof statusData === "object" && statusData !== null ? statusData : {},
      success: {},
      team: {
        name: getStr(teamData, "name"),
        photoFile: null,
        photoName: getNestedStr(teamData, "image", "originalName"),
        photoUrl: getNestedStr(teamData, "image", "url"),
        school: getStr(teamData, "school"),
        teamSize: getNum(teamData, "memberCount", 2),
      },
      terms: {
        codernTermsAccepted: getBool(termsData, "codernTermsAccepted", false),
        competitionRulesAccepted: getBool(termsData, "competitionRulesAccepted", false),
        guardianConsentObtained: getBool(termsData, "guardianConsentObtained", true),
        healthDataConsent: getBool(termsData, "healthDataConsent", true),
        privacyPolicyAccepted: getBool(termsData, "privacyPolicyAccepted", false),
        publicityMediaConsent: getBool(termsData, "publicityMediaConsent", true),
      },
    },
    onSubmit: ({ value }: { value: RegistrationFormData }) => {
      //await api
      console.log("📦 Intercepted Payload:", JSON.stringify(value, null, 2));
    },
  };
}

export function RegisterLayout() {
  const { statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData } =
    Route.useLoaderData();
  const session = useUserSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      void navigate({ to: "/signin" });
    }

    function handleFocus() {
      void (async () => {
        if (session.refetch === undefined) {
          const res = await authClient.getSession();
          if (res?.error || !res?.data) {
            void navigate({ to: "/signin" });
          }
        } else {
          await session.refetch();
        }
      })();
    }

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [session, navigate]);

  const formOptions = useMemo(
    () =>
      createFormOptions(
        statusData,
        teamData,
        advisorData,
        entrant1Data,
        entrant2Data,
        entrant3Data,
        termsData,
      ),
    [statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData],
  );

  const form = useForm({
    ...formOptions,
    defaultValues: formOptions.defaultValues as RegistrationFormData,
  });

  return (
    <RegisterFormContext.Provider value={form}>
      <Outlet />
    </RegisterFormContext.Provider>
  );
}
