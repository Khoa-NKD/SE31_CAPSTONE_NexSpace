import type { SeatItem } from '../types/seat';

export const seatsData: SeatItem[] = [
  // CARD 1: Hot Desk - Selected / Top Pick
  {
    id: 'seat-a-04',
    code: 'A-04',
    name: 'Desk A-04 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Acoustic Ceiling & Natural Sunlight',
    tag: 'Quiet Zone • Window View (Facing West)',
    status: 'available_now',
    statusLabel: 'Available Now',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Modern hot desk next to sunlit window with ergonomic chair and slate grey accents',
    isTopPick: true,
    amenities: [
      { icon: 'zap', label: 'Power & USB-C (65W PD)' },
      { icon: 'chair', label: 'Herman Miller Aeron Chair' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' },
      { icon: 'maximize', label: 'Standing Desk Option' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Instant confirmation guarantee',
    microcopy: 'Instant 10-min reservation hold',
    coordinates: { x: 22, y: 35 }
  },

  // CARD 2: Hot Desk - Team Cluster
  {
    id: 'seat-b-12',
    code: 'B-12',
    name: 'Desk B-12 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'Close to Barista & Phone Booths',
    tag: 'Collaboration & Cafe Zone',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Open collaborative workspace with timber tables and ambient warm lighting',
    amenities: [
      { icon: 'zap', label: 'Fast Charging Station' },
      { icon: 'chair', label: 'Steelcase Gesture Chair' },
      { icon: 'wind', label: 'Silent Air Purifier' },
      { icon: 'network', label: 'High-speed Gigabit LAN' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Ideal for collaborative pairing',
    microcopy: 'Instant confirmation',
    coordinates: { x: 55, y: 38 }
  },

  // CARD 3: Dedicated Desk - Premium Monitor Node
  {
    id: 'seat-d-01',
    code: 'D-01',
    name: 'Dedicated Suite Desk D-01',
    category: 'dedicated_desk',
    level: 15,
    zone: 'Executive Wing',
    zoneDescription: 'Private Keycard Access',
    tag: 'Deep Focus Suite',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 4.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTiY5CitlJ4f__-F11SyOHPowUBCs79Kg1RrwAcgf51aGLBlwJMUtDUYZ_7pFxqz9jgYje8AXHqyTKHhf7YnB5ezdzChC-eUiw_fE8udD5Q0OQVt3zLnJZdjAQHtPk46-Hi1qRMicIX7RgKlRX5VDsAe3zKIvUL-M43JfRsGssAX3mxZyFtZnK6xrOMctP3KmylEsRmzMcT3yyC6onzc5y2cHHVdHE9aPeRviJoEV-ws4ocS2PloEPUQ',
    imageAlt: 'Executive desk with 27-inch 4K monitor and ergonomic chair in corner office',
    amenities: [
      { icon: 'monitor', label: '27" 4K Monitor (USB-C Hub)' },
      { icon: 'chair', label: 'Herman Miller Embody' },
      { icon: 'lock', label: 'Lockable Pedestal Drawer' },
      { icon: 'badge', label: '24/7 Access Included' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Includes dedicated peripheral connectivity',
    microcopy: 'Includes monitor & locker',
    coordinates: { x: 75, y: 25 }
  },

  // CARD 4: Acoustic Phone & Meeting Pod
  {
    id: 'seat-pod-m-02',
    code: 'Pod M-02',
    name: 'Pod M-02 (Solo Focus & Video Call Pod)',
    category: 'meeting_pod',
    level: 14,
    zone: 'Media Corridor',
    zoneDescription: 'Engineered for Low Ambient Decibels',
    tag: '100% Soundproof',
    status: 'available_now',
    statusLabel: 'Available Now',
    pricePerHour: 3.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwijvEvBiTEXJ-vOMBIKCvosezxbluvv5YnfPEuxWXjimhM6w72NMHwQQIcXJOUe8vRSV_Xq80sfmSa0a7qgU10Fj49cEppnxnvg4O9Zs7KiUq8foFSXkZ6xtOx0ekc5svTs19FnAa_fpib-gp6h22K11sljHml3wOo6TG8bSAjOZBF6ha2ZwE9GDni3ihSGYUH0XgkNMw1B2Aho6FCB9mYlX7-1BC3vXItqqbcfFIOGsyU8HFS5aPpQ',
    imageAlt: 'Soundproof solo meeting pod with acoustic glass and built-in ring light',
    amenities: [
      { icon: 'ear', label: 'Soundproof Acoustic Glass' },
      { icon: 'video', label: 'Ring Light & 4K Webcam' },
      { icon: 'wind', label: 'Active Air Circulation' },
      { icon: 'cable', label: 'Dual USB-C & Ethernet' }
    ],
    bookingGuarantee: 'Available (Next 3 slots open)',
    guaranteeSubtext: 'Class A Acoustic rating (ISO 23351-1)',
    microcopy: 'Optimized for confidential calls',
    coordinates: { x: 88, y: 70 }
  },

  // Additional 14 items to complete the 18 resources in Central Tower:
  // Hot desks: A-01, A-02, A-03, A-05, A-06, B-01, B-02, B-03, B-04, B-05
  {
    id: 'seat-a-01',
    code: 'A-01',
    name: 'Desk A-01 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Skyline Window Facing East',
    tag: 'Morning Sun • Ergonomic Setup',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Desk A-01 workstation',
    amenities: [
      { icon: 'zap', label: 'Power & USB-C' },
      { icon: 'chair', label: 'Ergonomic Task Chair' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Standard rate',
    microcopy: 'Instant confirmation',
    coordinates: { x: 15, y: 20 }
  },
  {
    id: 'seat-a-02',
    code: 'A-02',
    name: 'Desk A-02 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Acoustic Ceiling & Natural Sunlight',
    tag: 'Quiet Zone • West Exposure',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Desk A-02 workstation',
    amenities: [
      { icon: 'zap', label: 'Dual USB-C 65W' },
      { icon: 'chair', label: 'Aeron Ergonomic' },
      { icon: 'wifi', label: 'WiFi 6 Enterprise' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Instant confirmation guarantee',
    microcopy: 'Instant confirmation',
    coordinates: { x: 22, y: 20 }
  },
  {
    id: 'seat-a-03',
    code: 'A-03',
    name: 'Desk A-03 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Silent Garden Atrium View',
    tag: 'Quiet Zone • Garden View',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Desk A-03 workstation',
    amenities: [
      { icon: 'zap', label: 'Power & USB-C' },
      { icon: 'chair', label: 'Steelcase Chair' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Garden view priority',
    microcopy: 'Instant reservation',
    coordinates: { x: 15, y: 35 }
  },
  {
    id: 'seat-a-05',
    code: 'A-05',
    name: 'Desk A-05 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Acoustic Ceiling & Natural Sunlight',
    tag: 'Quiet Zone • Standing Desk',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Desk A-05 workstation',
    amenities: [
      { icon: 'zap', label: 'Power Hub' },
      { icon: 'maximize', label: 'Electric Height Adjustment' },
      { icon: 'wifi', label: 'WiFi 6' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Adjustable standing desk',
    microcopy: 'Instant confirmation',
    coordinates: { x: 30, y: 35 }
  },
  {
    id: 'seat-a-06',
    code: 'A-06',
    name: 'Desk A-06 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone A',
    zoneDescription: 'Acoustic Ceiling & Natural Sunlight',
    tag: 'Quiet Zone • Dual Outlet',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlgnLDPbUH7OY7kvhPF0f0osnDsVnvRYLkZ8MjMgFe7cJNOug4XYI5s1aYMencBR5lJHwBHsZfJ9D5qoZfa6rI_fDaO7DkpXje6NO8cpapaMB_u8NepSraV9WmlN22ZS9cBhxHP0y1_r_GJFybmvaCu73LVxdIAFNJ-bwo2ZW2Ad6jrw-Iz2wqPysrzItlWOc0tS8pj9YGJWHeourxjBo7WcLC_k_j6PCwA_OZcSSEYWXW1Khs8Nx1qg',
    imageAlt: 'Desk A-06 workstation',
    amenities: [
      { icon: 'zap', label: 'Power & USB-C' },
      { icon: 'chair', label: 'Ergonomic Task Chair' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available for full 4 hours',
    guaranteeSubtext: 'Instant confirmation guarantee',
    microcopy: 'Instant confirmation',
    coordinates: { x: 30, y: 20 }
  },
  {
    id: 'seat-b-01',
    code: 'B-01',
    name: 'Desk B-01 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'Cafe & Social Work Area',
    tag: 'Barista Bar Adjacent',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Desk B-01 workstation',
    amenities: [
      { icon: 'zap', label: 'Power Strip' },
      { icon: 'coffee', label: 'Complimentary Espresso' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Near espresso counter',
    microcopy: 'Instant confirmation',
    coordinates: { x: 45, y: 25 }
  },
  {
    id: 'seat-b-02',
    code: 'B-02',
    name: 'Desk B-02 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'Collaborative Open Quad',
    tag: 'Team Pairing Ready',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Desk B-02 workstation',
    amenities: [
      { icon: 'zap', label: 'Fast Charging Station' },
      { icon: 'chair', label: 'Steelcase Gesture' },
      { icon: 'wifi', label: 'WiFi 6' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Collaborative zone',
    microcopy: 'Instant confirmation',
    coordinates: { x: 55, y: 25 }
  },
  {
    id: 'seat-b-03',
    code: 'B-03',
    name: 'Desk B-03 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'Collaborative Open Quad',
    tag: 'Whiteboard Access',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Desk B-03 workstation',
    amenities: [
      { icon: 'zap', label: 'Power & USB-C' },
      { icon: 'chair', label: 'Steelcase Gesture' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Near ideation whiteboard',
    microcopy: 'Instant confirmation',
    coordinates: { x: 45, y: 38 }
  },
  {
    id: 'seat-b-04',
    code: 'B-04',
    name: 'Desk B-04 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'Acoustic Partition Corner',
    tag: 'Semi-Private Desk',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Desk B-04 workstation',
    amenities: [
      { icon: 'zap', label: 'Fast Charging' },
      { icon: 'chair', label: 'Aeron Chair' },
      { icon: 'wifi', label: 'WiFi 6' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Acoustic felt dividers',
    microcopy: 'Instant confirmation',
    coordinates: { x: 65, y: 38 }
  },
  {
    id: 'seat-b-05',
    code: 'B-05',
    name: 'Desk B-05 (Hot Desk)',
    category: 'hot_desk',
    level: 14,
    zone: 'Zone B',
    zoneDescription: 'East Terrace Alcove',
    tag: 'Outdoor Light • Airy Spot',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 2.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4ZifZ1lyfYAcvN5T_G5sZx8pD7DF_vkeAMjpW66iMTFdu53dPZ-s8sl24NAXo7X9rLhx5BgPvOY3rYEAgMKf0PBIT57Vk1_0BIDSa3YrWOUuijgmEXW3QFyL3Go5yWApGWaUD6kF_tOGXsuUwnZwZLXT4WUYGG4BThknUxO5Yocevgel8WrY5HNJ7uEjrD1vswFop7kaTws0C2ZgXR3sT-COjYipKFZ-YGrzoME6nj8zvgR9z3XjMxQ',
    imageAlt: 'Desk B-05 workstation',
    amenities: [
      { icon: 'zap', label: 'Dual USB-C 65W' },
      { icon: 'chair', label: 'Steelcase Gesture' },
      { icon: 'wifi', label: '1000 Mbps WiFi 6' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Bright natural lighting',
    microcopy: 'Instant confirmation',
    coordinates: { x: 65, y: 25 }
  },

  // Dedicated Desks: D-02, D-03, D-04
  {
    id: 'seat-d-02',
    code: 'D-02',
    name: 'Dedicated Suite Desk D-02',
    category: 'dedicated_desk',
    level: 15,
    zone: 'Executive Wing',
    zoneDescription: 'Private Keycard Access',
    tag: 'Deep Focus Suite',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 4.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTiY5CitlJ4f__-F11SyOHPowUBCs79Kg1RrwAcgf51aGLBlwJMUtDUYZ_7pFxqz9jgYje8AXHqyTKHhf7YnB5ezdzChC-eUiw_fE8udD5Q0OQVt3zLnJZdjAQHtPk46-Hi1qRMicIX7RgKlRX5VDsAe3zKIvUL-M43JfRsGssAX3mxZyFtZnK6xrOMctP3KmylEsRmzMcT3yyC6onzc5y2cHHVdHE9aPeRviJoEV-ws4ocS2PloEPUQ',
    imageAlt: 'Dedicated Suite Desk D-02',
    amenities: [
      { icon: 'monitor', label: '27" 4K Monitor (USB-C Hub)' },
      { icon: 'chair', label: 'Herman Miller Embody' },
      { icon: 'lock', label: 'Lockable Pedestal' },
      { icon: 'badge', label: '24/7 Access Included' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Dedicated workstation',
    microcopy: 'Includes monitor & locker',
    coordinates: { x: 75, y: 38 }
  },
  {
    id: 'seat-d-03',
    code: 'D-03',
    name: 'Dedicated Suite Desk D-03',
    category: 'dedicated_desk',
    level: 15,
    zone: 'Executive Wing',
    zoneDescription: 'Private Keycard Access',
    tag: 'Corner Panorama Suite',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 4.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTiY5CitlJ4f__-F11SyOHPowUBCs79Kg1RrwAcgf51aGLBlwJMUtDUYZ_7pFxqz9jgYje8AXHqyTKHhf7YnB5ezdzChC-eUiw_fE8udD5Q0OQVt3zLnJZdjAQHtPk46-Hi1qRMicIX7RgKlRX5VDsAe3zKIvUL-M43JfRsGssAX3mxZyFtZnK6xrOMctP3KmylEsRmzMcT3yyC6onzc5y2cHHVdHE9aPeRviJoEV-ws4ocS2PloEPUQ',
    imageAlt: 'Dedicated Suite Desk D-03',
    amenities: [
      { icon: 'monitor', label: '34" Curved Ultrawide Display' },
      { icon: 'chair', label: 'Herman Miller Embody' },
      { icon: 'lock', label: 'Biometric Locker' },
      { icon: 'badge', label: '24/7 Access Included' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Panoramic city vista',
    microcopy: 'Includes monitor & locker',
    coordinates: { x: 88, y: 25 }
  },
  {
    id: 'seat-d-04',
    code: 'D-04',
    name: 'Dedicated Suite Desk D-04',
    category: 'dedicated_desk',
    level: 15,
    zone: 'Executive Wing',
    zoneDescription: 'Private Keycard Access',
    tag: 'Corner Panorama Suite',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 4.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTiY5CitlJ4f__-F11SyOHPowUBCs79Kg1RrwAcgf51aGLBlwJMUtDUYZ_7pFxqz9jgYje8AXHqyTKHhf7YnB5ezdzChC-eUiw_fE8udD5Q0OQVt3zLnJZdjAQHtPk46-Hi1qRMicIX7RgKlRX5VDsAe3zKIvUL-M43JfRsGssAX3mxZyFtZnK6xrOMctP3KmylEsRmzMcT3yyC6onzc5y2cHHVdHE9aPeRviJoEV-ws4ocS2PloEPUQ',
    imageAlt: 'Dedicated Suite Desk D-04',
    amenities: [
      { icon: 'monitor', label: '27" 4K Monitor (USB-C Hub)' },
      { icon: 'chair', label: 'Herman Miller Embody' },
      { icon: 'lock', label: 'Lockable Pedestal' },
      { icon: 'badge', label: '24/7 Access Included' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Executive quiet section',
    microcopy: 'Includes monitor & locker',
    coordinates: { x: 88, y: 38 }
  },

  // Meeting Pod: Pod M-01
  {
    id: 'seat-pod-m-01',
    code: 'Pod M-01',
    name: 'Pod M-01 (Executive Video Booth)',
    category: 'meeting_pod',
    level: 14,
    zone: 'Media Corridor',
    zoneDescription: 'Engineered for Low Ambient Decibels',
    tag: '100% Soundproof • Studio Lighting',
    status: 'available',
    statusLabel: 'Available',
    pricePerHour: 3.50,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwijvEvBiTEXJ-vOMBIKCvosezxbluvv5YnfPEuxWXjimhM6w72NMHwQQIcXJOUe8vRSV_Xq80sfmSa0a7qgU10Fj49cEppnxnvg4O9Zs7KiUq8foFSXkZ6xtOx0ekc5svTs19FnAa_fpib-gp6h22K11sljHml3wOo6TG8bSAjOZBF6ha2ZwE9GDni3ihSGYUH0XgkNMw1B2Aho6FCB9mYlX7-1BC3vXItqqbcfFIOGsyU8HFS5aPpQ',
    imageAlt: 'Pod M-01 acoustic soundproof solo booth',
    amenities: [
      { icon: 'ear', label: 'Soundproof Acoustic Glass' },
      { icon: 'video', label: '4K Studio Camera' },
      { icon: 'wind', label: 'Active Ventilation' },
      { icon: 'cable', label: 'Fast Ethernet & USB-C' }
    ],
    bookingGuarantee: 'Available',
    guaranteeSubtext: 'Class A Acoustic rating',
    microcopy: 'Optimized for confidential calls',
    coordinates: { x: 88, y: 55 }
  }
];

