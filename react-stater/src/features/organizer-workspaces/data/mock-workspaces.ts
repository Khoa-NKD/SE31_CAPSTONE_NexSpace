import { OrganizerWorkspace } from '../types';

export const INITIAL_MOCK_WORKSPACES: OrganizerWorkspace[] = [
  {
    id: 'ws-sg-prime-01',
    name: 'NexSpace Saigon Prime Hub',
    address: '72 Le Thanh Ton, District 1, HCMC',
    district: 'District 1',
    city: 'Ho Chi Minh City',
    status: 'ACTIVE',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADuyr28UHqA0XCI5BbtOp4p4DOsrjwmK8ALbGKGq5_2UdbDXNmE4Kki8y6qsaFgDDJ6FAyy8grMkWNDtrHq8EhWocK2_aEwjsHY0XirVH-B_q_3MrX7J6y2omtYisSqHFWZVr9u65ToKBv4d8OOvCtJN6JaGCWmtjaE-fLRE04qldCczKL6HiDRQkBaL9lVQ0T70RQ8W3QMWUv25ZizttL8o9DmKH_By19e58tjAMVkVhTC3g6gRrckQ',
    desksCount: 54,
    meetingRoomsCount: 4,
    rating: 4.9,
    reviewsCount: 128,
    occupancyRate: 82
  },
  {
    id: 'ws-landmark-bt-02',
    name: 'NexSpace Landmark Tower - Binh Thanh',
    address: '208 Nguyen Huu Canh, Ward 22, Binh Thanh, HCMC',
    district: 'Binh Thanh',
    city: 'Ho Chi Minh City',
    status: 'ACTIVE',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ8Y3OHC6u6ZjkNnNlpUDNLsgYwoPWoY9TRXopOl4qz8ch4RaEALsMmJwEFLDdlTlWV_DKAY0lK6SbIHbtqbB3PdV8A7ws2FcK5cNPwFw5CYYyIw4ielmy0Du3YazUANbqp5b3P0hZNTzaxpeAC8SkNo0SAaXz7khuuKMS7mp4xq-SxDSIZMtTICYztIhht0EcTxP1wo16PpHpCJQE5VHyHgxY1ZBCKldYNcCfHxUnZEUscpM8IHnpVQ',
    desksCount: 40,
    meetingRoomsCount: 3,
    rating: 4.8,
    reviewsCount: 94,
    occupancyRate: 78
  },
  {
    id: 'ws-tech-d7-03',
    name: 'NexSpace Tech Hub - District 7',
    address: 'Tan Trao Street, Tan Phu, District 7, HCMC',
    district: 'District 7',
    city: 'Ho Chi Minh City',
    status: 'DRAFT',
    draftProgress: 80,
    draftWarningMessage: 'Floor Plan & Pricing pending review. Complete setup to publish.',
    desksCount: 0,
    meetingRoomsCount: 0,
    rating: 0
  },
  {
    id: 'ws-capital-d3-04',
    name: 'NexSpace Capital Center - District 3',
    address: '180 Nam Ky Khoi Nghia, Vo Thi Sau, District 3, HCMC',
    district: 'District 3',
    city: 'Ho Chi Minh City',
    status: 'ACTIVE',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCE0tizSxuV505ZnlSp8Nv_EvAmy3lEE64gYrEwxQTrIk6qD7xl3vxQVENJwiZnz-67pbnWEzbOvjEoT-WUmYzPyBpDCgW7w-EYYSFZvbLy0Vgw3PdDArHqe6G280VTp1NI4-Fh74NZni1tfroGKcYnnsO9Nq7b0GLSCQZg8ZtY8RfmHbgnx2uixLGzAL1EADv1InVFDZamm5Kia4Wog4KY117uRpljksLeHwSa6xNcC9DmF1t9twM3Vg',
    desksCount: 32,
    meetingRoomsCount: 2,
    rating: 4.95,
    reviewsCount: 56,
    occupancyRate: 91
  }
];
