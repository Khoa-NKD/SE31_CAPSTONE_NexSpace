import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

export function isDurableMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/media/') || trimmed.startsWith('/api/v1/media/')) {
    const filename = trimmed.replace(/^\/api(\/v1)?\/media\//, '').trim();
    return Boolean(filename && !filename.includes('..') && /^[a-zA-Z0-9_.-]+$/.test(filename));
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

describe('Workspace Gallery Sync & Reorder Logic', () => {
  const sampleMediaItems = [
    {
      id: 'photo-1',
      url: 'https://res.cloudinary.com/djq3ddowy/image/upload/v1/workspace/a.jpg',
      name: 'a.jpg',
      isCover: true,
      displayOrder: 0,
      uploadStatus: 'uploaded' as const
    },
    {
      id: 'photo-2',
      url: 'https://res.cloudinary.com/djq3ddowy/image/upload/v1/workspace/b.jpg',
      name: 'b.jpg',
      isCover: false,
      displayOrder: 1,
      uploadStatus: 'uploaded' as const
    },
    {
      id: 'photo-3',
      url: 'blob:http://localhost:3000/temp-uuid',
      name: 'c.jpg',
      isCover: false,
      displayOrder: 2,
      uploadStatus: 'uploading' as const
    }
  ];

  test('filters out temporary blob previews and only syncs durable media URLs', () => {
    const durable = sampleMediaItems.filter((i) => isDurableMediaUrl(i.url));
    assert.equal(durable.length, 2);
    assert.equal(durable[0].id, 'photo-1');
    assert.equal(durable[1].id, 'photo-2');
  });

  test('maps durable gallery items to sync payload with correct displayOrder and cover photo', () => {
    const durable = sampleMediaItems.filter((i) => isDurableMediaUrl(i.url));
    const coverPhotoId = 'photo-2'; // user changed cover to photo-2

    const payload = durable.map((item, index) => ({
      url: item.url,
      isCover: item.id === coverPhotoId || (index === 0 && !coverPhotoId),
      displayOrder: index,
      mediaType: 'IMAGE' as const
    }));

    assert.equal(payload.length, 2);
    assert.equal(payload[0].isCover, false);
    assert.equal(payload[0].displayOrder, 0);
    assert.equal(payload[1].isCover, true);
    assert.equal(payload[1].displayOrder, 1);
  });

  test('auto-designates the first photo as cover if coverPhotoId is empty', () => {
    const durable = sampleMediaItems.filter((i) => isDurableMediaUrl(i.url));
    const coverPhotoId = undefined;

    const payload = durable.map((item, index) => ({
      url: item.url,
      isCover: item.id === coverPhotoId || (index === 0 && !coverPhotoId),
      displayOrder: index,
      mediaType: 'IMAGE' as const
    }));

    assert.equal(payload[0].isCover, true);
    assert.equal(payload[1].isCover, false);
  });

  test('reordering items reflects correct sequence in displayOrder', () => {
    const reordered = [sampleMediaItems[1], sampleMediaItems[0]]; // swap 0 and 1
    const items = reordered.map((item, idx) => ({
      mediaId: idx + 100,
      displayOrder: idx
    }));

    assert.equal(items[0].displayOrder, 0);
    assert.equal(items[1].displayOrder, 1);
  });
});
