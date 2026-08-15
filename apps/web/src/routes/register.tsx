import { createContext, useContext, useMemo } from 'react'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import {useForm} from '@tanstack/react-form'
import { authClient } from "@bmhk-2026/client/auth-client";
import { client } from "@bmhk-2026/client/orpc";

export interface teamFormData{
  name: string                                                                                                          
  school: string                                                                                                        
  teamSize: number                                                                                                      
  photoFile: File | null 
  photoUrl?: string | null
  photoName?: string | null
}

export interface advisorFormData{
  titleTh: string                                                                                                       
  firstNameTh: string
  middleNameTh: string                                                                                                   
  lastNameTh: string                                                                                                    
  titleEn: string                                                                                                       
  firstNameEn: string   
  middleNameEn: string                                                                                                
  lastNameEn: string                                                                                                    
  email: string                                                                                                         
  phone: string                                                                                                         
  lineId: string
  foodAllergies: string
  dietaryRequirements: string
  drugAllergies: string
  chronicConditionsAndFirstAidNotes: string
  identityDocumentFile: File | null
  identityDocumentUrl?: string | null
  identityDocumentName?: string | null
  teacherStatusDocumentFile: File | null
  teacherStatusDocumentUrl?: string | null
  teacherStatusDocumentName?: string | null
}
export interface entrantFormData{
  titleTh: string,
  firstNameTh: string,
  middleNameTh: string,
  lastNameTh: string,                                                                   
  titleEn: string,
  firstNameEn: string, 
  middleNameEn: string,
  lastNameEn: string,                                                                   
  dateOfBirth: string,
  email: string, 
  phone: string,
  lineId: string,                                                              
  foodAllergies: string,
  dietaryRequirements: string,
  drugAllergies: string,                                                  
  chronicConditionsAndFirstAidNotes: string,                                                                          
  portraitPhotoFile: File | null,
  portraitPhotoUrl?: string | null,
  portraitPhotoName?: string | null,
  identityDocumentFile: File | null,
  identityDocumentUrl?: string | null,
  identityDocumentName?: string | null,
  academicRecordDocumentFile: File | null,
  academicRecordDocumentUrl?: string | null,
  academicRecordDocumentName?: string | null,
}

export interface consentFormData {
  privacyPolicyAccepted: boolean,                                                                                        
  competitionRulesAccepted: boolean,                                                                                  
  codernTermsAccepted: boolean,                                                                                          
  publicityMediaConsent: boolean,                                                                                        
  healthDataConsent: boolean,                                                                                            
  guardianConsentObtained: boolean,   
}

export interface RegistrationFormData {                                                                                   
  status: any,
  team: teamFormData,                                                                                                                     
  advisor: advisorFormData,
  entrant1: entrantFormData,
  entrant2: entrantFormData,
  entrant3: entrantFormData,
  terms: consentFormData,
  success: any
}


const _infer = () => useForm<RegistrationFormData,any,any,any,any,any,any,any,any,any,any,any>()
export type RegisterFormApi = ReturnType<typeof _infer>
export const RegisterFormContext = createContext<RegisterFormApi | null>(null)

export function useRegisterForm(){
  const form = useContext(RegisterFormContext)
  if (!form){
    throw new Error('useRegisterForm must be used within RegisterLayout only nga')
  }
  return form
}



import { useEffect } from 'react'
import { useUserSession } from '@/contexts/user-context'
import { useNavigate } from '@tanstack/react-router'

export function RegisterLayout(){
  const { statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData } = Route.useLoaderData()
  const session = useUserSession()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (!session.isPending && !session.data) {
      navigate({ to: '/signin' })
    }

    const handleFocus = async () => {
      if (session.refetch) {
        await session.refetch();
      } else {
        const res = await authClient.getSession();
        if (res?.error || !res?.data) {
          navigate({ to: '/signin' });
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session.isPending, session.data, session.refetch, navigate])

  const userEmail = session.data?.user?.email || ''

  const formOptions = useMemo(() => ({
    defaultValues: {
      status: statusData || {},
      team : {
        name: teamData?.name || '',
        school: teamData?.school || '',
        teamSize: teamData?.memberCount || 2,
        photoFile: null,
        photoUrl: teamData?.image?.url || null,
        photoName: teamData?.image?.originalName || null
      },
      advisor: {
        titleTh: advisorData?.titleTh ?? '', 
        firstNameTh: advisorData?.firstNameTh ?? '', 
        middleNameTh: advisorData?.middleNameTh ?? '', 
        lastNameTh: advisorData?.lastNameTh ?? '',
        titleEn: advisorData?.titleEn ?? '', 
        firstNameEn: advisorData?.firstNameEn ?? '', 
        middleNameEn: advisorData?.middleNameEn ?? '', 
        lastNameEn: advisorData?.lastNameEn ?? '',
        email: advisorData?.email ?? '', 
        phone: advisorData?.phone ?? '',
        lineId: advisorData?.lineId ?? '',
        foodAllergies: advisorData?.foodAllergies ?? '', 
        dietaryRequirements: advisorData?.dietaryRequirements ?? '', 
        drugAllergies: advisorData?.drugAllergies ?? '',
        chronicConditionsAndFirstAidNotes: advisorData?.chronicConditionsAndFirstAidNotes ?? '',
        identityDocumentFile: null, 
        identityDocumentUrl: advisorData?.identityDocument?.url ?? null,
        identityDocumentName: advisorData?.identityDocument?.originalName ?? null,
        teacherStatusDocumentFile: null,
        teacherStatusDocumentUrl: advisorData?.teacherStatusDocument?.url ?? null,
        teacherStatusDocumentName: advisorData?.teacherStatusDocument?.originalName ?? null,
      },
      entrant1: {
        titleTh: entrant1Data?.titleTh ?? '', firstNameTh: entrant1Data?.firstNameTh ?? '', middleNameTh: entrant1Data?.middleNameTh ?? '', lastNameTh: entrant1Data?.lastNameTh ?? '',                                                                   
        titleEn: entrant1Data?.titleEn ?? '', firstNameEn: entrant1Data?.firstNameEn ?? '', middleNameEn: entrant1Data?.middleNameEn ?? '', lastNameEn: entrant1Data?.lastNameEn ?? '',                                                                   
        dateOfBirth: entrant1Data?.dateOfBirth ?? '', email: entrant1Data?.email ?? '', phone: entrant1Data?.phone ?? '', lineId: entrant1Data?.lineId ?? '',                                                              
        foodAllergies: entrant1Data?.foodAllergies ?? '', dietaryRequirements: entrant1Data?.dietaryRequirements ?? '', drugAllergies: entrant1Data?.drugAllergies ?? '',                                                  
        chronicConditionsAndFirstAidNotes: entrant1Data?.chronicConditionsAndFirstAidNotes ?? '',                                                                          
        portraitPhotoFile: null, portraitPhotoUrl: entrant1Data?.portraitPhoto?.url ?? null, portraitPhotoName: entrant1Data?.portraitPhoto?.originalName ?? null,
        identityDocumentFile: null, identityDocumentUrl: entrant1Data?.identityDocument?.url ?? null, identityDocumentName: entrant1Data?.identityDocument?.originalName ?? null,
        academicRecordDocumentFile: null, academicRecordDocumentUrl: entrant1Data?.academicRecordDocument?.url ?? null, academicRecordDocumentName: entrant1Data?.academicRecordDocument?.originalName ?? null,
      },
      entrant2: {
        titleTh: entrant2Data?.titleTh ?? '', firstNameTh: entrant2Data?.firstNameTh ?? '', middleNameTh: entrant2Data?.middleNameTh ?? '', lastNameTh: entrant2Data?.lastNameTh ?? '',                                                                   
        titleEn: entrant2Data?.titleEn ?? '', firstNameEn: entrant2Data?.firstNameEn ?? '', middleNameEn: entrant2Data?.middleNameEn ?? '', lastNameEn: entrant2Data?.lastNameEn ?? '',                                                                   
        dateOfBirth: entrant2Data?.dateOfBirth ?? '', email: entrant2Data?.email ?? '', phone: entrant2Data?.phone ?? '', lineId: entrant2Data?.lineId ?? '',                                                              
        foodAllergies: entrant2Data?.foodAllergies ?? '', dietaryRequirements: entrant2Data?.dietaryRequirements ?? '', drugAllergies: entrant2Data?.drugAllergies ?? '',                                                  
        chronicConditionsAndFirstAidNotes: entrant2Data?.chronicConditionsAndFirstAidNotes ?? '',                                                                          
        portraitPhotoFile: null, portraitPhotoUrl: entrant2Data?.portraitPhoto?.url ?? null, portraitPhotoName: entrant2Data?.portraitPhoto?.originalName ?? null,
        identityDocumentFile: null, identityDocumentUrl: entrant2Data?.identityDocument?.url ?? null, identityDocumentName: entrant2Data?.identityDocument?.originalName ?? null,
        academicRecordDocumentFile: null, academicRecordDocumentUrl: entrant2Data?.academicRecordDocument?.url ?? null, academicRecordDocumentName: entrant2Data?.academicRecordDocument?.originalName ?? null,
      },
      entrant3: {
        titleTh: entrant3Data?.titleTh ?? '', firstNameTh: entrant3Data?.firstNameTh ?? '', middleNameTh: entrant3Data?.middleNameTh ?? '', lastNameTh: entrant3Data?.lastNameTh ?? '',                                                                   
        titleEn: entrant3Data?.titleEn ?? '', firstNameEn: entrant3Data?.firstNameEn ?? '', middleNameEn: entrant3Data?.middleNameEn ?? '', lastNameEn: entrant3Data?.lastNameEn ?? '',                                                                   
        dateOfBirth: entrant3Data?.dateOfBirth ?? '', email: entrant3Data?.email ?? '', phone: entrant3Data?.phone ?? '', lineId: entrant3Data?.lineId ?? '',                                                              
        foodAllergies: entrant3Data?.foodAllergies ?? '', dietaryRequirements: entrant3Data?.dietaryRequirements ?? '', drugAllergies: entrant3Data?.drugAllergies ?? '',                                                  
        chronicConditionsAndFirstAidNotes: entrant3Data?.chronicConditionsAndFirstAidNotes ?? '',                                                                          
        portraitPhotoFile: null, portraitPhotoUrl: entrant3Data?.portraitPhoto?.url ?? null, portraitPhotoName: entrant3Data?.portraitPhoto?.originalName ?? null,
        identityDocumentFile: null, identityDocumentUrl: entrant3Data?.identityDocument?.url ?? null, identityDocumentName: entrant3Data?.identityDocument?.originalName ?? null,
        academicRecordDocumentFile: null, academicRecordDocumentUrl: entrant3Data?.academicRecordDocument?.url ?? null, academicRecordDocumentName: entrant3Data?.academicRecordDocument?.originalName ?? null,
      },
      terms: {
        privacyPolicyAccepted: termsData?.privacyPolicyAccepted ?? false,
        competitionRulesAccepted: termsData?.competitionRulesAccepted ?? false,
        codernTermsAccepted: termsData?.codernTermsAccepted ?? false,
        publicityMediaConsent: termsData?.publicityMediaConsent ?? true,
        healthDataConsent: termsData?.healthDataConsent ?? true,
        guardianConsentObtained: termsData?.guardianConsentObtained ?? true, 
      },
      success: {},
    },
    onSubmit: async ({value}: {value: RegistrationFormData}) => {
      //await api
      console.log('📦 Intercepted Payload:', JSON.stringify(value, null, 2))
    }
  }), [statusData, teamData, advisorData, entrant1Data, entrant2Data, entrant3Data, termsData])

  const form = useForm<RegistrationFormData,any,any,any,any,any,any,any,any,any,any,any>(formOptions)

  return( <RegisterFormContext.Provider value={form}>
    <Outlet />
  </RegisterFormContext.Provider>)

}

export const Route = createFileRoute('/register')({
  loader: async () => {
    try {
      const statusRes = await client.teamRegistrationStatus.get({})
      if (statusRes && statusRes.teamId) {
        const team = await client.teams.get({ id: statusRes.teamId })
        let advisor = null
        try {
          advisor = await client.teamAdvisors.get({ teamId: statusRes.teamId })
        } catch (e: any) {
          if (e?.data?.code !== 'TEAM_ADVISOR_NOT_FOUND' && e?.status !== 404 && !e?.message?.includes('not found')) {
            console.error('Error fetching advisor', e)
          }
        }
        let entrant1 = null
        let entrant2 = null
        let entrant3 = null
        try { entrant1 = await client.teamParticipants.get({ teamId: statusRes.teamId, index: 1 }) } catch (e) { }
        try { entrant2 = await client.teamParticipants.get({ teamId: statusRes.teamId, index: 2 }) } catch (e) { }
        if (team?.memberCount === 3) {
          try { entrant3 = await client.teamParticipants.get({ teamId: statusRes.teamId, index: 3 }) } catch (e) { }
        }

        let terms = null
        try { terms = await client.teamConsents.get({ teamId: statusRes.teamId }) } catch (e) { }

        return { statusData: statusRes, teamData: team, advisorData: advisor, entrant1Data: entrant1, entrant2Data: entrant2, entrant3Data: entrant3, termsData: terms }
      }
      return { statusData: statusRes, teamData: null, advisorData: null, entrant1Data: null, entrant2Data: null, entrant3Data: null, termsData: null }
    } catch (e) {
      console.error(e)
    }
    return { statusData: null, teamData: null, advisorData: null, entrant1Data: null, entrant2Data: null, entrant3Data: null, termsData: null }
  },
  component: RegisterLayout
})