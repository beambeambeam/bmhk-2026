import { z } from "zod";

export const registrationPersonFieldRefinements = {
  chronicConditionsAndFirstAidNotes: (schema: z.ZodString) => schema.trim().min(1).max(2000),
  dietaryRequirements: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  drugAllergies: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  email: (schema: z.ZodString) => schema.trim().min(1).max(254).pipe(z.email()),
  firstNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  firstNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  foodAllergies: (schema: z.ZodString) => schema.trim().min(1).max(1000),
  lastNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  lastNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  lineId: (schema: z.ZodString) => schema.trim().min(1).max(100),
  middleNameEn: (schema: z.ZodString) => schema.trim().min(1).max(100),
  middleNameTh: (schema: z.ZodString) => schema.trim().min(1).max(100),
  phone: (schema: z.ZodString) => schema.trim().min(1).max(32),
  titleEn: (schema: z.ZodString) => schema.trim().min(1).max(50),
  titleTh: (schema: z.ZodString) => schema.trim().min(1).max(50),
};

export const registrationPersonWritableFields = {
  chronicConditionsAndFirstAidNotes: true,
  dietaryRequirements: true,
  drugAllergies: true,
  email: true,
  firstNameEn: true,
  firstNameTh: true,
  foodAllergies: true,
  lastNameEn: true,
  lastNameTh: true,
  lineId: true,
  middleNameEn: true,
  middleNameTh: true,
  phone: true,
  titleEn: true,
  titleTh: true,
} as const;

export const optionalRegistrationPersonFields = {
  chronicConditionsAndFirstAidNotes: true,
  dietaryRequirements: true,
  drugAllergies: true,
  foodAllergies: true,
  lineId: true,
  middleNameEn: true,
  middleNameTh: true,
} as const;
