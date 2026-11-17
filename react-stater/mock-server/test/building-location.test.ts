import { test } from 'node:test';
import assert from 'node:assert/strict';
import { administrativeName, composeBuildingAddress, locateBuilding } from '../../src/features/organizer-resources/api/building-location.ts';

const feature = {
  geometry: { coordinates: [108.24, 16.05] },
  properties: { countrycode: 'VN', housenumber: '82', street: 'Nguyễn Văn Thoại', city: 'Đà Nẵng', district: 'An Hải', locality: 'Tổ dân phố An Cư 4' }
};

test('normalizes administrative prefixes and composes the stored address without empty segments', () => {
  assert.equal(administrativeName('Thành phố Đà Nẵng'), administrativeName('Đà Nẵng'));
  assert.equal(administrativeName('Phường An Hải'), administrativeName('An Hải'));
  assert.equal(composeBuildingAddress(' 82 Nguyễn Văn Thoại ', 'Phường An Hải', 'Thành phố Đà Nẵng'), '82 Nguyễn Văn Thoại, Phường An Hải, Thành phố Đà Nẵng');
  assert.equal(composeBuildingAddress('110 Mai Thúc Lân, Bắc Mỹ Phú, Ngũ Hành Sơn, Đà Nẵng 550000', 'Phường Ngũ Hành Sơn', 'Thành phố Đà Nẵng'), '110 Mai Thúc Lân, Phường Ngũ Hành Sơn, Thành phố Đà Nẵng');
});

test('retries a shorter street query and never presents a different house number as an exact match', async context => {
  const calls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ features: [{ ...feature, properties: { ...feature.properties, street: 'Đường Mai Thúc Lân', housenumber: calls.length === 1 ? '168' : undefined, district: 'Ngũ Hành Sơn' } }] }), { status: 200 });
  });
  const found = await locateBuilding({ address: '110 Mai Thúc Lân, Phường Ngũ Hành Sơn, Thành phố Đà Nẵng', city: 'Thành phố Đà Nẵng', ward: 'Phường Ngũ Hành Sơn' }, new AbortController().signal);
  assert.equal(calls.length, 2);
  assert.equal(found.approximate, true);
});

test('forward geocoding matches both selected administrative units; reverse uses the ward rather than a neighborhood', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ features: [feature] }), { status: 200 }));
  const controller = new AbortController();
  const found = await locateBuilding({ address: '82 Nguyễn Văn Thoại, An Hải, Đà Nẵng', city: 'Thành phố Đà Nẵng', ward: 'Phường An Hải' }, controller.signal);
  assert.equal(found.latitude, 16.05);
  assert.equal(found.approximate, false);
  const reverse = await locateBuilding({ latitude: 16.05, longitude: 108.24 }, controller.signal);
  assert.equal(reverse.ward, 'An Hải');
  assert.equal(reverse.street, '82 Nguyễn Văn Thoại');
  await assert.rejects(locateBuilding({ address: '82 Nguyễn Văn Thoại', city: 'Hà Nội', ward: 'An Hải' }, controller.signal));
});

test('rejects foreign and invalid points and marks street-only results as approximate', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ features: [{ ...feature, properties: { ...feature.properties, housenumber: undefined } }] }), { status: 200 }));
  const controller = new AbortController();
  assert.equal((await locateBuilding({ latitude: 16.05, longitude: 108.24 }, controller.signal)).approximate, true);
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ features: [{ ...feature, properties: { ...feature.properties, countrycode: 'US' } }] }), { status: 200 }));
  await assert.rejects(locateBuilding({ latitude: 16.05, longitude: 108.24 }, controller.signal));
});
