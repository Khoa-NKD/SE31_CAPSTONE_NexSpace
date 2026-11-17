import type { DecorationIconName } from '../api/resources';
/** Names, matching hints and picker labels share one explicit, locally rendered icon catalog. */
export const furnishingIconCatalog: Array<{
  value: DecorationIconName;
  en: string;
  vi: string;
  keywords: string[];
}> = [
  {
    value: 'LOCKER',
    en: 'Locker / cabinet',
    vi: 'Tủ đồ',
    keywords: ['locker', 'cabinet', 'tu do', 'tu locker', 'tu']
  },
  {
    value: 'SOFA',
    en: 'Sofa',
    vi: 'Sofa',
    keywords: ['sofa', 'couch']
  },
  {
    value: 'SHELF',
    en: 'Shelf',
    vi: 'Kệ',
    keywords: ['shelf', 'shelving', 'ke']
  },
  {
    value: 'PRINTER',
    en: 'Printer',
    vi: 'Máy in',
    keywords: ['printer', 'may in']
  },
  {
    value: 'SCREEN',
    en: 'TV / screen',
    vi: 'Tivi / màn hình',
    keywords: ['tv', 'tivi', 'television', 'monitor', 'screen', 'man hinh']
  },
  {
    value: 'COFFEE',
    en: 'Coffee machine',
    vi: 'Máy pha cà phê',
    keywords: ['coffee', 'ca phe']
  },
  {
    value: 'WHITEBOARD',
    en: 'Whiteboard',
    vi: 'Bảng viết',
    keywords: ['whiteboard', 'bang viet']
  },
  {
    value: 'LAMP',
    en: 'Lamp',
    vi: 'Đèn',
    keywords: ['lamp', 'den']
  },
  {
    value: 'FAN',
    en: 'Fan',
    vi: 'Quạt',
    keywords: ['fan', 'quat']
  },
  {
    value: 'AIR_CONDITIONER',
    en: 'Air conditioner',
    vi: 'Điều hòa',
    keywords: ['air conditioner', 'dieu hoa', 'may lanh']
  },
  {
    value: 'TRASH',
    en: 'Trash bin',
    vi: 'Thùng rác',
    keywords: ['trash', 'thung rac']
  },
  {
    value: 'SPEAKER',
    en: 'Speaker',
    vi: 'Loa',
    keywords: ['speaker', 'loa']
  },
  {
    value: 'CLOCK',
    en: 'Clock',
    vi: 'Đồng hồ',
    keywords: ['clock', 'dong ho']
  },
  {
    value: 'REFRIGERATOR',
    en: 'Refrigerator',
    vi: 'Tủ lạnh',
    keywords: ['refrigerator', 'fridge', 'tu lanh']
  },
  {
    value: 'WATER_DISPENSER',
    en: 'Water dispenser',
    vi: 'Cây nước uống',
    keywords: ['water dispenser', 'may nuoc', 'binh nuoc', 'cay nuoc']
  },
  {
    value: 'ROUTER',
    en: 'Router',
    vi: 'Bộ phát mạng',
    keywords: ['router', 'wifi', 'bo phat']
  },
  {
    value: 'TOILET',
    en: 'Toilet',
    vi: 'Bồn cầu',
    keywords: ['toilet', 'bon cau', 'bety']
  },
  {
    value: 'SINK',
    en: 'Washbasin',
    vi: 'Bồn rửa',
    keywords: ['sink', 'washbasin', 'bon rua', 'lavabo']
  },
  {
    value: 'PROJECTOR',
    en: 'Projector',
    vi: 'Máy chiếu',
    keywords: ['projector', 'may chieu']
  },
  {
    value: 'VIDEO_CONFERENCE',
    en: 'Conference equipment',
    vi: 'Thiết bị họp',
    keywords: [
      'conference equipment',
      'meeting equipment',
      'thiet bi hop',
      'hoi nghi truyen hinh',
      'webcam'
    ]
  },
  {
    value: 'STAIRS',
    en: 'Stairs',
    vi: 'Cầu thang',
    keywords: ['stairs', 'cau thang']
  },
  {
    value: 'ELEVATOR',
    en: 'Elevator',
    vi: 'Thang máy',
    keywords: ['elevator', 'lift', 'thang may']
  },
  {
    value: 'FIRE_EXTINGUISHER',
    en: 'Fire extinguisher',
    vi: 'Bình chữa cháy',
    keywords: ['fire extinguisher', 'binh chua chay']
  },
  {
    value: 'DOOR',
    en: 'Door',
    vi: 'Cửa',
    keywords: ['door', 'cua ra vao']
  },
  {
    value: 'ACCESSIBILITY',
    en: 'Wheelchair access',
    vi: 'Lối xe lăn',
    keywords: ['wheelchair', 'xe lan']
  },
  {
    value: 'MICROWAVE',
    en: 'Microwave',
    vi: 'Lò vi sóng',
    keywords: ['microwave', 'lo vi song']
  },
  {
    value: 'SHOWER',
    en: 'Shower',
    vi: 'Vòi sen',
    keywords: ['shower', 'voi sen']
  },
  {
    value: 'BED',
    en: 'Bed',
    vi: 'Giường',
    keywords: ['bed', 'giuong']
  },
  {
    value: 'CAMERA',
    en: 'Camera',
    vi: 'Camera',
    keywords: ['camera', 'cctv']
  },
  {
    value: 'PHONE',
    en: 'Telephone',
    vi: 'Điện thoại',
    keywords: ['telephone', 'dien thoai', 'phone']
  }
];
const normalize = (text: string) =>
  ' ' +
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() +
  ' ';
export function matchFurnishingIcon(label: string): DecorationIconName | null {
  const name = normalize(label);
  let best: DecorationIconName | null = null;
  let score = 0;
  for (const entry of furnishingIconCatalog)
    for (const keyword of entry.keywords) {
      const hint = normalize(keyword);
      if (name.includes(hint) && hint.length > score) {
        best = entry.value;
        score = hint.length;
      }
    }
  return best;
}
