import { z } from 'zod';

export const basicInfoSchema = z.object({
  name: z
    .string()
    .min(3, 'Workspace public name is required (minimum 3 characters)')
    .max(100, 'Workspace name cannot exceed 100 characters'),
  category: z.enum(['coworking_hub', 'business_lounge', 'creative_studio'], {
    error: 'Please select a space category'
  }),
  description: z
    .string()
    .max(200, 'Description cannot exceed 200 characters')
    .default(''),
  totalArea: z
    .number({ error: 'Please enter a valid numeric area in sqm' })
    .positive('Total usable area must be greater than 0'),
  contactPhone: z
    .string()
    .min(8, 'Please enter a valid booking hotline number'),
  contactEmail: z
    .string()
    .email('Please enter a valid venue support email address')
});

export const locationSchema = z.object({
  streetAddress: z
    .string()
    .min(5, 'Street address is required (building name and street number)'),
  district: z.string().min(2, 'Ward / District is required'),
  city: z.string().min(2, 'City is required'),
  floorSuite: z.string().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  entryNotes: z.string().default('')
});

export type BasicInfoSchemaValues = z.infer<typeof basicInfoSchema>;
export type LocationSchemaValues = z.infer<typeof locationSchema>;
