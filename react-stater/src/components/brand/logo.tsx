import React from 'react';

export interface NexSpaceLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'mark' | 'horizontal';
  inverted?: boolean;
  className?: string;
}

export function NexSpaceMark({ className = 'h-8 w-8', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 56 56'
      fill='none'
      className={className}
      aria-label='NexSpace Nexus Mark'
      role='img'
      {...props}
    >
      <defs>
        <linearGradient id='nexPillarLeftMark' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#6366F1' />
          <stop offset='100%' stopColor='#4338CA' />
        </linearGradient>
        <linearGradient id='nexCenterPlaneMark' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#38BDF8' />
          <stop offset='100%' stopColor='#0284C7' />
        </linearGradient>
        <linearGradient id='nexPillarRightMark' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#4338CA' />
          <stop offset='100%' stopColor='#1E1B4B' />
        </linearGradient>
        <linearGradient id='nexRoofFacetMark' x1='0%' y1='100%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='#BAE6FD' stopOpacity='0.9' />
          <stop offset='100%' stopColor='#FFFFFF' stopOpacity='0.95' />
        </linearGradient>
        <filter id='cyanGlowMark' x='-30%' y='-30%' width='160%' height='160%'>
          <feDropShadow dx='0' dy='1' stdDeviation='2' floodColor='#38BDF8' floodOpacity='0.7' />
        </filter>
      </defs>

      <g transform='translate(4, 4)'>
        {/* Left Vertical Architectural Pillar */}
        <path d='M6,13 L19,5.5 L19,38 L6,45 Z' fill='url(#nexPillarLeftMark)' />

        {/* Center Connecting Diagonal Spatial Plane */}
        <path
          d='M19,17.5 L35,8 L35,39.5 L19,49 Z'
          fill='url(#nexCenterPlaneMark)'
          fillOpacity='0.96'
        />
        <path
          d='M19,17.5 L35,8'
          stroke='#E0F2FE'
          strokeWidth='1.2'
          strokeLinecap='round'
          opacity='0.8'
        />

        {/* Right Pillar */}
        <path d='M35,8 L48,15.5 L48,47 L35,39.5 Z' fill='url(#nexPillarRightMark)' />

        {/* Dynamic interlocking roof facet / spatial node fold */}
        <polygon points='19,5.5 35,8 25,14 9,11.5' fill='url(#nexRoofFacetMark)' />

        {/* Satellite Smart-Space Cyan Node */}
        <circle cx='27' cy='5.5' r='3.5' fill='#38BDF8' filter='url(#cyanGlowMark)' />
        <circle cx='27' cy='5.5' r='1.5' fill='#FFFFFF' />
      </g>
    </svg>
  );
}

export function NexSpaceLogo({
  variant = 'full',
  inverted = false,
  className = 'h-9 w-auto',
  ...props
}: NexSpaceLogoProps) {
  if (variant === 'mark') {
    return <NexSpaceMark className={className} {...props} />;
  }

  const isHorizontal = variant === 'horizontal';
  const viewBox = isHorizontal ? '0 0 220 56' : '0 0 280 64';
  const width = isHorizontal ? 220 : 280;
  const height = isHorizontal ? 56 : 64;

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox={viewBox}
      width={width}
      height={height}
      fill='none'
      className={className}
      aria-label='NexSpace Logo'
      role='img'
      {...props}
    >
      <defs>
        <linearGradient id='nexPillarLeft' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#6366F1' />
          <stop offset='100%' stopColor='#4F46E5' />
        </linearGradient>
        <linearGradient id='nexCenterPlane' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#38BDF8' />
          <stop offset='100%' stopColor='#0284C7' />
        </linearGradient>
        <linearGradient id='nexPillarRight' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#4338CA' />
          <stop offset='100%' stopColor='#1E1B4B' />
        </linearGradient>
        <linearGradient id='nexRoofFacet' x1='0%' y1='100%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='#BAE6FD' stopOpacity='0.9' />
          <stop offset='100%' stopColor='#FFFFFF' stopOpacity='0.95' />
        </linearGradient>
        <linearGradient id='nexTextIndigo' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#6366F1' />
          <stop offset='100%' stopColor='#4F46E5' />
        </linearGradient>
        <filter id='cyanGlow' x='-30%' y='-30%' width='160%' height='160%'>
          <feDropShadow dx='0' dy='1' stdDeviation='2' floodColor='#38BDF8' floodOpacity='0.6' />
        </filter>
      </defs>

      {/* 3D Architectural Spatial 'N' Nexus Mark */}
      <g transform='translate(6, 6)'>
        {/* Left Vertical Pillar */}
        <path d='M6,13 L19,5.5 L19,38 L6,45 Z' fill='url(#nexPillarLeft)' />

        {/* Center Connecting Diagonal Spatial Plane */}
        <path d='M19,17.5 L35,8 L35,39.5 L19,49 Z' fill='url(#nexCenterPlane)' fillOpacity='0.96' />
        <path
          d='M19,17.5 L35,8'
          stroke='#E0F2FE'
          strokeWidth='1.2'
          strokeLinecap='round'
          opacity='0.8'
        />

        {/* Right Pillar */}
        <path d='M35,8 L48,15.5 L48,47 L35,39.5 Z' fill='url(#nexPillarRight)' />

        {/* Dynamic interlocking roof facet / spatial node fold */}
        <polygon points='19,5.5 35,8 25,14 9,11.5' fill='url(#nexRoofFacet)' />

        {/* Satellite Smart-Space Cyan Node */}
        <circle cx='27' cy='5.5' r='3.5' fill='#38BDF8' filter='url(#cyanGlow)' />
        <circle cx='27' cy='5.5' r='1.5' fill='#FFFFFF' />
      </g>

      {/* NexSpace Typography Wordmark */}
      {/* "Nex" in Extra-Bold 800 */}
      <text
        x='66'
        y={isHorizontal ? '36' : '36'}
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight='800'
        fontSize='27'
        fill={inverted ? '#FFFFFF' : '#0F172A'}
        className={inverted ? 'fill-white' : 'fill-slate-900 dark:fill-white'}
        letterSpacing='-0.03em'
      >
        Nex
      </text>

      {/* "Space" in Bold 700 with vibrant indigo tone */}
      <text
        x='118'
        y={isHorizontal ? '36' : '36'}
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight='700'
        fontSize='27'
        fill='url(#nexTextIndigo)'
        letterSpacing='-0.02em'
      >
        Space
      </text>

      {/* Subtitle Tagline: "FLEXIBLE WORKSPACE" (Only in full variant) */}
      {!isHorizontal && (
        <text
          x='67'
          y='49'
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight='700'
          fontSize='8.5'
          fill={inverted ? '#94A3B8' : '#64748B'}
          className={inverted ? 'fill-slate-400' : 'fill-slate-500 dark:fill-slate-400'}
          letterSpacing='0.22em'
        >
          FLEXIBLE WORKSPACE
        </text>
      )}
    </svg>
  );
}

export default NexSpaceLogo;
