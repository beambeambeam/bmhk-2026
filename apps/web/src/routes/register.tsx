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
  teacherStatusDocumentFile: File | null
}
export interface entrantFormData{

  titleTh: string,
  firstNameTh: string,
  middleNameTh: string
  lastNameTh: string,                                                                   
  titleEn: string,
  firstNameEn: string, 
  middleNameEn: string
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
  identityDocumentFile: File | null,
  academicRecordDocumentFile: File | null,
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



export function RegisterLayout(){
  const { statusData, teamData } = Route.useLoaderData()
  const { userSession } = Route.useRouteContext()
  const userEmail = userSession?.user?.email || ''

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
        titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',
        titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',
        email: userEmail, phone: '',lineId: '',
        foodAllergies: '', dietaryRequirements: '', drugAllergies: '',
        chronicConditionsAndFirstAidNotes: '',
        identityDocumentFile: null, teacherStatusDocumentFile: null,
      },

      entrant1:
        // entrant 1
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: userEmail, phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        },
        entrant2:
        // entrant 2
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: userEmail, phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        },
        entrant3:
        // entrant 3
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: userEmail, phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        }
      ,
      terms: {
        privacyPolicyAccepted: false,                                                                                     
        competitionRulesAccepted: false,                                                                                  
        codernTermsAccepted: false,                                                                                       
        publicityMediaConsent: true,                                                                                     
        healthDataConsent: true,                                                                                         
        guardianConsentObtained: true, 
      },
      success: {},
    },
    onSubmit: async ({value}: {value: RegistrationFormData}) => {
      //await api
      console.log('📦 Intercepted Payload:', JSON.stringify(value, null, 2))
    }
  }), [statusData, teamData])

  const form = useForm<RegistrationFormData,any,any,any,any,any,any,any,any,any,any,any>(formOptions)

  return( <RegisterFormContext.Provider value={form}>
    <Outlet />
  </RegisterFormContext.Provider>)

}

export const Route = createFileRoute('/register')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({
        to: "/signin",
      });
    }
    return { userSession: session.data };
  },
  loader: async () => {
    try {
      const statusRes = await client.teamRegistrationStatus.get({})
      if (statusRes && statusRes.teamId) {
        const team = await client.teams.get({ id: statusRes.teamId })
        return { statusData: statusRes, teamData: team }
      }
      return { statusData: statusRes, teamData: null }
    } catch (e) {
      console.error(e)
    }
    return { statusData: null, teamData: null }
  },
  component: RegisterLayout
})