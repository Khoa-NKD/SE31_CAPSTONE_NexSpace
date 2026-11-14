export interface AiReferenceImage {
  mimeType: 'image/jpeg';
  base64: string;
  preview: string;
  thumbnail: string;
  name: string;
}

/** Normalize supported browser images to bounded pixels, removing original metadata and transparency. */
export async function prepareAiReferenceImage(file: File): Promise<AiReferenceImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('IMAGE_TYPE');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('IMAGE_SIZE');
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > 10000 ||
      bitmap.height > 10000 ||
      bitmap.width * bitmap.height > 20000000
    )
      throw new Error('IMAGE_DIMENSIONS');
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_DECODE');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = preview.slice(preview.indexOf(',') + 1);
    if (base64.length > 6990508) throw new Error('IMAGE_SIZE');
    const thumbnailScale = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    canvas.width = Math.max(1, Math.round(canvas.width * thumbnailScale));
    canvas.height = Math.max(1, Math.round(canvas.height * thumbnailScale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const thumbnail = canvas.toDataURL('image/jpeg', 0.75);
    return { mimeType: 'image/jpeg', base64, preview, thumbnail, name: file.name || 'Screenshot' };
  } finally {
    bitmap.close();
  }
}
