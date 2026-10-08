# NEXSPACE FRONTEND — QUY CHUẨN KIẾN TRÚC MÀN HÌNH & UI/UX
> **Tài liệu tham chiếu chuẩn (Architectural Blueprint)** dành cho kỹ sư Front-End phát triển các tính năng và màn hình mới trong hệ thống NexSpace (`react-stater`), đảm bảo đồng bộ 100% với phong cách và quy chuẩn kỹ thuật của Landing Page.

---

## MỤC LỤC
1. [Triết lý Kiến trúc (Architectural Philosophy)](#1-triết-lý-kiến-trúc-architectural-philosophy)
2. [Cấu trúc Thư mục Chuẩn (Directory Blueprint)](#2-cấu-trúc-thư-mục-chuẩn-directory-blueprint)
3. [Vai trò & Nhiệm vụ của từng Tệp/Thư mục](#3-vai-trò--nhiệm-vụ-của-từng-tệpthư-mục)
4. [Hệ thống Thiết kế UI/UX & Tokens Đồng bộ với Landing Page](#4-hệ-thống-thiết-kế-uiux--tokens-đồng-bộ-với-landing-page)
5. [Quy chuẩn Typography (Font chữ Tiếng Việt & Tiếng Anh)](#5-quy-chuẩn-typography-font-chữ-tiếng-việt--tiếng-anh)
6. [Mã Nguồn Mẫu (Copy-Pasteable Templates)](#6-mã-nguồn-mẫu-copy-pasteable-templates)
7. [Checklist Kiểm định Chất lượng (Quality Gates)](#7-checklist-kiểm-định-chất-lượng-quality-gates)

---

## 1. TRIẾT LÝ KIẾN TRÚC (ARCHITECTURAL PHILOSOPHY)

Dự án sử dụng mô hình **Feature-Driven Architecture** kết hợp với **TanStack Start & TanStack Router**:

* **Nguyên tắc "Routes Only Declare, Features Own Logic"**:
  * Thư mục `src/routes/` chỉ đóng vai trò là "Cổng định tuyến" (Routing Gateway). Tuyệt đối **không viết code giao diện phức tạp** trực tiếp trong `routes/`.
  * Mọi logic nghiệp vụ, UI component, state, API hook, kiểu dữ liệu đều phải nằm trọn vẹn trong module tính năng tương ứng tại `src/features/[feature-name]/`.
* **Tính Độc lập & Tự bao hàm (Self-Contained Features)**:
  * Mỗi tính năng (như `landing`, `overview`, `workspaces`, `booking`, `billing`...) là một module độc lập. Xóa hoặc di chuyển một thư mục feature sẽ không làm gãy các feature khác.
* **Type Safety Tuyệt đối (100% Strict Mode)**:
  * Không dùng kiểu `any`. Mọi response, param, state đều phải có interface/type rõ ràng.
  * Xác thực dữ liệu đầu vào (URL search params, form input) bằng **Zod**.

---

## 2. CẤU TRÚC THƯ MỤC CHUẨN (DIRECTORY BLUEPRINT)

Khi tạo một màn hình/tính năng mới (ví dụ: `workspaces`, `bookings`, `analytics`), cấu trúc thư mục bắt buộc phải tuân theo cấu trúc sau:

```text
react-stater/src/
├── routes/                                         # 1. Routing Layer (Chỉ chứa file Route)
│   └── dashboard/
│       ├── [feature].tsx                           # Route chính (vd: workspaces.tsx)
│       └── [feature]/
│           ├── $id.tsx                             # Route chi tiết (vd: $id.tsx)
│           └── new.tsx                             # Route tạo mới (nếu có)
│
├── features/                                       # 2. Feature-Sliced Domain Layer
│   └── [feature-name]/                             # vd: workspaces, booking, billing...
│       ├── api/                                    # Data access layer
│       │   ├── types.ts                            # Data models & query filter contracts
│       │   ├── service.ts                          # API fetchers (REST/Server Functions)
│       │   ├── queries.ts                          # Query keys factory & queryOptions
│       │   └── mutations.ts                        # useMutation hooks & cache invalidation
│       │
│       ├── components/                             # Presentation layer
│       │   ├── [feature]-page.tsx                  # Root orchestrator của màn hình
│       │   ├── [feature]-header.tsx                # Tiêu đề, Breadcrumb & hành động chính
│       │   ├── [feature]-filters.tsx               # Thanh tìm kiếm & bộ lọc
│       │   ├── [feature]-card.tsx                  # Card hiển thị item (nếu dạng lưới)
│       │   ├── [feature]-modal.tsx                 # Modal tương tác (tạo mới/chi tiết)
│       │   └── [feature]-tables/                   # Sub-components nếu hiển thị bảng
│       │       ├── columns.tsx                     # TanStack Table column definitions
│       │       ├── cell-action.tsx                 # Menu hành động trên từng dòng
│       │       └── index.tsx                       # Table wrapper component
│       │
│       ├── constants/                              # Static data layer
│       │   └── [feature].config.ts                 # Tab options, badge variants, default values
│       │
│       ├── context/                                # Local state layer (nếu cần)
│       │   └── [feature]-context.tsx               # Context riêng cho feature
│       │
│       ├── hooks/                                  # Business logic layer
│       │   └── use-[feature]-filter.ts             # Custom hook tách logic xử lý
│       │
│       └── schemas/                                # Validation layer
│           └── [feature].schema.ts                 # Zod validation schema cho forms/params
│
├── components/                                     # 3. Shared Primitives Layer
│   ├── ui/                                         # shadcn/ui components (button, dialog, card...)
│   ├── layout/                                     # PageContainer, Header, Sidebar
│   ├── brand/                                      # Logo, Watermark, Brand Identity
│   └── themes/                                     # ThemeProvider, ThemeModeToggle
│
├── styles/                                         # 4. Styling System
│   ├── globals.css                                 # Tailwind v4, custom utility classes
│   └── themes/                                     # Theme tokens (vercel.css, supabase.css...)
│
└── lib/                                            # 5. Core Infrastructure
    ├── utils.ts                                    # cn() helper
    ├── form.ts                                     # useAppForm definition
    └── query-client.ts                             # Singleton QueryClient
```

---

## 3. VAI TRÒ & NHIỆM VỤ CỦA TỪNG TỆP/THƯ MỤC

### 3.1. Routing (`src/routes/...`)
* **Trách nhiệm**: Khai báo Route với TanStack Router (`createFileRoute`), định nghĩa `head` (SEO meta), kiểm tra quyền truy cập (auth guard), xác thực URL Search Params bằng `zodValidator`.
* **Quy tắc**: Tuyệt đối không viết JSX giao diện phức tạp (> 30 dòng). Chỉ import và render component Page từ `features/`.

### 3.2. Data Contracts (`features/[feature]/api/types.ts`)
* **Trách nhiệm**: Khai báo toàn bộ Typescript Interface/Type của entity (Entity Model), Filter Parameters, API Response DTOs.
* **Quy tắc**: Định nghĩa rõ enum dạng union type (ví dụ `type BookingStatus = 'pending' | 'confirmed' | 'cancelled'`), không dùng `any` hay `unknown` lỏng lẻo.

### 3.3. Fetching & Queries (`features/[feature]/api/queries.ts`)
* **Trách nhiệm**: Khởi tạo `queryOptions` và `queryKey factory` theo chuẩn TanStack Query v5.
* **Quy tắc**: Tuân thủ mẫu:
  ```typescript
  export const featureKeys = {
    all: ['feature-name'] as const,
    list: (filters: FeatureFilters) => [...featureKeys.all, 'list', filters] as const,
    detail: (id: string) => [...featureKeys.all, 'detail', id] as const
  };
  ```

### 3.4. Components (`features/[feature]/components/...`)
* **Trách nhiệm**: Phân rã nhỏ giao diện theo Single Responsibility Principle (SRP):
  * **`[feature]-page.tsx`**: Đóng vai trò Container/Orchestrator gom các khối lại, bọc các Context Provider cần thiết.
  * **Mỗi khối UI (Banner, Grid, Card, Dialog)** là 1 file riêng biệt với kích thước lý tưởng `< 200 dòng`.

---

## 4. HỆ THỐNG THIẾT KẾ UI/UX & TOKENS ĐỒNG BỘ VỚI LANDING PAGE

Để mọi màn hình trong hệ thống đều toát lên vẻ **hiện đại, cao cấp, chuẩn Brand NexSpace**, phải tuân thủ nghiêm ngặt các quy tắc thiết kế sau:

### 4.1. Bảng màu Nhận diện Thương hiệu (Color Tokens)
* **Màu chủ đạo (Primary Brand)**:
  * Main: `bg-[#4b41e1]` hoặc `bg-indigo-600` (OKLCH Indigo).
  * Hover: `hover:bg-[#4338CA]` hoặc `hover:bg-indigo-700`.
  * Radiant Gradient CTA: `bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA]`.
* **Màu bổ trợ (Accent Badges)**:
  * **Smart Cyan** (Nexus Node): `text-sky-500`, `bg-sky-50 dark:bg-sky-950/40`, `border-sky-200 dark:border-sky-800`.
  * **Emerald** (Giá trị tiền, Tiết kiệm, Active): `text-emerald-600 dark:text-emerald-400`, `bg-emerald-50 dark:bg-emerald-950/40`.
  * **Amber** (Rating, Cảnh báo, Đang giữ chỗ): `text-amber-500`, `fill-amber-400`, `bg-amber-50 dark:bg-amber-950/40`.
* **Nền hệ thống (System Background)**:
  * Light Mode: `#f8fafc` (Porcelain Slate-50 sang trọng, không dùng trắng gắt `#ffffff` thuần túy).
  * Dark Mode: `#090d16` (Deep Obsidian Midnight).

### 4.2. Hiệu ứng Kính Mờ & Đổ bóng (Glassmorphism & Elevation)
Mọi Card và Panel nổi bật đều sử dụng utility classes định nghĩa sẵn trong `globals.css`:
* **`.glass-card`**:
  ```css
  /* Nền trong suốt cao cấp hỗ trợ blur chiều sâu */
  Light: background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(226, 232, 240, 0.8);
  Dark:  background: rgba(15, 23, 42, 0.75);   border: 1px solid rgba(51, 65, 85, 0.6);
  ```
* **Hệ thống Shadow phân cấp**:
  * Nhẹ (`custom-level-1`): Dành cho Card danh sách thông thường.
  * Vừa (`custom-level-2`): Dành cho Card đang hover hoặc active tab.
  * Cao cấp (`custom-level-3`): Dành cho Hero Card, Search Card, Bảng điều khiển quan trọng.

### 4.3. Phân cấp Hành động (Action Hierarchy - Chống "Button Soup")
Học từ bài học tái cấu trúc Navbar và Form Đăng ký:
1. **Primary Action**: Chỉ có **DUY NHẤT 1 nút nổi bật** trên một tầm nhìn (Solid color, ví dụ: `bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800` hoặc Gradient, bo góc `rounded-xl`, đổ bóng `shadow-md hover:shadow-lg`).
2. **Tương tác Vật lý (Micro-interactions)**: Mọi nút nhấn (Button) phải có hiệu ứng bấm vật lý `active:scale-[0.98] transition-all duration-200`.
3. **Trạng thái Vô hiệu (Disabled State)**: Khi nút không thể bấm, phải làm mờ `disabled:opacity-50` và chuyển trỏ chuột `disabled:cursor-not-allowed` để ra tín hiệu rõ ràng cho người dùng.
4. **Secondary Action**: Sử dụng nút Ghost, nút Viền mảnh (`variant='outline'`) hoặc **Text Link tinh tế** (`text-indigo-600 dark:text-indigo-400 hover:text-indigo-700`).
5. **Micro-Utility Controls**: Gom các nút công cụ nhỏ (Theme Toggle, Language Switcher) vào **viên nang Capsule** bo tròn `rounded-full border border-border/80 bg-background/80 p-0.5`.

### 4.4. Chuyển động & Micro-Interactions (Motion Standards)
* Sử dụng thư viện `motion/react`:
  * Xuất hiện phân đoạn: Sử dụng kết hợp `opacity`, `translate` và `blur` để tạo hiệu ứng mượt mà cấp độ Pro Max.
    ```tsx
    <motion.div
      initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
    >
    ```
  * Chuyển tab động: Sử dụng `<AnimatePresence mode='wait'>` để nội dung fade mượt mà.

### 4.5. Kiến trúc Giao diện Split-Screen (Dành cho Auth & Forms)
Đúc kết từ quá trình chuẩn hóa trang Đăng ký (Register) và Đăng nhập (Sign In), mọi giao diện chia đôi màn hình (Split-Screen) phải tuân thủ layout chống đè chéo (Collision-Free Layout) và **Đảo ngược đối xứng (Inverted Symmetry)**:
* **Inverted Symmetry**: Các màn hình có cùng ngữ cảnh nhưng mục đích đối lập (Sign In vs Sign Up) NÊN đảo ngược bố cục (Ví dụ: Sign Up Form trái/Ảnh phải; Sign In Form phải/Ảnh trái) để tạo sự phân biệt trực quan trong tiềm thức người dùng.
* **Quy chuẩn Form Area**:
  * Tuyệt đối **KHÔNG** dùng `absolute` cho Navigation Header nếu màn hình có cuộn dọc hoặc flex-center.
  * Phải sử dụng cấu trúc:
    ```tsx
    <div className="flex h-full w-full flex-col p-6 lg:p-10 relative z-10">
      <header className="flex items-center justify-between w-full">...</header>
      <main className="flex flex-1 flex-col items-center justify-center py-10">
         <div className="mx-auto flex w-full max-w-[420px] flex-col justify-center space-y-6">...</div>
      </main>
      <footer className="w-full max-w-[420px] mx-auto pt-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4">...</footer>
    </div>
    ```
  * **Footer vi mô (Micro-footer)**: Phần chứng chỉ (SOC-2, SSL) và Links phải dàn ngang trên Desktop (`sm:flex-row sm:justify-between`) và xếp dọc căn giữa trên Mobile (`flex-col items-center justify-center`).
* **Quy chuẩn Hero Visual**:
  * Sử dụng ảnh `fetchPriority="high"` để tối ưu hóa LCP.
  * Tích hợp màng lọc chiều sâu và hiệu ứng Scale nhẹ (`motion-safe:transition-transform`):
    ```tsx
    <img className="absolute inset-0 h-full w-full object-cover scale-105 motion-safe:duration-1000" />
    <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
    ```

### 4.6. Trải nghiệm Form Nhập liệu (Form UX & Accessibility)
* **Bắt buộc**: Mọi field phải được gán `cursor-pointer` (đối với Checkbox, Radio, Label) để tối ưu hóa trải nghiệm PC.
* **Tương phản Typography**: Mọi tiêu đề (H1, H2) và văn bản hướng dẫn trong Form phải được gán màu tương phản mạnh: `text-slate-900 dark:text-white` (Tiêu đề) và `text-slate-600 dark:text-slate-300` (Đoạn văn).
* **Xác thực Mật khẩu**: Trường Password luôn phải đi kèm thanh đo mức độ mạnh/yếu (Password Strength Meter) gồm 4 cấp độ (Weak - Yếu, Fair - TB, Good - Tốt, Strong - Mạnh) cùng với tín hiệu màu sắc chuyển động mượt mà (`transition-colors duration-300`). **Nút Submit phải bị disabled (vô hiệu hóa) nếu điểm sức mạnh (score) < 2**.
* **Trường Nhập Mã (OTP Input)**: Các ô nhập mã xác thực phải có viền (ring) kích hoạt rõ nét (vd: `focus:ring-4 focus:ring-indigo-600/20`), căn giữa chữ (text-center), tạo khoảng cách tracking (`tracking-[1em]`) và con trỏ (caret) màu chính (`caret-indigo-600`).
* **Multi-step Forms (Flow phụ)**: Thay vì chuyển hướng URL sang trang mới cho từng bước phụ (như OTP, Tạo mật khẩu mới), bắt buộc dùng Stateful Form kết hợp `<AnimatePresence mode="wait">` của Framer Motion để tạo luồng trơn tru trên cùng 1 route.
* **Zod Error Extraction**: Thông báo lỗi từ Zod phải được extract đúng định dạng chuỗi (string) trước khi render để tránh React crash.

### 4.7. Kiến trúc Modal & Cửa sổ Pop-up (Dialog/Modal UX)
Đúc kết từ quá trình tích hợp OTP Verification Modal:
* **Tuyệt đối KHÔNG** sử dụng các hiệu ứng nền gây nhiễu (Lưới chấm bi, Glow Gradient chói) bên trong các container nhỏ hẹp như Modal/Dialog. Điều này gây suy giảm mạnh khả năng đọc (Readability), đặc biệt trên Dark Mode.
* **Màu nền tiêu chuẩn**: Bắt buộc sử dụng nền phẳng và có độ tương phản cao: `bg-white dark:bg-slate-900` kết hợp viền mỏng `border-border-subtle dark:border-slate-800`.
* **Kích thước & Hình khối**: Dùng `max-w-[440px] rounded-3xl shadow-2xl p-8 sm:p-10` để tạo khối modal tinh tế, bo góc sâu.
* **Chuyển đổi luồng (Flow Conversion)**: Hạn chế tối đa việc điều hướng sang trang trắng mới cho các bước phụ (như Nhập OTP, Xác nhận Email). Hãy bọc chúng trong Modal nổi lên ngay tại trang hiện tại để giữ Context của người dùng không bị đứt gãy.

### 4.8. Hệ thống Đa ngôn ngữ (i18n & Context)
* Mọi Label tĩnh trên màn hình đều phải được wrap bởi hàm `t('key')` thông qua Hook `useLanguage()`.
* **Cảnh báo TypeScript**: Luôn đảm bảo giải nén đúng các thuộc tính từ Hook: `const { language, setLanguage, t } = useLanguage();`. Khai báo thiếu `t` sẽ gây lỗi TS2304 lập tức.

---

## 5. QUY CHUẨN TYPOGRAPHY (FONT CHỮ TIẾNG VIỆT & TIẾNG ANH)

> **Cảnh báo cốt tử**: `DM Sans` bản gốc không có bộ ký tự tiếng Việt dẫn đến lỗi bể form (Frankenstein fallback sang Segoe UI). Toàn bộ dự án đã chuẩn hóa sang **`Plus Jakarta Sans`**.

### 5.1. Khai báo Font bắt buộc
Mọi trang và component phải tuân thủ font stack chính thức:
```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
```

### 5.2. Phân cấp Typography
* **Tiêu đề Cực Lớn (Hero Headings - Dành cho Auth/Landing H1)**:
  * Sử dụng class: `font-display-hero text-3xl font-bold tracking-tight` (hoặc text-4xl/5xl tùy màn hình).
* **Tiêu đề khối (Card/Section Titles - H3, H4)**:
  * Sử dụng class: `font-headline-sm` hoặc `font-headline-lg font-bold tracking-tight`.
* **Văn bản nội dung (Body / Descriptions)**:
  * Sử dụng class: `font-body-base text-body-base text-slate-600 dark:text-slate-300 leading-relaxed`.
* **Micro Labels & Badges**:
  * Sử dụng class: `font-caption-code text-caption-code tracking-wider uppercase`.
  * Context links & Utility: `font-label-base text-label-base font-semibold`.

---

## 6. MÃ NGUỒN MẪU (COPY-PASTEABLE TEMPLATES)

### 6.1. Template Route: `src/routes/dashboard/[feature].tsx`
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { WorkspacesPage } from '@/features/workspaces/components/workspaces-page';

// 1. Zod schema xác thực URL Search Params
const searchSchema = z.object({
  city: z.enum(['all', 'hcm', 'hanoi', 'danang']).optional().default('all'),
  search: z.string().optional()
});

// 2. Định nghĩa Route Type-Safe
export const Route = createFileRoute('/dashboard/workspaces')({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: 'Quản lý Không gian Làm việc | NexSpace' },
      { name: 'description', content: 'Quản lý danh sách mặt bằng và không gian linh hoạt NexSpace.' }
    ]
  }),
  component: WorkspacesRouteComponent
});

function WorkspacesRouteComponent() {
  return (
    <PageContainer
      pageTitle='Không gian làm việc'
      pageDescription='Quản lý danh mục mặt bằng, văn phòng chia sẻ và phòng họp.'
    >
      <WorkspacesPage />
    </PageContainer>
  );
}
```

---

### 6.2. Template Page Component: `src/features/[feature]/components/[feature]-page.tsx`
```tsx
import React, { useState } from 'react';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspacesGrid } from './workspaces-grid';
import { WorkspaceCreateModal } from './workspace-create-modal';

export function WorkspacesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className='space-y-6'>
      {/* 1. Header Toolbar */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        {/* Search input with icon */}
        <div className='relative max-w-sm flex-1'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Tìm kiếm văn phòng, tòa nhà...'
            className='border-input bg-card text-foreground focus-visible:ring-indigo-600 h-10 w-full rounded-xl border pl-9 pr-4 text-sm outline-none transition-all focus-visible:ring-2'
          />
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2.5'>
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer gap-2 rounded-xl text-xs font-semibold'
          >
            <SlidersHorizontal className='h-3.5 w-3.5' />
            <span>Bộ lọc</span>
          </Button>

          {/* Sole Radiant Primary CTA */}
          <Button
            size='sm'
            onClick={() => setIsCreateOpen(true)}
            className='cursor-pointer gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA] text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-[#3730A3] active:scale-[0.98]'
          >
            <Plus className='h-4 w-4' />
            <span>Thêm không gian mới</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Content Grid/Table */}
      <WorkspacesGrid search={searchTerm} />

      {/* 3. Action Dialog/Modal */}
      <WorkspaceCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
```

---

### 6.3. Template Card Component: `src/features/[feature]/components/[feature]-card.tsx`
```tsx
import React from 'react';
import { MapPin, Star, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceItem } from '../api/types';

interface WorkspaceCardProps {
  item: WorkspaceItem;
  onSelect: (item: WorkspaceItem) => void;
}

export function WorkspaceCard({ item, onSelect }: WorkspaceCardProps) {
  return (
    <article className='custom-level-1 hover:custom-level-2 glass-card group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1'>
      {/* Aspect Ratio Thumbnail */}
      <div className='bg-muted relative aspect-[16/10] overflow-hidden'>
        <img
          src={item.imageUrl}
          alt={item.title}
          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          loading='lazy'
        />

        {/* Status Badge */}
        <div className='absolute left-3 top-3'>
          <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-xs font-semibold text-emerald-800 backdrop-blur-xs dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
            {item.badgeText}
          </span>
        </div>

        {/* Rating Floating Chip */}
        <div className='bg-card/90 border-border/80 text-foreground absolute right-3 top-3 flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold backdrop-blur-sm'>
          <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
          <span>{item.rating}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className='flex flex-1 flex-col justify-between p-5'>
        <div className='space-y-1.5'>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <MapPin className='h-3.5 w-3.5 shrink-0 text-indigo-500' />
            <span className='truncate'>{item.location}</span>
          </div>

          <h3 className='text-foreground group-hover:text-indigo-600 font-display text-base font-bold tracking-tight transition-colors duration-150'>
            {item.title}
          </h3>
        </div>

        {/* Footer & Pricing */}
        <div className='border-border/60 mt-4 flex items-center justify-between border-t pt-3'>
          <div>
            <span className='text-foreground font-display text-lg font-extrabold text-[#4b41e1]'>
              ${item.hourlyPrice}
            </span>
            <span className='text-muted-foreground text-xs'> /giờ</span>
          </div>

          <Button
            size='sm'
            variant='outline'
            onClick={() => onSelect(item)}
            className='cursor-pointer rounded-lg text-xs font-semibold hover:border-indigo-400 hover:text-indigo-600'
          >
            Chi tiết
          </Button>
        </div>
      </div>
    </article>
  );
}
```

---

## 7. CHECKLIST KIỂM ĐỊNH CHẤT LƯỢNG (QUALITY GATES)

Trước khi tạo commit và mở Merge Request cho bất kỳ màn hình nào, bắt buộc phải hoàn thành 6 bước kiểm định:

| # | Tiêu chí | Lệnh kiểm tra | Yêu cầu đạt |
| :-: | :--- | :--- | :--- |
| **1** | **Cấu trúc thư mục** | Thủ công | File nằm đúng `features/[domain]/`, không viết UI trong `routes/`. |
| **2** | **Typography Lock** | Trực quan | Tiếng Việt không bể form, dùng font stack `Plus Jakarta Sans`. |
| **3** | **Kiểm tra Linter** | `npx oxlint src/features/[domain] src/routes/...` | **0 errors, 0 warnings**. |
| **4** | **Kiểm tra Formatter** | `npm run format:check` | Tất cả các file đã định dạng đúng chuẩn `oxfmt`. |
| **5** | **Kiểm tra TypeScript** | `npx tsc --noEmit` | **Exit code 0** (không có lỗi type hay any). |
| **6** | **Quy chuẩn Git Commit** | `git commit -m "feat([domain]): ..."` | Tuân thủ Conventional Commits (feat, fix, refactor). |

---

> **Tài liệu được phát hành và bảo chứng bởi NexSpace Core Engineering Team.**

