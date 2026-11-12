export interface AdministrativeUnit {
  code: number;
  name: string;
}
export interface MapPoint {
  latitude: number;
  longitude: number;
}
export interface LocatedAddress extends MapPoint {
  street: string;
  ward: string;
  city: string;
  formattedAddress: string;
  approximate: boolean;
}

async function json(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(4500)]),
    credentials: 'omit'
  });
  if (!response.ok) throw new Error('Location service unavailable');
  return response.json();
}

export const provinceOptions = () => ({
  queryKey: ['vietnam-administration', 'v2', 'provinces'],
  queryFn: async ({ signal }: { signal: AbortSignal }): Promise<AdministrativeUnit[]> => {
    const data = await json('https://provinces.open-api.vn/api/v2/p/', signal);
    if (!Array.isArray(data)) throw new Error('Invalid province directory');
    return data.filter((item) => Number.isInteger(item.code) && typeof item.name === 'string');
  },
  staleTime: 24 * 60 * 60 * 1000,
  retry: 1
});

export const wardOptions = (provinceCode: number) => ({
  queryKey: ['vietnam-administration', 'v2', 'wards', provinceCode],
  queryFn: async ({ signal }: { signal: AbortSignal }): Promise<AdministrativeUnit[]> => {
    const data = await json(
      `https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`,
      signal
    );
    if (!Array.isArray(data.wards)) throw new Error('Invalid ward directory');
    return data.wards.filter(
      (item: AdministrativeUnit) => Number.isInteger(item.code) && typeof item.name === 'string'
    );
  },
  staleTime: 24 * 60 * 60 * 1000,
  retry: 1
});

/** Compare provider names without inventing mappings between old and new administrative units. */
export function administrativeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/^(thanh pho|tinh|phuong|xa|dac khu|city|province|ward)\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

export function composeBuildingAddress(street: string, ward: string, city: string) {
  return [buildingStreetLine(street), ward.trim(), city.trim()].filter(Boolean).join(', ');
}

export function buildingCity(building: { city?: string | null; address: string }) {
  const parts = building.address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const last = administrativeName(parts.at(-1) ?? '');
  const label = building.city?.trim() || (last === 'vietnam' ? parts.at(-2) : parts.at(-1)) || '';
  const normalized = administrativeName(label.replace(/^TP\.?\s*/i, ''));
  const key = ['hcm', 'hochiminhcity', 'saigon'].includes(normalized) ? 'hochiminh' : normalized;
  return { key, label };
}

/** The street input may contain a pasted full address; administrative fields remain authoritative. */
export function buildingStreetLine(value: string) {
  return value.split(',')[0].trim();
}

function streetKey(value: string) {
  return administrativeName(
    value
      .replace(/^\s*\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)*\s*/, '')
      .replace(/^(đường|phố|street)\s+/i, '')
  );
}

function selectForwardCandidate(
  candidates: LocatedAddress[],
  input: { address: string; city: string; ward: string }
) {
  const street = buildingStreetLine(input.address);
  const house = street.match(/^\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)*/)?.[0].toLowerCase();
  const local = candidates.filter(
    (item) =>
      administrativeName(item.city) === administrativeName(input.city) &&
      administrativeName(item.ward) === administrativeName(input.ward) &&
      streetKey(item.street) === streetKey(street)
  );
  return (
    local.find(
      (item) =>
        !item.approximate &&
        (!house ||
          item.street.match(/^\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)*/)?.[0].toLowerCase() === house)
    ) ?? local.find((item) => item.approximate)
  );
}

function validPoint(point: MapPoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

interface GoongResult {
  name?: string;
  formatted_address?: string;
  compound?: { commune?: string; province?: string };
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
  address_components?: { long_name: string }[];
}

function goongAddress(result: GoongResult): LocatedAddress | null {
  const point = {
    latitude: Number(result.geometry?.location?.lat),
    longitude: Number(result.geometry?.location?.lng)
  };
  if (!validPoint(point)) return null;
  const city = result.compound?.province ?? '';
  const ward = result.compound?.commune ?? '';
  const parts = result.address_components?.map((item) => item.long_name.trim()) ?? [];
  const streetParts = parts.filter(
    (part) =>
      administrativeName(part) !== administrativeName(city) &&
      administrativeName(part) !== administrativeName(ward)
  );
  return {
    ...point,
    city,
    ward,
    street: streetParts.join(', ') || result.name || '',
    formattedAddress: result.formatted_address || '',
    approximate: !result.types?.some((type) => ['house_number', 'building'].includes(type))
  };
}

interface PhotonFeature {
  geometry: { coordinates: number[] };
  properties: {
    countrycode?: string;
    housenumber?: string;
    street?: string;
    name?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
  };
}

function photonAddress(feature: PhotonFeature): LocatedAddress | null {
  const p = feature.properties;
  if (p.countrycode?.toUpperCase() !== 'VN') return null;
  const point = {
    latitude: Number(feature.geometry.coordinates[1]),
    longitude: Number(feature.geometry.coordinates[0])
  };
  if (!validPoint(point)) return null;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || '';
  const city = p.state || p.city || '';
  const ward = p.district || p.locality || '';
  return {
    ...point,
    street,
    city,
    ward,
    formattedAddress: composeBuildingAddress(street, ward, city),
    approximate: !p.housenumber
  };
}

/** Reuse the project's Goong key and existing Photon fallback; never log request URLs or keys. */
export async function locateBuilding(
  input: { address: string; city: string; ward: string } | MapPoint,
  signal: AbortSignal
): Promise<LocatedAddress> {
  const forward = 'address' in input;
  const key = (import.meta.env?.VITE_GOONG_API_KEY as string | undefined)?.trim();
  let candidates: LocatedAddress[] = [];
  if (key) {
    try {
      const params = new URLSearchParams({ api_key: key });
      if (forward) params.set('address', input.address);
      else params.set('latlng', `${input.latitude},${input.longitude}`);
      const data = await json(`https://rsapi.goong.io/v2/geocode?${params}`, signal);
      candidates = (data.results ?? [])
        .map(goongAddress)
        .filter((item: LocatedAddress | null): item is LocatedAddress => item !== null);
    } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    }
  }
  if (!candidates.length) {
    const params = new URLSearchParams({ limit: forward ? '8' : '1', lang: 'default' });
    if (forward) {
      // OSM often lacks the new ward names; match those locally after searching street and city.
      params.set('q', `${buildingStreetLine(input.address)}, ${input.city}, Việt Nam`);
      params.set('bbox', '102,8,110,24');
    } else {
      params.set('lat', String(input.latitude));
      params.set('lon', String(input.longitude));
    }
    const data = await json(
      `https://photon.komoot.io/${forward ? 'api' : 'reverse'}?${params}`,
      signal
    );
    candidates = (data.features ?? [])
      .map(photonAddress)
      .filter((item: LocatedAddress | null): item is LocatedAddress => item !== null);
  }
  let match = forward ? selectForwardCandidate(candidates, input) : candidates[0];
  if (forward && !match) {
    // Public OSM data may index the street under older administrative names.
    // Retry a shorter query, but still validate returned city, ward and street.
    const params = new URLSearchParams({
      q: `${buildingStreetLine(input.address).replace(/^\d+[a-zA-Z]?(?:[/-]\d+[a-zA-Z]?)*\s*/, '')}, ${input.city}, Việt Nam`,
      limit: '8',
      bbox: '102,8,110,24'
    });
    const data = await json(`https://photon.komoot.io/api/?${params}`, signal);
    match = selectForwardCandidate(
      (data.features ?? [])
        .map(photonAddress)
        .filter((item: LocatedAddress | null): item is LocatedAddress => item !== null),
      input
    );
  }
  if (!match) throw new Error('No matching building location');
  return match;
}
