import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFloorScene, cameraAxes, footprintPoint, type Footprint } from './floor-scene-3d.ts';
import type { FloorLayout, LayoutItem, FloorDecoration } from '../api/resources';

const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0);

const near = (actual: number, expected: number, tolerance = 0.00001) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const base = (): FloorLayout => ({
  floor: { id: 1, name: 'Floor 1', floorNumber: 1, status: 'DRAFT', revision: 'r1' },
  width: 1200,
  height: 900,
  pixelsPerMetre: 60,
  editableLayout: true,
  resources: [],
  decorations: []
});
const room = (overrides: Partial<LayoutItem> = {}): LayoutItem => ({
  id: 7,
  name: 'Room',
  code: 'ROOM-1',
  category: 'ROOM',
  posX: 120,
  posY: 180,
  width: 360,
  height: 240,
  rotation: 0,
  status: 'DRAFT',
  revision: 'r1',
  ...overrides
});

test('a footprint maps model pixels to metres identically on both floor axes', () => {
  const item: Footprint = { posX: 120, posY: 180, width: 120, height: 60, rotation: 0 };
  assert.deepEqual(footprintPoint(item, 0, 0, 0, 60), [2, 0, 3]);
  assert.deepEqual(footprintPoint(item, 120, 60, 0.75, 60), [4, 0.75, 4]);
});

test('90 degree and arbitrary rotations preserve the exact 2D center and edge lengths', () => {
  for (const rotation of [90, 180, 270, -45, 37, 360]) {
    const item = { posX: 120, posY: 180, width: 120, height: 60, rotation };
    const a = footprintPoint(item, 0, 0, 0, 60),
      b = footprintPoint(item, 120, 0, 0, 60),
      d = footprintPoint(item, 0, 60, 0, 60);
    near(Math.hypot(b[0] - a[0], b[2] - a[2]), 2);
    near(Math.hypot(d[0] - a[0], d[2] - a[2]), 1);
    const center = footprintPoint(item, 60, 30, 0, 60);
    near(center[0], 3);
    near(center[2], 3.5);
  }
  const corner = footprintPoint(
    { posX: 120, posY: 180, width: 120, height: 60, rotation: 90 },
    0,
    0,
    0,
    60
  );
  near(corner[0], 3.5);
  near(corner[2], 2.5);
});

test('room membership does not offset or rotate an already world-positioned seat a second time', () => {
  const seat = room({
    id: 8,
    category: 'DESK',
    parentRoomId: 7,
    posX: 150,
    posY: 200,
    width: 60,
    height: 60,
    rotation: 37
  });
  const layout = base();
  layout.resources = [room({ rotation: 17 }), seat];
  const first = buildFloorScene(layout, 1200, 900, 0, false);
  const unlinked = structuredClone(layout);
  unlinked.resources[1].parentRoomId = null;
  assert.deepEqual(first.vertices, buildFloorScene(unlinked, 1200, 900, 0, false).vertices);
});

test('rounded floor bounds and curved perimeter match the 2D footprint', () => {
  const mesh = buildFloorScene(base(), 1200, 900, 120, false);
  const points = Array.from({ length: mesh.vertices.length / 9 }, (_, i) => [
    mesh.vertices[i * 9],
    mesh.vertices[i * 9 + 2]
  ]);
  near(Math.min(...points.map((p) => p[0])), 0);
  near(Math.max(...points.map((p) => p[0])), 20);
  near(Math.min(...points.map((p) => p[1])), 0);
  near(Math.max(...points.map((p) => p[1])), 15);
  assert.ok(!points.some(([x, z]) => x === 0 && z === 0));
  for (const [x, z] of points.filter(([x, z]) => x < 2 && z < 2)) near(Math.hypot(x - 2, z - 2), 2);
});

test('all furniture vertices stay inside their rotated saved footprint', () => {
  const types: FloorDecoration[] = ['TABLE', 'PLANT', 'PARTITION', 'OTHER'].map((kind, i) => ({
    id: `d${i}`,
    kind: kind as FloorDecoration['kind'],
    label: 'Object',
    posX: 180,
    posY: 240,
    width: 180,
    height: 90,
    rotation: 37,
    color: '#123456'
  }));
  for (const item of [
    ...types,
    ...['SOFA', 'SCREEN', 'LOCKER'].map((icon) => ({
      ...types[3],
      icon: icon as FloorDecoration['icon']
    }))
  ]) {
    const layout = base();
    layout.decorations = [item];
    const scene = buildFloorScene(layout, 1200, 900, 0, false);
    let count = 0;
    for (let i = 0; i < scene.vertices.length; i += 9) {
      if (Math.abs(scene.vertices[i + 6] - 0x12 / 255) > 0.00001) continue;
      const dx = scene.vertices[i] * 60 - item.posX - item.width / 2,
        dz = scene.vertices[i + 2] * 60 - item.posY - item.height / 2;
      const a = (item.rotation * Math.PI) / 180;
      const x = Math.cos(a) * dx + Math.sin(a) * dz + item.width / 2,
        y = -Math.sin(a) * dx + Math.cos(a) * dz + item.height / 2;
      assert.ok(x >= -0.001 && x <= item.width + 0.001 && y >= -0.001 && y <= item.height + 0.001);
      count++;
    }
    assert.ok(count > 0);
  }
});

test('drawing, hiding walls and calendar coloring do not mutate input or include unplaced objects', () => {
  const layout = base();
  layout.resources = [room(), room({ id: 8, posX: null }), room({ id: 9, width: NaN })];
  const before = structuredClone(layout);
  const solid = buildFloorScene(layout, 1200, 900, 0, true, { 7: 'BOOKED' });
  const clean = structuredClone(layout);
  clean.resources = [room()];
  assert.deepEqual(
    solid.vertices,
    buildFloorScene(clean, 1200, 900, 0, true, { 7: 'BOOKED' }).vertices
  );
  assert.ok(buildFloorScene(layout, 1200, 900, 0, false).vertices.length < solid.vertices.length);
  assert.ok(solid.vertices.every(Number.isFinite));
  assert.deepEqual(layout, before);
});

test('metadata scale is used uniformly, with the existing model scale as legacy fallback', () => {
  const layout = base();
  layout.pixelsPerMetre = 100;
  const mesh = buildFloorScene(layout, 1200, 900, 0, true);
  near(mesh.width, 12);
  near(mesh.depth, 9);
  layout.pixelsPerMetre = null;
  near(buildFloorScene(layout, 1200, 900, 0, true).width, 20);
});

test('orthographic camera stays orthonormal at every angle and top view preserves plan orientation', () => {
  for (const yaw of [0, Math.PI / 2, 1.23, -2])
    for (const elevation of [0.12, 0.8, Math.PI / 2]) {
      const { right, up, eye } = cameraAxes(yaw, elevation);
      for (const v of [right, up, eye]) near(dot(v, v), 1);
      near(dot(right, up), 0);
      near(dot(right, eye), 0);
      near(dot(up, eye), 0);
    }
  const axes = cameraAxes(0, Math.PI / 2);
  near(dot([1, 0, 0], axes.right), 1);
  near(dot([0, 0, 1], axes.up), -1);
});
