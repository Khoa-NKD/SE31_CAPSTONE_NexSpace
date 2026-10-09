import { type Workspace } from '../components/workspace-card';

export const sampleWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'NexSpace Central Tower — District 1',
    neighborhood: 'District 1 Center',
    address: '72 Le Thanh Ton, Ben Nghe',
    distance: '0.8 km from center',
    rating: 4.9,
    reviews: 42,
    pricePerHour: 2.50,
    pricePerDay: 18,
    availableDesks: 8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuArgcDUJ8aJw8ICjxE7jgdiFWl4_CsRokMRCNSFNFJEzrF6ctTlBt2JFYQhADbyzY_fNo9eoo3Q2tpPwhkjbqE2V5rWF5P-A2gXZddBoyI1gydzJjVg8tm6HhSVuWwjKM0qbg7JWEcXO_fa6ULIpwMHD6zvwMoO15OYF_XfRCCQTGJ2pLawp--UIc6n3mz_7lWyK2mzzC8rFj1d8MvBQazYFNyVjMi9mpV6LLDus-5PwF1-PCpIZ2pyAw',
    imageAlt: 'NexSpace Central Tower workspace area',
    tags: ['Verified Host'],
    amenities: [
      { icon: 'wifi', label: '1 Gbps' },
      { icon: 'desk', label: 'Standing Desk' },
      { icon: 'coffee', label: 'Artisan Cafe' },
      { icon: 'clock', label: '24/7 Access' }
    ]
  },
  {
    id: '2',
    name: 'NexSpace Innovation Hub — Bitexco',
    neighborhood: 'Nguyen Hue Boulevard',
    address: '2 Hai Trieu, Ben Nghe',
    distance: '0.3 km from Walking Street',
    rating: 4.85,
    reviews: 89,
    pricePerHour: 3.20,
    pricePerDay: 24,
    availableDesks: 5,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1AJurBdsjhb7BFr4j2QVdUoBIX4zG6WvbdcpwhzqzrsPVGMiLnQtsL4jJZDrCi93-OZObPlfrHOPQxMujBm6X0TJd8s7BCsxAZKc4cnnBsw7bkZFGdCJ6Ee5-z9C2ed34gcSlAFIVh9q11MVk_RNgb3dDDUtUL1fU37PzWL-aIOXjuFAp3WSWJlX6mXhM3aZ1Mm5Ml9lECVxPQo_dJ8jici3lkhQ-VOEYAnIZpKGQtZQjnQMVDqgy4g',
    imageAlt: 'NexSpace Innovation Hub Bitexco',
    tags: [],
    amenities: [
      { icon: 'monitor', label: 'Dual Monitor' },
      { icon: 'door', label: '4 Pods' },
      { icon: 'coffee', label: 'Cafe Bar' },
      { icon: 'quiet', label: 'Silent Room' }
    ]
  },
  {
    id: '3',
    name: 'NexSpace Heritage Villa — District 1',
    neighborhood: 'Heritage Quarter',
    address: '18 Alexandre de Rhodes',
    distance: '1.2 km from Cathedral',
    rating: 4.95,
    reviews: 64,
    pricePerHour: 2.80,
    pricePerDay: 20,
    availableDesks: 2,
    isFastFilling: true,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiFwrWC5_Xut-IATyt3yNmOkonZJNuyOavSOx3czsfhBWeGW-OVj4UAStvnGnBS1hyc5k8YqSgbMxd8hhgC2bsiQoEnGp2UXWenKTXSxfd-Ep3H-1EbXOlctDPDAnAGu2ZaLwhCtf0iBtaOp7tgC_hXBT-9bvU7FLTMoVcQbp-HQBsJ7EJwhIX39_0ZWVAPuD90vHRj4Q7bMFt67ktZ7D2eR3IC2bOoJUPXhb6UX4uN7f0W8MABOUR5g',
    imageAlt: 'NexSpace Heritage Villa workspace',
    tags: [],
    amenities: [
      { icon: 'park', label: 'Garden Lounge' },
      { icon: 'wifi', label: 'Fiber WiFi' },
      { icon: 'coffee', label: 'Roastery' },
      { icon: 'calendar', label: 'Event Hall' }
    ]
  },
  {
    id: '4',
    name: 'NexSpace Skyline Suites — Le Duan',
    neighborhood: 'Financial Corridor',
    address: '33 Le Duan, Ben Nghe',
    distance: '0.5 km from Diamond Plaza',
    rating: 4.90,
    reviews: 31,
    pricePerHour: 4.00,
    pricePerDay: 30,
    availableDesks: 12,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCezi6TdaRijiIGmdR5GFyVonZryCPg9VYtJCWkpLi9cp_iCiqnrRRBlfc4vO7GKfLw0fxL2m1hwE9ftduWZLBb76E6KgN9oy4Hg3ThT8AB_VBaJbUD9569uxd73PpBveqzEicUFigZCF5WFd0my_7DQFKY8UYU7qoBTz2Xo0EA8_j6rzIQlosVKweSd4X_Ipo4ZA7-3cVsEC8a9B3h17_sKrRclxxfksFsO2WUhMP5dBWnOZuCiMpnUw',
    imageAlt: 'NexSpace Skyline Suites Le Duan',
    tags: [],
    amenities: [
      { icon: 'shield', label: 'SOC-2 Certified' },
      { icon: 'print', label: 'Print Center' },
      { icon: 'car', label: 'Valet Parking' }
    ]
  }
];

