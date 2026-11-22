import React, { useState } from 'react';
import { Navbar } from './navbar';
import { HeroSection } from './hero-section';
import { StickyTopSearchBar } from './sticky-top-search-bar';
import { MarketplaceShowcase } from './marketplace-showcase';
import { HowItWorksSection } from './how-it-works-section';
import { PartnerCtaSection } from './partner-cta-section';
import { Footer } from './footer';
import { LandingSmoothScroll } from './landing-smooth-scroll';
import type { SearchCriteria } from './search-card';
import '../styles/landing-premium.css';

export default function LandingPage() {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    mode: 'all',
    location: '',
    dateTime: 'today-flexible',
    capacity: '1 - 4 People'
  });
  const [filterCriteria, setFilterCriteria] = useState<SearchCriteria | null>(null);

  const handleSearch = (criteria: SearchCriteria) => {
    setFilterCriteria(criteria);
  };

  const handleFilterChange = (criteria: SearchCriteria) => {
    setFilterCriteria(criteria);
  };

  const handleResetFilters = () => {
    setFilterCriteria(null);
    setSearchCriteria({
      mode: 'all',
      location: '',
      dateTime: 'today-flexible',
      capacity: '1 - 4 People'
    });
  };

  return (
    <div
      data-landing-root='true'
      className='landing-scope landing-premium relative min-h-screen flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200'
      style={{ fontFamily: 'var(--font-app)' }}
    >
      <LandingSmoothScroll />
      {/* Dynamic Sticky Search Bar - Appears at top when scrolling past hero search */}
      <StickyTopSearchBar
        criteria={searchCriteria}
        onChangeCriteria={setSearchCriteria}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      {/* 01. Header / Navigation (Normal document flow - scrolls with page) */}
      <Navbar sticky={false} />

      <main className='flex-1'>
        {/* 02. Hero + Workspace Search */}
        <HeroSection
          criteria={searchCriteria}
          onChangeCriteria={setSearchCriteria}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />

        {/* 03. Featured Workspaces */}
        <MarketplaceShowcase filterCriteria={filterCriteria} onResetFilters={handleResetFilters} />

        {/* 04. How It Works */}
        <HowItWorksSection />

        {/* 05. Become a Partner CTA */}
        <PartnerCtaSection />
      </main>

      {/* 06. Footer */}
      <Footer />
    </div>
  );
}
