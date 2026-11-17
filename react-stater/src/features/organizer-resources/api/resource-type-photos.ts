export type ResourceTypePhoto = string | File;

function encodeOrder(photos: readonly ResourceTypePhoto[], uploads: File[]) {
  return photos.map((photo) => {
    if (typeof photo === 'string') return photo;
    const index = uploads.length;
    uploads.push(photo);
    return `upload:${index}`;
  });
}

export function resourceTypePhotoBody(
  input: object,
  photos: readonly ResourceTypePhoto[] | Record<number, readonly File[]>
) {
  const uploads: File[] = [];
  const order = Array.isArray(photos)
    ? encodeOrder(photos, uploads)
    : Object.fromEntries(
        Object.entries(photos).map(([key, entries]) => [key, encodeOrder(entries, uploads)])
      );
  const data = new FormData();
  const inputJson = JSON.stringify(input);
  // Leave room for multipart headers within the server's 20 MB request limit.
  if (
    uploads.reduce((size, file) => size + file.size, new Blob([inputJson]).size) >
    19 * 1024 * 1024
  ) {
    throw new Error('Tổng dung lượng ảnh vượt giới hạn gửi. Hãy chọn ảnh nhỏ hơn.');
  }
  data.append('input', new Blob([inputJson], { type: 'application/json' }));
  data.append('photoOrder', new Blob([JSON.stringify(order)], { type: 'application/json' }));
  for (const file of uploads) data.append('photos', file, file.name);
  return data;
}
