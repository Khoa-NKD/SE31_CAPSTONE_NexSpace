export interface LocationItem {
  id: string; // Tên hiển thị đầy đủ, ví dụ: "Hải Châu (Đà Nẵng)" hoặc "Quận 1 (TP. HCM)"
  district: string;
  province: string;
}

export interface ProvinceGroup {
  province: string;
  districts: string[];
}

export const VIETNAM_PROVINCE_GROUPS: ProvinceGroup[] = [
  {
    province: 'Đà Nẵng',
    districts: ['Hải Châu', 'Sơn Trà', 'Ngũ Hành Sơn', 'Thanh Khê', 'Cẩm Lệ', 'Liên Chiểu', 'Hòa Vang']
  },
  {
    province: 'TP. Hồ Chí Minh',
    districts: [
      'Quận 1',
      'Quận 3',
      'Quận 4',
      'Quận 5',
      'Quận 6',
      'Quận 7',
      'Quận 8',
      'Quận 10',
      'Quận 11',
      'Quận 12',
      'Bình Thạnh',
      'Phú Nhuận',
      'Gò Vấp',
      'Tân Bình',
      'Tân Phú',
      'Bình Tân',
      'TP. Thủ Đức',
      'Nhà Bè',
      'Bình Chánh',
      'Hóc Môn',
      'Củ Chi'
    ]
  },
  {
    province: 'Hà Nội',
    districts: [
      'Hoàn Kiếm',
      'Ba Đình',
      'Đống Đa',
      'Cầu Giấy',
      'Tây Hồ',
      'Hai Bà Trưng',
      'Thanh Xuân',
      'Nam Từ Liêm',
      'Bắc Từ Liêm',
      'Hà Đông',
      'Hoàng Mai',
      'Long Biên',
      'Gia Lâm',
      'Đông Anh',
      'Thanh Trì',
      'Sơn Tây'
    ]
  },
  {
    province: 'Cần Thơ',
    districts: ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt', 'Phong Điền']
  },
  {
    province: 'Hải Phòng',
    districts: ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An', 'Kiến An', 'Đồ Sơn', 'Thủy Nguyên']
  },
  {
    province: 'Bình Dương',
    districts: ['Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Bến Cát', 'Tân Uyên', 'Bàu Bàng']
  },
  {
    province: 'Đồng Nai',
    districts: ['Biên Hòa', 'Long Khánh', 'Long Thành', 'Nhơn Trạch', 'Trảng Bom']
  },
  {
    province: 'Bà Rịa - Vũng Tàu',
    districts: ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Long Điền', 'Côn Đảo']
  },
  {
    province: 'Khánh Hòa',
    districts: ['Nha Trang', 'Cam Ranh', 'Ninh Hòa']
  },
  {
    province: 'Lâm Đồng',
    districts: ['Đà Lạt', 'Bảo Lộc', 'Đức Trọng']
  },
  {
    province: 'Quảng Nam',
    districts: ['Hội An', 'Tam Kỳ', 'Điện Bàn', 'Duy Xuyên']
  },
  {
    province: 'Thừa Thiên Huế',
    districts: ['TP. Huế', 'Hương Thủy', 'Hương Trà', 'Phú Vang']
  },
  {
    province: 'Bắc Ninh',
    districts: ['TP. Bắc Ninh', 'Từ Sơn', 'Yên Phong', 'Quế Võ']
  },
  {
    province: 'Quảng Ninh',
    districts: ['Hạ Long', 'Cẩm Phả', 'Uông Bí', 'Móng Cái']
  },
  {
    province: 'Kiên Giang',
    districts: ['Phú Quốc', 'Rạch Giá', 'Hà Tiên']
  },
  {
    province: 'Nghệ An',
    districts: ['TP. Vinh', 'Cửa Lò', 'Diễn Châu']
  },
  {
    province: 'Thanh Hóa',
    districts: ['TP. Thanh Hóa', 'Sầm Sơn', 'Bỉm Sơn']
  },
  {
    province: 'Bình Định',
    districts: ['Quy Nhơn', 'An Nhơn', 'Tuy Phước']
  },
  {
    province: 'Đắk Lắk',
    districts: ['Buôn Ma Thuột', 'Cư M\'gar', 'Krông Pắc']
  },
  {
    province: 'Thái Nguyên',
    districts: ['TP. Thái Nguyên', 'Sông Công', 'Phổ Yên']
  }
];

/**
 * Danh sách phẳng tất cả các địa điểm với định dạng "Quận, Tỉnh/Thành"
 */
export const ALL_LOCATIONS: LocationItem[] = VIETNAM_PROVINCE_GROUPS.flatMap((group) =>
  group.districts.map((district) => ({
    id: `${district} (${group.province})`,
    district,
    province: group.province
  }))
);

