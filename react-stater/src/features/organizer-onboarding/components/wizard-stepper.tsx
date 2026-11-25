import { Link, useLocation } from '@tanstack/react-router';
import {
  Building2,
  MapPin,
  Layers3,
  Clock,
  Wifi,
  ImageIcon,
  Check
} from '@/components/ui/hugeicons';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
export interface WizardStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
}
export function WizardStepper({ currentStep }: WizardStepperProps) {
  const c = useOrganizerCopy();
  const editing = (useLocation().search as Record<string, unknown>).mode === 'edit';
  const steps = [
    {
      title: c('Basic information', 'Thông tin cơ bản'),
      icon: Building2,
      route: '/dashboard/organizer/workspaces/create'
    },
    {
      title: c('Location', 'Địa điểm'),
      icon: MapPin,
      route: '/dashboard/organizer/workspaces/create/location'
    },
    {
      title: c('Floors', 'Cấu hình tầng'),
      icon: Layers3,
      route: '/dashboard/organizer/workspaces/create/location'
    },
    {
      title: c('Opening hours', 'Giờ hoạt động'),
      icon: Clock,
      route: '/dashboard/organizer/workspaces/create/hours'
    },
    {
      title: c('Amenities', 'Tiện ích'),
      icon: Wifi,
      route: '/dashboard/organizer/workspaces/create/amenities'
    },
    {
      title: c('Photos', 'Thư viện ảnh'),
      icon: ImageIcon,
      route: '/dashboard/organizer/workspaces/create/media'
    }
  ] as const;
  return (
    <nav
      aria-label={editing ? 'Chọn mục chỉnh sửa' : 'Các bước tạo không gian'}
      className='wizard-step-nav'
    >
      {!editing && (
        <div className='wizard-progress-wrap'>
          <div className='wizard-progress-label'>
            <span>Tiến trình tạo không gian</span>
            <strong>
              Bước {currentStep}/{steps.length}
            </strong>
          </div>
          <div
            className='wizard-progress-track'
            role='progressbar'
            aria-label='Tiến trình tạo không gian'
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={currentStep}
          >
            <span style={{ width: `${(currentStep / steps.length) * 100}%` }} />
          </div>
        </div>
      )}
      <ol>
        {steps.map((step, index) => {
          const number = index + 1,
            current = number === currentStep,
            complete = !editing && number < currentStep;
          const Icon = complete ? Check : step.icon;
          const content = (
            <>
              <span className='wizard-step-icon'>
                <Icon className='size-4' aria-hidden='true' />
              </span>
              <span className='wizard-step-label'>{step.title}</span>
              <span className='wizard-step-number'>{String(number).padStart(2, '0')}</span>
            </>
          );
          return (
            <li key={step.title} data-current={current} data-complete={complete}>
              {editing || complete ? (
                <Link
                  to={step.route}
                  search={(prev) => ({
                    ...prev,
                    stage: number === 3 ? ('floors' as const) : undefined
                  })}
                  aria-current={current ? 'step' : undefined}
                >
                  {content}
                </Link>
              ) : (
                <div aria-current={current ? 'step' : undefined} aria-disabled={!current}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
