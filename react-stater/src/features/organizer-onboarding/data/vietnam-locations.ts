export interface WardConfig {
  name: string;
  lat: number;
  lng: number;
}

export interface CityConfig {
  id: string;
  name: string;
  region: string;
  defaultCoords: { lat: number; lng: number };
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  wards: WardConfig[];
}

export const VIETNAM_CITIES: CityConfig[] = [
  {
    id: 'hcm',
    name: 'Ho Chi Minh City',
    region: 'South',
    defaultCoords: { lat: 10.7769, lng: 106.7009 },
    bounds: {
      minLat: 10.3,
      maxLat: 11.2,
      minLng: 106.3,
      maxLng: 107.1
    },
    wards: [
      { name: 'Ben Nghe Ward, District 1', lat: 10.7769, lng: 106.7009 },
      { name: 'Da Kao Ward, District 1', lat: 10.7891, lng: 106.6985 },
      { name: 'Vo Thi Sau Ward, District 3', lat: 10.7844, lng: 106.6892 },
      { name: 'Thao Dien Ward, Thu Duc City', lat: 10.8032, lng: 106.7328 },
      { name: 'Tan Phu Ward, District 7', lat: 10.7305, lng: 106.7176 }
    ]
  },
  {
    id: 'danang',
    name: 'Da Nang',
    region: 'Central',
    defaultCoords: { lat: 16.0678, lng: 108.2208 },
    bounds: {
      minLat: 15.9,
      maxLat: 16.3,
      minLng: 108.0,
      maxLng: 108.5
    },
    wards: [
      { name: 'Hai Chau 1 Ward, Hai Chau District', lat: 16.0678, lng: 108.2208 },
      { name: 'Thach Thang Ward, Hai Chau District', lat: 16.0772, lng: 108.2215 },
      { name: 'An Hai Bac Ward, Son Tra District', lat: 16.0697, lng: 108.2372 },
      { name: 'My An Ward, Ngu Hanh Son District', lat: 16.0465, lng: 108.2435 },
      { name: 'Khue Trung Ward, Cam Le District', lat: 16.0279, lng: 108.2091 }
    ]
  },
  {
    id: 'hanoi',
    name: 'Hanoi Capital',
    region: 'North',
    defaultCoords: { lat: 21.0285, lng: 105.8542 },
    bounds: {
      minLat: 20.8,
      maxLat: 21.3,
      minLng: 105.6,
      maxLng: 106.1
    },
    wards: [
      { name: 'Trang Tien Ward, Hoan Kiem District', lat: 21.0252, lng: 105.8561 },
      { name: 'Hang Bac Ward, Hoan Kiem District', lat: 21.0336, lng: 105.8522 },
      { name: 'Phan Chu Chinh Ward, Hoan Kiem District', lat: 21.0205, lng: 105.8568 },
      { name: 'Dich Vong Hau Ward, Cau Giay District', lat: 21.0333, lng: 105.7872 },
      { name: 'Kim Ma Ward, Ba Dinh District', lat: 21.0321, lng: 105.8205 }
    ]
  },
  {
    id: 'haiphong',
    name: 'Hai Phong',
    region: 'North',
    defaultCoords: { lat: 20.8449, lng: 106.6881 },
    bounds: {
      minLat: 20.6,
      maxLat: 21.1,
      minLng: 106.5,
      maxLng: 107.0
    },
    wards: [
      { name: 'Minh Khai Ward, Hong Bang District', lat: 20.8624, lng: 106.6811 },
      { name: 'Hoang Van Thu Ward, Hong Bang District', lat: 20.8661, lng: 106.6778 },
      { name: 'Cau Dat Ward, Ngo Quyen District', lat: 20.8542, lng: 106.6895 },
      { name: 'Dong Khe Ward, Ngo Quyen District', lat: 20.8491, lng: 106.7022 }
    ]
  }
];

export interface LandmarkItem {
  lat: number;
  lng: number;
  name: string;
  city: string;
  address: string;
}

export const VIETNAM_LANDMARKS: Record<string, LandmarkItem> = {
  // Ho Chi Minh City Landmarks
  'vincom': {
    lat: 10.7769,
    lng: 106.7009,
    name: 'Vincom Center Dong Khoi',
    city: 'Ho Chi Minh City',
    address: '72 Le Thanh Ton Boulevard, District 1'
  },
  'ben thanh': {
    lat: 10.7725,
    lng: 106.6980,
    name: 'Ben Thanh Market',
    city: 'Ho Chi Minh City',
    address: 'Le Loi Street, District 1'
  },
  'landmark 81': {
    lat: 10.7950,
    lng: 106.7219,
    name: 'Landmark 81 Tower',
    city: 'Ho Chi Minh City',
    address: '720A Dien Bien Phu, Binh Thanh District'
  },
  'bitexco': {
    lat: 10.7716,
    lng: 106.7044,
    name: 'Bitexco Financial Tower',
    city: 'Ho Chi Minh City',
    address: '2 Hai Trieu, District 1'
  },
  'notre dame': {
    lat: 10.7798,
    lng: 106.6990,
    name: 'Notre-Dame Cathedral Basilica',
    city: 'Ho Chi Minh City',
    address: '01 Cong xa Paris, District 1'
  },
  'opera house': {
    lat: 10.7766,
    lng: 106.7032,
    name: 'Saigon Opera House',
    city: 'Ho Chi Minh City',
    address: '07 Cong Truong Lam Son, District 1'
  },

  // Da Nang Landmarks
  'cau rong': {
    lat: 16.0610,
    lng: 108.2272,
    name: 'Dragon Bridge (Cau Rong)',
    city: 'Da Nang',
    address: 'Nguyen Van Linh, Hai Chau District'
  },
  'dragon bridge': {
    lat: 16.0610,
    lng: 108.2272,
    name: 'Dragon Bridge (Cau Rong)',
    city: 'Da Nang',
    address: 'Nguyen Van Linh, Hai Chau District'
  },
  'vincom da nang': {
    lat: 16.0746,
    lng: 108.2295,
    name: 'Vincom Plaza Ngo Quyen',
    city: 'Da Nang',
    address: '910A Ngo Quyen, Son Tra District'
  },
  'song han': {
    lat: 16.0722,
    lng: 108.2275,
    name: 'Han River Bridge',
    city: 'Da Nang',
    address: 'Le Duan, Hai Chau District'
  },
  'my khe': {
    lat: 16.0601,
    lng: 108.2464,
    name: 'My Khe Beach',
    city: 'Da Nang',
    address: 'Vo Nguyen Giap, Son Tra District'
  },
  'hai chau': {
    lat: 16.0776,
    lng: 108.2235,
    name: 'Da Nang Administrative Center',
    city: 'Da Nang',
    address: '24 Tran Phu, Hai Chau District'
  },

  // Hanoi Landmarks
  'hoan kiem': {
    lat: 21.0285,
    lng: 105.8542,
    name: 'Hoan Kiem Lake',
    city: 'Hanoi Capital',
    address: 'Dinh Tien Hoang, Hoan Kiem District'
  },
  'ho guom': {
    lat: 21.0285,
    lng: 105.8542,
    name: 'Hoan Kiem Lake',
    city: 'Hanoi Capital',
    address: 'Dinh Tien Hoang, Hoan Kiem District'
  },
  'trang tien': {
    lat: 21.0252,
    lng: 105.8561,
    name: 'Trang Tien Plaza',
    city: 'Hanoi Capital',
    address: '24 Hai Ba Trung, Hoan Kiem District'
  },
  'lotte hanoi': {
    lat: 21.0328,
    lng: 105.8130,
    name: 'Lotte Center Hanoi',
    city: 'Hanoi Capital',
    address: '54 Lieu Giai, Ba Dinh District'
  },
  'keangnam': {
    lat: 21.0168,
    lng: 105.7838,
    name: 'Keangnam Landmark 72',
    city: 'Hanoi Capital',
    address: 'Pham Hung, Nam Tu Liem District'
  },

  // Hai Phong Landmarks
  'nha hat hai phong': {
    lat: 20.8601,
    lng: 106.6835,
    name: 'Hai Phong Opera House',
    city: 'Hai Phong',
    address: '28 Tran Hung Dao, Hong Bang District'
  },
  'vincom hai phong': {
    lat: 20.8645,
    lng: 106.6922,
    name: 'Vincom Plaza Le Thanh Tong',
    city: 'Hai Phong',
    address: '1 Le Thanh Tong, May To, Ngo Quyen District'
  },

  // Sovereign Island Districts of Vietnam
  'hoang sa': {
    lat: 16.5367,
    lng: 111.6033,
    name: 'Hoang Sa Island District (Paracel Islands)',
    city: 'Da Nang',
    address: 'Hoang Sa District, Da Nang City, Vietnam'
  },
  'truong sa': {
    lat: 8.6444,
    lng: 111.9194,
    name: 'Truong Sa Island District (Spratly Islands)',
    city: 'Khanh Hoa',
    address: 'Truong Sa District, Khanh Hoa Province, Vietnam'
  },
  'bien dong': {
    lat: 14.5000,
    lng: 112.5000,
    name: 'East Sea of Vietnam (Bien Dong)',
    city: 'Vietnam',
    address: 'Maritime Territory of Vietnam'
  }
};

export function getCityByName(cityName: string): CityConfig | undefined {
  return VIETNAM_CITIES.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase() || c.id === cityName.toLowerCase()
  );
}

export function getWardsForCity(cityName: string): WardConfig[] {
  const city = getCityByName(cityName);
  return city ? city.wards : [];
}

export function verifyCoordinatesMatchCity(
  cityName: string,
  lat: number,
  lng: number
): { isMatch: boolean; message: string } {
  const city = getCityByName(cityName);
  if (!city) {
    return { isMatch: false, message: `Unknown administrative city: ${cityName}` };
  }

  const { minLat, maxLat, minLng, maxLng } = city.bounds;
  const inBounds = lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;

  if (inBounds) {
    return {
      isMatch: true,
      message: `Verified within ${city.name} administrative territory`
    };
  }

  // Find which city these coordinates actually belong to
  const actualCity = VIETNAM_CITIES.find(
    (c) => lat >= c.bounds.minLat && lat <= c.bounds.maxLat && lng >= c.bounds.minLng && lng <= c.bounds.maxLng
  );

  if (actualCity) {
    return {
      isMatch: false,
      message: `Coordinates (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E) are in ${actualCity.name}, but selected city is ${city.name}.`
    };
  }

  return {
    isMatch: false,
    message: `Coordinates are outside ${city.name} metropolitan envelope.`
  };
}

export function findMatchingLandmark(query: string): LandmarkItem | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  for (const [key, item] of Object.entries(VIETNAM_LANDMARKS)) {
    if (q.includes(key) || key.includes(q) || item.name.toLowerCase().includes(q)) {
      return item;
    }
  }

  return null;
}

export function searchLandmarks(query: string, limit = 5): LandmarkItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: LandmarkItem[] = [];
  const seen = new Set<string>();

  for (const [key, item] of Object.entries(VIETNAM_LANDMARKS)) {
    if (key.includes(q) || item.name.toLowerCase().includes(q) || item.address.toLowerCase().includes(q)) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        results.push(item);
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}
