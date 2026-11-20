/** Reduce transport size without cropping, upscaling or changing already-small files. */
export async function optimizeIdentityPhoto(file: File): Promise<File> {
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    file.size < 256 * 1024 ||
    file.size > 5 * 1024 * 1024 ||
    typeof createImageBitmap !== 'function'
  )
    return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    if (Math.min(bitmap.width, bitmap.height) < 200 || bitmap.width * bitmap.height > 12_000_000)
      return file;
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    if (Math.min(canvas.width, canvas.height) < 200) return file;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.94)
    );
    if (!blob || blob.type !== 'image/jpeg' || blob.size >= file.size * 0.9) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });
  } catch {
    // Unsupported decoders keep the original; backend format/OCR validation still applies.
    return file;
  } finally {
    bitmap?.close();
  }
}
