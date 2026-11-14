import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseFloorChat,
  promptWithFloorHistory
} from '../../src/features/organizer-resources/utils/ai-chat-history.ts';
import { matchFurnishingIcon } from '../../src/features/organizer-resources/utils/furnishing-icon-catalog.ts';
import { aiPreviewGeometry } from '../../src/features/organizer-resources/utils/ai-preview-geometry.ts';
import type {
  FloorLayout,
  TypeOption
} from '../../src/features/organizer-resources/api/resources.ts';
import {
  promptWithAiTypePreferences,
  validAiTypePreferences
} from '../../src/features/organizer-resources/utils/ai-type-preferences.ts';

test('AI preferences use only currently configured workspace types and respect the prompt limit', () => {
  const valid: TypeOption = {
    id: 2,
    name: 'Work seat',
    category: 'DESK',
    currency: 'VND',
    capacity: 1,
    pricePerHour: '50000',
    pricePerDay: null,
    pricePerMonth: null,
    active: true,
    revision: '1',
    usageKind: 'WORK_SEAT',
    standardWidthM: '0.60',
    standardLengthM: '0.70'
  };
  const ids = validAiTypePreferences(
    [2, 3, 4, 5, 6],
    [
      valid,
      { ...valid, id: 3, active: false },
      { ...valid, id: 4, standardWidthM: null },
      { ...valid, id: 5, pricePerHour: null },
      { ...valid, id: 7 }
    ]
  );
  assert.deepEqual(ids, [2]);
  const request = 'Use a different chair if needed.';
  const enriched = promptWithAiTypePreferences(request, ids);
  assert.match(enriched, /catalog: 2\./);
  assert.ok(enriched.endsWith(request));
  assert.equal(promptWithAiTypePreferences('x'.repeat(4000), ids).length, 4000);
});

test('history accepts only text messages, discards images and tolerates corrupt storage', () => {
  assert.deepEqual(parseFloorChat('{invalid'), []);
  assert.deepEqual(
    parseFloorChat(
      JSON.stringify([
        { role: 'user', text: 'My floor', image: 'private-image' },
        { role: 'system', text: 'invalid' }
      ])
    ),
    [{ role: 'user', text: 'My floor' }]
  );
  assert.equal(
    parseFloorChat(
      JSON.stringify(
        Array.from({ length: 205 }, (_, i) => ({ role: 'assistant', text: String(i) }))
      )
    ).length,
    200
  );
});
test('conversation context stays bounded and latest request is last', () => {
  const messages = Array.from({ length: 20 }, () => ({
    role: 'assistant' as const,
    text: 'x'.repeat(4000)
  }));
  const prompt = promptWithFloorHistory('Move the table', messages);
  assert.ok(prompt.length <= 4000);
  assert.ok(prompt.endsWith('Move the table'));
  assert.equal(promptWithFloorHistory('y'.repeat(3900), messages).length, 3900);
});
test('semantic icon matching distinguishes sanitary and conference objects from boxes', () => {
  assert.equal(matchFurnishingIcon('Bồn cầu'), 'TOILET');
  assert.equal(matchFurnishingIcon('Bồn rửa mặt'), 'SINK');
  assert.equal(matchFurnishingIcon('Thiết bị họp'), 'VIDEO_CONFERENCE');
  assert.equal(matchFurnishingIcon('Tủ lạnh pantry'), 'REFRIGERATOR');
  assert.equal(matchFurnishingIcon('Vật chưa biết'), null);
});
test('AI previews reject furniture collisions and allow contained room furnishings', () => {
  const room = {
    id: 1,
    name: 'Room',
    code: 'R1',
    resourceTypeId: 1,
    category: 'ROOM' as const,
    capacity: 4,
    parentRoomId: null,
    status: 'DRAFT' as const,
    revision: 'r',
    posX: 0,
    posY: 0,
    width: 500,
    height: 500,
    rotation: 0
  };
  const table = {
    id: 'table',
    kind: 'TABLE' as const,
    label: 'Table',
    posX: 100,
    posY: 100,
    width: 100,
    height: 80,
    rotation: 0,
    color: '#123456'
  };
  const layout: FloorLayout = {
    floor: { id: 1, name: 'Floor', floorNumber: 1, status: 'DRAFT', revision: 'r' },
    width: 1000,
    height: 800,
    editableLayout: true,
    resources: [room],
    decorations: [table]
  };
  assert.equal(aiPreviewGeometry(layout).valid, true);
  assert.equal(
    aiPreviewGeometry({
      ...layout,
      decorations: [table, { ...table, id: 'other', label: 'Other' }]
    }).valid,
    false
  );
  assert.equal(
    aiPreviewGeometry({ ...layout, decorations: [{ ...table, posX: 950 }] }).fits,
    false
  );
});
