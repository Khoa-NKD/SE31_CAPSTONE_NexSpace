import React from 'react';
import { Navbar } from '@/features/landing/components/navbar';

/**
 * WorkspaceHeader uses the canonical shared Navbar component
 * to guarantee 100% visual and functional consistency across
 * Landing Page, Workspace Explorer, and Detail pages.
 */
export function WorkspaceHeader() {
  return <Navbar sticky={true} />;
}
