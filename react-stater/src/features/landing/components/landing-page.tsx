import React from 'react';
import { Navbar } from './navbar';
import { HeroSection } from './hero-section';
import { PlatformLayers } from './platform-layers';
import { MarketplaceShowcase } from './marketplace-showcase';
import { TestimonialsSection } from './testimonials-section';
import { EnterpriseCta } from './enterprise-cta';
import { Footer } from './footer';

export default function LandingPage() {
  return (
    <div className='bg-background text-foreground min-h-screen antialiased selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200'>
      {/* 1. Header Navigation */}
      <Navbar />

      <main>
        {/* 2. Hero & Elevated Search Engine */}
        <HeroSection />

        {/* 3. The Three Layers Platform Section (Bento / Modular Architecture) */}
        <PlatformLayers />

        {/* 4. Live Marketplace Showcase Section */}
        <MarketplaceShowcase />

        {/* 5. Testimonial & Enterprise Case Study Section */}
        <TestimonialsSection />

        {/* 6. Enterprise Conversion CTA Banner */}
        <EnterpriseCta />
      </main>

      {/* 7. Comprehensive Platform Footer */}
      <Footer />
    </div>
  );
}
