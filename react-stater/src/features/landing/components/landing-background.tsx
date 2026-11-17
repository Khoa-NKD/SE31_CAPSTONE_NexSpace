import React from 'react';

/**
 * LandingBackground
 *
 * Multi-layered spatial brand background for NexSpace:
 * 1. Adaptive Canvas Tone: Soft porcelain slate-50 in Light mode, deep obsidian midnight in Dark mode.
 * 2. Brand Aurora Mesh: Indigo (#4F46E5) + Smart-space Cyan (#0EA5E9) + Violet glows echoing the 3D brand logo.
 * 3. Architectural Precision Grid: Clean 56px spatial lines with smooth radial vignette fade (no coarse dot patterns).
 * 4. Horizon Accent Beam: Delicate 1px gradient light guide at the top horizon.
 */
export function LandingBackground() {
  return (
    <div className='pointer-events-none fixed inset-0 -z-10 overflow-hidden' aria-hidden='true'>
      {/* 1. Base Canvas Tone */}
      <div className='absolute inset-0 bg-[#f8fafc] transition-colors duration-500 dark:bg-[#090d16]' />

      {/* 2. Top Spatial Aurora Mesh - Primary Indigo & Cyan Glows */}
      <div className='absolute -top-[20%] left-1/2 h-[760px] w-[1300px] -translate-x-1/2'>
        {/* Central Brand Indigo Glow */}
        <div className='absolute top-0 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/15 via-indigo-600/10 to-transparent blur-[120px] dark:from-indigo-600/25 dark:via-indigo-700/15 dark:blur-[140px]' />

        {/* Satellite Cyan Glow (Matching NexSpace Smart Node) */}
        <div className='animate-float absolute top-[12%] right-[12%] h-[420px] w-[460px] rounded-full bg-sky-400/12 blur-[100px] dark:bg-sky-500/18 dark:blur-[130px]' />

        {/* Soft Violet Horizon Depth */}
        <div className='absolute top-[22%] left-[10%] h-[420px] w-[520px] rounded-full bg-violet-500/10 blur-[110px] dark:bg-purple-600/15 dark:blur-[130px]' />
      </div>

      {/* 3. Mid-Page Subtle Ambience (Behind Platform & Marketplace) */}
      <div className='absolute top-[42%] -right-24 h-[650px] w-[650px] rounded-full bg-indigo-500/6 blur-[140px] dark:bg-indigo-600/12' />
      <div className='absolute top-[68%] -left-24 h-[650px] w-[650px] rounded-full bg-sky-500/6 blur-[140px] dark:bg-sky-600/10' />

      {/* 4. Architectural Spatial Line Grid with Elliptical Vignette Mask */}
      {/* Replaces harsh dot grids with high-precision structural lines that dissolve seamlessly */}
      <div
        className='absolute inset-0 opacity-[0.45] dark:opacity-[0.25]'
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 25%, black 20%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 25%, black 20%, transparent 85%)'
        }}
      />

      {/* 5. Ultra-fine Top Horizon Light Beam */}
      <div className='absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent' />
    </div>
  );
}
