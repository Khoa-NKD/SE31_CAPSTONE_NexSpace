import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import type { OrganizerWorkspace } from '../types';

export type WizardStepRoute =
  | '/dashboard/organizer/workspaces/create'
  | '/dashboard/organizer/workspaces/create/location'
  | '/dashboard/organizer/workspaces/create/hours'
  | '/dashboard/organizer/workspaces/create/amenities'
  | '/dashboard/organizer/workspaces/create/media'
  | '/dashboard/organizer/workspaces/create/floor-plan'
  | '/dashboard/organizer/workspaces/create/review';

/**
 * Determines the target route to resume setup for a draft workspace.
 * Prioritizes:
 * 1. Last recorded step in localStorage for this workspace ID.
 * 2. Next incomplete step deduced from draft progress, warnings, and missing fields.
 */
export function getWorkspaceResumeRoute(workspace: OrganizerWorkspace): WizardStepRoute {
  // 1. Check if there's a stored last step for this workspace
  try {
    const storedSteps = useWizardStore.getState().workspaceSteps;
    const recordedRoute = storedSteps?.[workspace.id] as WizardStepRoute | undefined;
    if (recordedRoute) {
      return recordedRoute;
    }
  } catch {
    // ignore
  }

  // 2. Dynamic heuristic deduction based on draft progress & warnings
  const warning = (workspace.draftWarningMessage || '').toLowerCase();
  const progress = workspace.draftProgress ?? 0;

  if (
    warning.includes('floor plan') ||
    warning.includes('pricing') ||
    progress >= 80 ||
    (workspace.imageUrl && workspace.desksCount === 0)
  ) {
    return '/dashboard/organizer/workspaces/create/floor-plan';
  }

  if (warning.includes('media') || warning.includes('photo') || progress >= 60 || !workspace.imageUrl) {
    return '/dashboard/organizer/workspaces/create/media';
  }

  if (warning.includes('amenit') || progress >= 50) {
    return '/dashboard/organizer/workspaces/create/amenities';
  }

  if (warning.includes('hour') || progress >= 40) {
    return '/dashboard/organizer/workspaces/create/hours';
  }

  if (
    warning.includes('location') ||
    warning.includes('address') ||
    progress >= 20 ||
    (workspace.address && workspace.city)
  ) {
    return '/dashboard/organizer/workspaces/create/location';
  }

  return '/dashboard/organizer/workspaces/create';
}

