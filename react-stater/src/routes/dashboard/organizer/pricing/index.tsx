import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import { PricingMatrixView } from '@/features/organizer-pricing/components/pricing-matrix-view';

export const Route = createFileRoute('/dashboard/organizer/pricing/')({
  head: () => ({
    meta: [
      { title: 'Resource Pricing Matrix Configuration | NexSpace Organizer Hub' },
      {
        name: 'description',
        content:
          'Configure base rates, duration volume discounts, and peak surcharges across all coworking units and meeting suites.'
      }
    ]
  }),
  component: OrganizerPricingPage
});

function OrganizerPricingPage() {
  return (
    <PageContainer>
      <PricingMatrixView />
    </PageContainer>
  );
}

