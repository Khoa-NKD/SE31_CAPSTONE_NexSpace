import React from 'react';
import { Navbar } from './navbar';
import { HeroSection } from './hero-section';
import { StatsBar } from './stats-bar';
import { PlatformLayers } from './platform-layers';
import { MarketplaceShowcase } from './marketplace-showcase';
import { TestimonialsSection } from './testimonials-section';
import { ResourcesSection } from './resources-section';
import { EnterpriseCta } from './enterprise-cta';
import { Footer } from './footer';

export default function LandingPage() {
  return (
    <div className='bg-background text-foreground min-h-screen antialiased selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200'>
      {/* 1. Header Navigation */}
      <Navbar />

      <main>
        {/* 2. Hero & Elevated Search Engine with Infinite Marquee */}
        <HeroSection />

        {/* 3. Key Enterprise Impact Stats Banner */}
        <StatsBar />

        {/* 4. The Smart Office Platform (3-Layer Interactive Architectural Switcher) */}
        <PlatformLayers />

        {/* 5. Live Marketplace Showcase & Landlord Callout */}
        <MarketplaceShowcase />

        {/* 6. Real Results from Real Teams (Categorized Enterprise Reviews) */}
        <TestimonialsSection />

        {/* 7. Workplace Insights & Resources */}
        <ResourcesSection />

        {/* 8. Enterprise Consultation & Interactive Lease ROI Modeler */}
        <EnterpriseCta />
      </main>

      {/* 9. Comprehensive Platform Footer */}
      <Footer />
    </div>
  );
}
