import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import React from 'react';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

export interface WizardStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
}

const getSteps = (c: (en: string, vi: string) => string) =>
  [
    {
      number: 1,
      title: c('Basic Info', 'Thông tin cơ bản'),
      route: '/dashboard/organizer/workspaces/create'
    },

    {
      number: 2,
      title: c('Location', 'Địa điểm'),
      route: '/dashboard/organizer/workspaces/create/location'
    },
    {
      number: 3,
      title: c('Floors', 'Cấu hình tầng'),
      route: '/dashboard/organizer/workspaces/create/location'
    },
    {
      number: 4,
      title: c('Hours & policies', 'Giờ & chính sách'),
      route: '/dashboard/organizer/workspaces/create/hours'
    },
    {
      number: 5,
      title: c('Amenities', 'Tiện ích'),
      route: '/dashboard/organizer/workspaces/create/amenities'
    },
    {
      number: 6,
      title: c('Photos & Media', 'Thư viện ảnh'),
      route: '/dashboard/organizer/workspaces/create/media'
    }
  ] as const;

export function WizardStepper({ currentStep }: WizardStepperProps) {
  const c = useOrganizerCopy();
  // Compute progress line width
  const progressPercent = ((currentStep - 1) / 5) * 100;

  return (
    <div className='max-w-4xl mx-auto mb-6 sm:mb-8 px-2'>
      <nav aria-label={c('Wizard Progress', 'Tiến độ thiết lập')}>
        <ol className='flex items-center justify-between w-full relative'>
          {/* Background Connecting Line */}
          <div className='absolute left-4 right-4 top-4 h-0.5 bg-border -z-0'>
            {/* Completed Segment */}
            <div
              className='h-full bg-indigo-600 transition-all duration-300'
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {getSteps(c).map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            const StepNode = (
              <div className='flex flex-col items-center group z-10'>
                <div
                  className={`size-8 sm:size-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                    isCompleted
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/70 font-bold'
                        : 'bg-card border-2 border-border text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className='size-4 stroke-[3]' /> : step.number}
                </div>
                <span
                  className={`mt-2 text-[11px] sm:text-xs font-medium text-center truncate max-w-[70px] sm:max-w-none ${
                    isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : isCompleted
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );

            return (
              <li key={step.number} className='relative'>
                {isCompleted ? (
                  <Link
                    to={step.route}
                    search={(prev) => ({
                      ...prev,
                      stage: step.number === 3 ? ('floors' as const) : undefined
                    })}
                    className='cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full'
                    aria-label={`Go to Step ${step.number}: ${step.title}`}
                  >
                    {StepNode}
                  </Link>
                ) : (
                  StepNode
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
