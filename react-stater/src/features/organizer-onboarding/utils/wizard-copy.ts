import type { OrganizerCopy } from '@/hooks/use-organizer-copy';

const categoryCopy: Record<string, [string, string]> = {
  coworking_hub: ['Dedicated Coworking Hub', 'Không gian làm việc chung'],
  business_lounge: ['Executive Business Lounge', 'Không gian thương gia'],
  creative_studio: ['Creative Studio Space', 'Không gian sáng tạo']
};

const dayCopy: Record<string, [string, string]> = {
  monday: ['Monday', 'Thứ Hai'],
  tuesday: ['Tuesday', 'Thứ Ba'],
  wednesday: ['Wednesday', 'Thứ Tư'],
  thursday: ['Thursday', 'Thứ Năm'],
  friday: ['Friday', 'Thứ Sáu'],
  saturday: ['Saturday', 'Thứ Bảy'],
  sunday: ['Sunday', 'Chủ Nhật']
};

const validationCopy: Record<string, string> = {
  'Workspace public name is required (minimum 3 characters)':
    'Tên không gian phải có ít nhất 3 ký tự.',
  'Workspace name cannot exceed 100 characters': 'Tên không gian không được vượt quá 100 ký tự.',
  'Please select a space category': 'Vui lòng chọn loại hình không gian.',
  'Please enter a valid booking hotline number':
    'Vui lòng nhập số điện thoại hỗ trợ đặt chỗ hợp lệ.',
  'Please enter a valid venue support email address': 'Vui lòng nhập email hỗ trợ hợp lệ.',
  'Please add at least 1 photo for your workspace gallery':
    'Vui lòng thêm ít nhất 1 ảnh không gian.',
  'Please select a primary cover photo': 'Vui lòng chọn ảnh bìa.',
  'Please designate a valid cover photo from the uploaded gallery':
    'Vui lòng chọn ảnh bìa từ thư viện ảnh đã tải lên.'
};

/** Translate presentation labels without changing persisted category or weekday values. */
export function getWizardCategoryLabel(category: string, c: OrganizerCopy): string {
  const copy = categoryCopy[category];
  return copy ? c(...copy) : category;
}

export function getWizardDayLabel(day: string, c: OrganizerCopy): string {
  const copy = dayCopy[day];
  return copy ? c(...copy) : day;
}

/** Keep unknown server messages intact instead of replacing their diagnostic details. */
export function getWizardValidationMessage(message: string, c: OrganizerCopy): string {
  const outsideFloor = message.match(
    /^Floor (\d+) cannot use these dimensions or corners: Resource (.+) is outside the floor canvas, including its rotation$/
  );
  if (outsideFloor) {
    return c(
      message,
      `Tầng ${outsideFloor[1]}: phòng/ghế ${outsideFloor[2]} nằm ngoài mặt bằng với kích thước hoặc góc bo đang chọn. Tăng kích thước tầng hoặc chỉnh vị trí trên sơ đồ rồi lưu lại.`
    );
  }
  if (
    message === 'This record changed. Reload before continuing' ||
    message === 'The workspace address changed. Reload before saving'
  ) {
    return c(
      message,
      'Dữ liệu địa điểm hoặc tầng không còn khớp với bản đang lưu. Tải lại dữ liệu mới nhất trước khi lưu tiếp.'
    );
  }
  const vietnamese = validationCopy[message];
  if (vietnamese) return c(message, vietnamese);
  if (message.startsWith('Giờ đóng cửa phải sau giờ mở cửa')) {
    return c(
      'Closing time must be after opening time for every open day.',
      'Giờ đóng cửa phải sau giờ mở cửa cho tất cả ngày hoạt động.'
    );
  }
  if (message.startsWith('Vui lòng cấu hình ít nhất 1 ngày mở cửa')) {
    return c(
      'Configure at least one open day or enable 24/7 access.',
      'Vui lòng cấu hình ít nhất 1 ngày mở cửa hoặc bật hoạt động 24/7.'
    );
  }
  return message;
}
