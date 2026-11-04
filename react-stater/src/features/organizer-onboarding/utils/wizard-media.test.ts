import { test, describe } from 'node:test';
import assert from 'node:assert';

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024; // 5MB (BR-37)
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateMediaFile(file: { name: string; size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file || file.size === 0) {
    return { valid: false, error: 'File tải lên không được để trống.' };
  }

  if (!ALLOWED_MEDIA_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `${file.name} is not a supported format (PNG, JPG, WebP).`
    };
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    return {
      valid: false,
      error: `${file.name} exceeds 5MB limit (BR-37). Please select an image under 5MB.`
    };
  }

  return { valid: true };
}

describe('Workspace Media Upload Validation (BR-37)', () => {
  test('accepts valid JPEG, PNG, and WebP images within 5MB', () => {
    const validJpg = { name: 'photo.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' };
    const validPng = { name: 'logo.png', size: 4.9 * 1024 * 1024, type: 'image/png' };
    const validWebp = { name: 'cover.webp', size: 1024 * 500, type: 'image/webp' };

    assert.strictEqual(validateMediaFile(validJpg).valid, true);
    assert.strictEqual(validateMediaFile(validPng).valid, true);
    assert.strictEqual(validateMediaFile(validWebp).valid, true);
  });

  test('rejects files larger than 5MB according to BR-37', () => {
    const largeFile = { name: 'huge-image.jpg', size: 5 * 1024 * 1024 + 1, type: 'image/jpeg' };
    const result = validateMediaFile(largeFile);

    assert.strictEqual(result.valid, false);
    assert.match(result.error || '', /exceeds 5MB limit/);
  });

  test('rejects unsupported file formats like PDF or GIF', () => {
    const pdf = { name: 'brochure.pdf', size: 1024 * 1024, type: 'application/pdf' };
    const gif = { name: 'animation.gif', size: 1024 * 1024, type: 'image/gif' };

    assert.strictEqual(validateMediaFile(pdf).valid, false);
    assert.strictEqual(validateMediaFile(gif).valid, false);
  });

  test('rejects empty files', () => {
    const empty = { name: 'empty.png', size: 0, type: 'image/png' };
    const result = validateMediaFile(empty);

    assert.strictEqual(result.valid, false);
    assert.match(result.error || '', /không được để trống/);
  });
});

