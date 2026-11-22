import { useId, type SVGProps } from 'react';
import { BRAND_MARK_LEFT, BRAND_MARK_RIGHT, BRAND_MARK_SEAM, BRAND_VIEWBOX } from './logo-artwork';

export interface NexSpaceLogoProps extends SVGProps<SVGSVGElement> {
  variant?: 'full' | 'mark' | 'horizontal' | 'admin' | 'organizer';
  inverted?: boolean;
}

/** Share the approved plain doorway mark across lockups and compact brand icons. */
function BrandMark({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient
          id={`${id}-left`}
          x1='0'
          y1='0'
          x2='19'
          y2='64'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#9685FF' />
          <stop offset='0.48' stopColor='#8062F8' />
          <stop offset='1' stopColor='#6D35EA' />
        </linearGradient>
        <linearGradient
          id={`${id}-right`}
          x1='49'
          y1='5'
          x2='53'
          y2='64'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#719BFF' />
          <stop offset='1' stopColor='#2458E6' />
        </linearGradient>
      </defs>
      <path d={BRAND_MARK_RIGHT} fill={`url(#${id}-right)`} />
      <path d={BRAND_MARK_LEFT} fill={`url(#${id}-left)`} />
      <path d={BRAND_MARK_SEAM} stroke='#D7CFFF' strokeOpacity='0.55' strokeWidth='0.35' />
    </>
  );
}

export function NexSpaceMark({ className = 'h-8 w-8', ...props }: SVGProps<SVGSVGElement>) {
  const id = `nexspace-mark-${useId().replace(/:/g, '')}`;
  const hidden = props['aria-hidden'] === true || props['aria-hidden'] === 'true';
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='-3 -2 66 68'
      fill='none'
      className={className}
      aria-label={hidden ? undefined : 'NexSpace'}
      role={hidden ? 'presentation' : 'img'}
      {...props}
    >
      <BrandMark id={id} />
    </svg>
  );
}

export function NexSpaceLogo({
  variant = 'full',
  inverted = false,
  className = 'h-9 w-auto',
  ...props
}: NexSpaceLogoProps) {
  const id = `nexspace-logo-${useId().replace(/:/g, '')}`;
  if (variant === 'mark') return <NexSpaceMark className={className} {...props} />;
  const hidden = props['aria-hidden'] === true || props['aria-hidden'] === 'true';
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox={BRAND_VIEWBOX}
      width={340}
      height={66}
      fill='none'
      className={className}
      aria-label={hidden ? undefined : 'NexSpace — Flexible Workspace'}
      role={hidden ? 'presentation' : 'img'}
      {...props}
    >
      <defs>
        <linearGradient id={`${id}-word`} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop stopColor='#9685FF' />
          <stop offset='1' stopColor='#8062F8' />
        </linearGradient>
      </defs>
      <g transform='translate(1 1)'>
        <BrandMark id={id} />
      </g>
      <text
        x='81'
        y='42'
        fontFamily='var(--font-app)'
        fontSize='52'
        fontWeight='700'
        letterSpacing='-0.025em'
      >
        <tspan
          fill={inverted ? '#F4F5FF' : '#151927'}
          className={inverted ? undefined : 'fill-[#151927] dark:fill-[#F4F5FF]'}
        >
          Nex
        </tspan>
        <tspan fill={`url(#${id}-word)`}>Space</tspan>
      </text>
      <text
        x='82'
        y='62.5'
        fontFamily='var(--font-app)'
        fontSize='8.3'
        fontWeight='500'
        letterSpacing='3.6'
        fill={inverted ? '#AAB3C8' : '#64748B'}
        className={inverted ? undefined : 'fill-slate-500 dark:fill-[#AAB3C8]'}
      >
        FLEXIBLE WORKSPACE
      </text>
    </svg>
  );
}

export default NexSpaceLogo;
