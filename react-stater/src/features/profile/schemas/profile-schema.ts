import { z } from 'zod';

const NAME_REGEX = /^[\p{L}\p{M}\s'-]+$/u;
const PHONE_REGEX = /^(|(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7})$/;

export const profileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Tên không được để trống')
    .max(50, 'Độ dài tên không hợp lệ (tối đa 50 ký tự)')
    .regex(NAME_REGEX, 'Tên chỉ được chứa ký tự chữ cái và khoảng trắng'),
  lastName: z
    .string()
    .trim()
    .max(50, 'Độ dài họ đệm không hợp lệ (tối đa 50 ký tự)')
    .refine((val) => !val || NAME_REGEX.test(val), {
      message: 'Họ đệm chỉ được chứa ký tự chữ cái và khoảng trắng'
    })
    .optional()
    .default(''),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: 'Số điện thoại không hợp lệ (yêu cầu định dạng 10 chữ số hợp lệ tại Việt Nam)'
    })
    .optional()
    .default(''),
  birthDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d < new Date();
      },
      { message: 'Ngày sinh phải là ngày trong quá khứ' }
    )
    .default(''),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  avatar: z
    .string()
    .trim()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'Đường dẫn ảnh đại diện không đúng định dạng URL'
    })
    .optional()
    .default('')
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

