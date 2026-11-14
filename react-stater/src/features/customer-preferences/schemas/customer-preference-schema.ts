import { z } from 'zod';

export const customerPreferenceSchema = z
  .object({
    districts: z
      .array(z.string().min(1, 'Tên khu vực không được để trống'))
      .max(5, 'Danh sách khu vực tối đa 5 quận')
      .default([]),
    amenityIds: z
      .array(z.number())
      .max(10, 'Danh sách tiện ích tối đa 10 tiện ích')
      .default([]),
    budgetMin: z
      .union([z.number().min(0, 'Ngân sách tối thiểu không được âm'), z.nan()])
      .optional()
      .nullable(),
    budgetMax: z
      .union([z.number().min(0, 'Ngân sách tối đa không được âm'), z.nan()])
      .optional()
      .nullable(),
    resourceCategory: z.enum(['DESK', 'ROOM', 'ANY']).default('ANY'),
    noiseLevel: z.enum(['QUIET', 'MODERATE', 'LIVELY']).optional().nullable(),
    purpose: z
      .enum(['STUDY', 'FREELANCE', 'TEAM_WORK', 'MEETING', 'EVENT', 'OTHER'])
      .optional()
      .nullable()
  })
  .refine(
    (data) => {
      if (
        data.budgetMin !== null &&
        data.budgetMin !== undefined &&
        !Number.isNaN(data.budgetMin) &&
        data.budgetMax !== null &&
        data.budgetMax !== undefined &&
        !Number.isNaN(data.budgetMax)
      ) {
        return data.budgetMin <= data.budgetMax;
      }
      return true;
    },
    {
      message: 'Ngân sách tối thiểu không được lớn hơn ngân sách tối đa',
      path: ['budgetMin']
    }
  )
  .refine(
    (data) => {
      const hasDistricts = (data.districts || []).length > 0;
      const hasSpecificCategory = data.resourceCategory && data.resourceCategory !== 'ANY';
      return hasDistricts || hasSpecificCategory;
    },
    {
      message: 'Vui lòng chọn ít nhất một khu vực (quận) hoặc một loại không gian cụ thể (Bàn hoặc Phòng)',
      path: ['districts']
    }
  );

export type CustomerPreferenceFormValues = z.infer<typeof customerPreferenceSchema>;

