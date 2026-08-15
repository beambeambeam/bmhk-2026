import { createContext, useContext, useMemo } from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import {useForm} from '@tanstack/react-form'

export interface teamFormData{
  name: string                                                                                                          
  school: string                                                                                                        
  teamSize: number                                                                                                      
  photoFile: File | null 
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
  team: teamFormData,                                                                                                                     
  advisor: advisorFormData,
  entrants1: entrantFormData,
  entrants2: entrantFormData,
  entrants3: entrantFormData,
  consents: consentFormData
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
  const formOptions = useMemo(() => ({
    defaultValues: {
      team : {name: '', school: '', teamSize: 2, photoFile: null },
      advisor: {
        titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',
        titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',
        email: '', phone: '',lineId: '',
        foodAllergies: '', dietaryRequirements: '', drugAllergies: '',
        chronicConditionsAndFirstAidNotes: '',
        identityDocumentFile: null, teacherStatusDocumentFile: null,
      },

      entrants1:
        // entrant 1
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: '', phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        },
        entrants2:
        // entrant 2
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: '', phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        },
        entrants3:
        // entrant 3
        {
          titleTh: '', firstNameTh: '', middleNameTh: '', lastNameTh: '',                                                                   
          titleEn: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',                                                                   
          dateOfBirth: '', email: '', phone: '', lineId: '',                                                              
          foodAllergies: '', dietaryRequirements: '', drugAllergies: '',                                                  
          chronicConditionsAndFirstAidNotes: '',                                                                          
          portraitPhotoFile: null, identityDocumentFile: null, academicRecordDocumentFile: null,
        }
      ,
      consents: {
        privacyPolicyAccepted: false,                                                                                     
        competitionRulesAccepted: false,                                                                                  
        codernTermsAccepted: false,                                                                                       
        publicityMediaConsent: true,                                                                                     
        healthDataConsent: true,                                                                                         
        guardianConsentObtained: true, 
      },
    },
    onSubmit: async ({value}: {value: RegistrationFormData}) => {
      //await api
      console.log('📦 Intercepted Payload:', JSON.stringify(value, null, 2))
    }
  }), [])

  const form = useForm<RegistrationFormData,any,any,any,any,any,any,any,any,any,any,any>(formOptions)

  return( <RegisterFormContext.Provider value={form}>
    <Outlet />
  </RegisterFormContext.Provider>)

}

export const Route = createFileRoute('/register')({
  component: RegisterLayout
})