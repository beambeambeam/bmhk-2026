import { createContext, useContext, useMemo } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@bmhk-2026/client/auth-client";
import { client } from "@bmhk-2026/client/orpc";

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
  status: any;
  team: teamFormData;
  advisor: advisorFormData;
  entrant1: entrantFormData;
  entrant2: entrantFormData;
  entrant3: entrantFormData;
  terms: consentFormData;
  success: any;
}

const _infer = () =>
  useForm<RegistrationFormData, any, any, any, any, any, any, any, any, any, any, any>();
export type RegisterFormApi = ReturnType<typeof _infer>;
export const RegisterFormContext = createContext<RegisterFormApi | null>(null);

export function useRegisterForm() {
  const form = useContext(RegisterFormContext);
  if (!form) {
    throw new Error("useRegisterForm must be used within RegisterLayout only nga");
  }
  return form;
}

import { useEffect } from "react";
import { useUserSession } from "@/contexts/user-context";
import { useNavigate } from "@tanstack/react-router";

export function RegisterLayout() {
  const { statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData } =
    Route.useLoaderData();
  const session = useUserSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      navigate({ to: "/signin" });
    }

    const handleFocus = async () => {
      if (session.refetch) {
        await session.refetch();
      } else {
        const res = await authClient.getSession();
        if (res?.error || !res?.data) {
          navigate({ to: "/signin" });
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [session.isPending, session.data, session.refetch, navigate]);

  const formOptions = useMemo(
    () => ({
      defaultValues: {
        advisor: {
          chronicConditionsAndFirstAidNotes: advisorData?.chronicConditionsAndFirstAidNotes ?? "",
          dietaryRequirements: advisorData?.dietaryRequirements ?? "",
          drugAllergies: advisorData?.drugAllergies ?? "",
          email: advisorData?.email ?? "",
          firstNameEn: advisorData?.firstNameEn ?? "",
          firstNameTh: advisorData?.firstNameTh ?? "",
          foodAllergies: advisorData?.foodAllergies ?? "",
          identityDocumentFile: null,
          identityDocumentName: advisorData?.identityDocument?.originalName ?? null,
          identityDocumentUrl: advisorData?.identityDocument?.url ?? null,
          lastNameEn: advisorData?.lastNameEn ?? "",
          lastNameTh: advisorData?.lastNameTh ?? "",
          lineId: advisorData?.lineId ?? "",
          middleNameEn: advisorData?.middleNameEn ?? "",
          middleNameTh: advisorData?.middleNameTh ?? "",
          phone: advisorData?.phone ?? "",
          teacherStatusDocumentFile: null,
          teacherStatusDocumentName: advisorData?.teacherStatusDocument?.originalName ?? null,
          teacherStatusDocumentUrl: advisorData?.teacherStatusDocument?.url ?? null,
          titleEn: advisorData?.titleEn ?? "",
          titleTh: advisorData?.titleTh ?? "",
        },
        entrant1: {
          academicRecordDocumentFile: null,
          academicRecordDocumentName: entrant1Data?.academicRecordDocument?.originalName ?? null,
          academicRecordDocumentUrl: entrant1Data?.academicRecordDocument?.url ?? null,
          chronicConditionsAndFirstAidNotes: entrant1Data?.chronicConditionsAndFirstAidNotes ?? "",
          dateOfBirth: entrant1Data?.dateOfBirth ?? "",
          dietaryRequirements: entrant1Data?.dietaryRequirements ?? "",
          drugAllergies: entrant1Data?.drugAllergies ?? "",
          email: entrant1Data?.email ?? "",
          firstNameEn: entrant1Data?.firstNameEn ?? "",
          firstNameTh: entrant1Data?.firstNameTh ?? "",
          foodAllergies: entrant1Data?.foodAllergies ?? "",
          identityDocumentFile: null,
          identityDocumentName: entrant1Data?.identityDocument?.originalName ?? null,
          identityDocumentUrl: entrant1Data?.identityDocument?.url ?? null,
          lastNameEn: entrant1Data?.lastNameEn ?? "",
          lastNameTh: entrant1Data?.lastNameTh ?? "",
          lineId: entrant1Data?.lineId ?? "",
          middleNameEn: entrant1Data?.middleNameEn ?? "",
          middleNameTh: entrant1Data?.middleNameTh ?? "",
          phone: entrant1Data?.phone ?? "",
          portraitPhotoFile: null,
          portraitPhotoName: entrant1Data?.portraitPhoto?.originalName ?? null,
          portraitPhotoUrl: entrant1Data?.portraitPhoto?.url ?? null,
          titleEn: entrant1Data?.titleEn ?? "",
          titleTh: entrant1Data?.titleTh ?? "",
        },
        entrant2: {
          academicRecordDocumentFile: null,
          academicRecordDocumentName: entrant2Data?.academicRecordDocument?.originalName ?? null,
          academicRecordDocumentUrl: entrant2Data?.academicRecordDocument?.url ?? null,
          chronicConditionsAndFirstAidNotes: entrant2Data?.chronicConditionsAndFirstAidNotes ?? "",
          dateOfBirth: entrant2Data?.dateOfBirth ?? "",
          dietaryRequirements: entrant2Data?.dietaryRequirements ?? "",
          drugAllergies: entrant2Data?.drugAllergies ?? "",
          email: entrant2Data?.email ?? "",
          firstNameEn: entrant2Data?.firstNameEn ?? "",
          firstNameTh: entrant2Data?.firstNameTh ?? "",
          foodAllergies: entrant2Data?.foodAllergies ?? "",
          identityDocumentFile: null,
          identityDocumentName: entrant2Data?.identityDocument?.originalName ?? null,
          identityDocumentUrl: entrant2Data?.identityDocument?.url ?? null,
          lastNameEn: entrant2Data?.lastNameEn ?? "",
          lastNameTh: entrant2Data?.lastNameTh ?? "",
          lineId: entrant2Data?.lineId ?? "",
          middleNameEn: entrant2Data?.middleNameEn ?? "",
          middleNameTh: entrant2Data?.middleNameTh ?? "",
          phone: entrant2Data?.phone ?? "",
          portraitPhotoFile: null,
          portraitPhotoName: entrant2Data?.portraitPhoto?.originalName ?? null,
          portraitPhotoUrl: entrant2Data?.portraitPhoto?.url ?? null,
          titleEn: entrant2Data?.titleEn ?? "",
          titleTh: entrant2Data?.titleTh ?? "",
        },
        entrant3: {
          academicRecordDocumentFile: null,
          academicRecordDocumentName: entrant3Data?.academicRecordDocument?.originalName ?? null,
          academicRecordDocumentUrl: entrant3Data?.academicRecordDocument?.url ?? null,
          chronicConditionsAndFirstAidNotes: entrant3Data?.chronicConditionsAndFirstAidNotes ?? "",
          dateOfBirth: entrant3Data?.dateOfBirth ?? "",
          dietaryRequirements: entrant3Data?.dietaryRequirements ?? "",
          drugAllergies: entrant3Data?.drugAllergies ?? "",
          email: entrant3Data?.email ?? "",
          firstNameEn: entrant3Data?.firstNameEn ?? "",
          firstNameTh: entrant3Data?.firstNameTh ?? "",
          foodAllergies: entrant3Data?.foodAllergies ?? "",
          identityDocumentFile: null,
          identityDocumentName: entrant3Data?.identityDocument?.originalName ?? null,
          identityDocumentUrl: entrant3Data?.identityDocument?.url ?? null,
          lastNameEn: entrant3Data?.lastNameEn ?? "",
          lastNameTh: entrant3Data?.lastNameTh ?? "",
          lineId: entrant3Data?.lineId ?? "",
          middleNameEn: entrant3Data?.middleNameEn ?? "",
          middleNameTh: entrant3Data?.middleNameTh ?? "",
          phone: entrant3Data?.phone ?? "",
          portraitPhotoFile: null,
          portraitPhotoName: entrant3Data?.portraitPhoto?.originalName ?? null,
          portraitPhotoUrl: entrant3Data?.portraitPhoto?.url ?? null,
          titleEn: entrant3Data?.titleEn ?? "",
          titleTh: entrant3Data?.titleTh ?? "",
        },
        status: statusData || {},
        success: {},
        team: {
          name: teamData?.name || "",
          photoFile: null,
          photoName: teamData?.image?.originalName || null,
          photoUrl: teamData?.image?.url || null,
          school: teamData?.school || "",
          teamSize: teamData?.memberCount || 2,
        },
        terms: {
          codernTermsAccepted: termsData?.codernTermsAccepted ?? false,
          competitionRulesAccepted: termsData?.competitionRulesAccepted ?? false,
          guardianConsentObtained: termsData?.guardianConsentObtained ?? true,
          healthDataConsent: termsData?.healthDataConsent ?? true,
          privacyPolicyAccepted: termsData?.privacyPolicyAccepted ?? false,
          publicityMediaConsent: termsData?.publicityMediaConsent ?? true,
        },
      },
      onSubmit: async ({ value }: { value: RegistrationFormData }) => {
        //await api
        console.log("📦 Intercepted Payload:", JSON.stringify(value, null, 2));
      },
    }),
    [statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData],
  );

  const form = useForm<RegistrationFormData, any, any, any, any, any, any, any, any, any, any, any>(
    formOptions,
  );

  return (
    <RegisterFormContext.Provider value={form}>
      <Outlet />
    </RegisterFormContext.Provider>
  );
}

export const Route = createFileRoute("/register")({
  component: RegisterLayout,
  loader: async () => {
    try {
      const statusRes = await client.teamRegistrationStatus.get({});
      if (statusRes && statusRes.teamId) {
        const team = await client.teams.get({ id: statusRes.teamId });
        let advisor = null;
        try {
          advisor = await client.teamAdvisors.get({ teamId: statusRes.teamId });
        } catch (error: any) {
          if (
            error?.data?.code !== "TEAM_ADVISOR_NOT_FOUND" &&
            error?.status !== 404 &&
            !error?.message?.includes("not found")
          ) {
            console.error("Error fetching advisor", error);
          }
        }
        let entrant1 = null;
        let entrant2 = null;
        let entrant3 = null;
        try {
          entrant1 = await client.teamParticipants.get({ index: 1, teamId: statusRes.teamId });
        } catch {}
        try {
          entrant2 = await client.teamParticipants.get({ index: 2, teamId: statusRes.teamId });
        } catch {}
        if (team?.memberCount === 3) {
          try {
            entrant3 = await client.teamParticipants.get({ index: 3, teamId: statusRes.teamId });
          } catch {}
        }

        let terms = null;
        try {
          terms = await client.teamConsents.get({ teamId: statusRes.teamId });
        } catch {}

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
