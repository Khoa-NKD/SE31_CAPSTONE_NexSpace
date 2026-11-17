export interface AiReferenceImage {
  mimeType: 'image/jpeg' | 'image/png';
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
    const scale = Math.min(1, 3072 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_DECODE');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Preserve lines and small symbols in diagrams. Fall back to JPEG for dense raster images.
    const lossless = file.type === 'image/png' ? canvas.toDataURL('image/png') : null;
    const mimeType = lossless && lossless.length <= 6990508 ? 'image/png' : 'image/jpeg';
    const preview = mimeType === 'image/png' ? lossless! : canvas.toDataURL('image/jpeg', 0.94);
    const base64 = preview.slice(preview.indexOf(',') + 1);
    if (base64.length > 6990508) throw new Error('IMAGE_SIZE');
    const thumbnailScale = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    canvas.width = Math.max(1, Math.round(canvas.width * thumbnailScale));
    canvas.height = Math.max(1, Math.round(canvas.height * thumbnailScale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const thumbnail = canvas.toDataURL('image/jpeg', 0.75);
    return { mimeType, base64, preview, thumbnail, name: file.name || 'Screenshot' };
  } finally {
    bitmap.close();
  }
}
