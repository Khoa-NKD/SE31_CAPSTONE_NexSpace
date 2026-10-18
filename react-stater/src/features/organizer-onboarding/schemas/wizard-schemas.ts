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

export const dayScheduleSchema = z.object({
  day: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ]),
  label: z.string(),
  isOpen: z.boolean(),
  openTime: z.string(),
  closeTime: z.string()
});

export const operatingHoursSchema = z
  .object({
    is247: z.boolean(),
    schedule: z.array(dayScheduleSchema),
    blockHolidays: z.boolean(),
    allowGracePeriod: z.boolean()
  })
  .refine(
    (data) => {
      if (data.is247) return true;
      return data.schedule.some((item) => item.isOpen);
    },
    {
      message: 'At least one day must be configured as Open, or enable 24/7 Access',
      path: ['schedule']
    }
  );

export const amenitiesSchema = z
  .array(z.string())
  .min(1, 'Please select at least 1 amenity for your workspace');

export const mediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  dimension: z.string().optional(),
  caption: z.string().optional(),
  size: z.number().optional(),
  isCover: z.boolean()
});

export const mediaGallerySchema = z
  .object({
    items: z
      .array(mediaItemSchema)
      .min(1, 'Please add at least 1 photo for your workspace gallery'),
    coverPhotoId: z.string().min(1, 'Please select a primary cover photo')
  })
  .refine(
    (data) => {
      if (data.items.length === 0) return false;
      return data.items.some((item) => item.id === data.coverPhotoId || item.isCover);
    },
    {
      message: 'Please designate a valid cover photo from the uploaded gallery',
      path: ['coverPhotoId']
    }
  );

export type OperatingHoursSchemaValues = z.infer<typeof operatingHoursSchema>;
export type AmenitiesSchemaValues = z.infer<typeof amenitiesSchema>;
export type MediaGallerySchemaValues = z.infer<typeof mediaGallerySchema>;

export const floorItemSchema = z.object({
  id: z.string().min(1, 'Floor ID is required'),
  number: z.number().int(),
  name: z.string().min(2, 'Floor name is required').max(60),
  subtitle: z.string().optional(),
  usableAreaSqm: z.number().positive('Usable area must be greater than 0'),
  capacity: z.number().int().min(1, 'Floor capacity must be at least 1 person'),
  status: z.enum(['active', 'draft', 'maintenance']).default('active')
});

export const zoneItemSchema = z.object({
  id: z.string().min(1, 'Zone ID is required'),
  name: z.string().min(2, 'Zone name is required').max(60),
  code: z.string().min(2, 'Zone code is required').max(20),
  floorId: z.string().min(1, 'Associated floor is required'),
  type: z.enum(['quiet_focus', 'team_hub', 'meeting_suite', 'open_desk', 'custom']),
  color: z.string().min(4, 'Zone color identifier is required'),
  baseHourlyRate: z.number().min(0, 'Base rate must be non-negative'),
  areaSqm: z.number().positive('Floor area must be greater than 0'),
  capacity: z.number().int().min(1, 'Zone capacity must be at least 1'),
  occupiedCount: z.number().optional().default(0),
  amenities: z.array(z.string()).default([]),
  polygonPoints: z.string().optional()
});

export const floorPlanSchema = z.object({
  selectedFloorId: z.string().min(1, 'Please select an active floor'),
  floors: z.array(floorItemSchema).min(1, 'At least 1 floor must be configured'),
  zones: z.array(zoneItemSchema).min(1, 'At least 1 functional zone must be configured on the floor'),
  gridSnap: z.boolean().default(true),
  showDimensions: z.boolean().default(false),
  zoomLevel: z.number().min(25).max(300).default(100)
});

export type FloorItemSchemaValues = z.infer<typeof floorItemSchema>;
export type ZoneItemSchemaValues = z.infer<typeof zoneItemSchema>;
export type FloorPlanSchemaValues = z.infer<typeof floorPlanSchema>;
