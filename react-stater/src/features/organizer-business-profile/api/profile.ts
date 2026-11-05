import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';
import type { ApplicationInput } from '../../organizer-application/api/application.ts';
import { z } from 'zod';

export const businessContactSchema = z.object({
  address: z.string().trim().min(1, 'Business address is required').max(500),
  contactEmail: z.string().trim().email('Enter a valid contact email').max(255),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+0-9() .-]{8,20}$/, 'Enter a valid phone number (8–20 characters)')
});

export type BusinessContactInput = z.infer<typeof businessContactSchema>;

export const bankDetailsSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required').max(100),
  bankAccountHolder: z.string().trim().min(1, 'Account holder is required').max(100),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^(?:[0-9]{6,34})?$/, 'Enter an account number containing 6–34 digits')
    .optional()
});
export const businessProfileSchema = businessContactSchema.extend({
  bankDetails: bankDetailsSchema.optional()
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export interface OrganizerBusinessProfile {
  id: number;
  legalName: string | null;
  businessType: ApplicationInput['businessType'] | null;
  taxId: string | null;
  representativeName: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountLastFour: string | null;
  bankAccountConfigured: boolean;
  bankingAvailable: boolean;
}

export const businessProfileKeys = {
  detail: (actorId: number) => ['organizer-business-profile', actorId] as const
};

export function businessProfileQueryOptions(actorId: number) {
  return queryOptions({
    queryKey: businessProfileKeys.detail(actorId),
    queryFn: ({ signal }) =>
      backendRequest<OrganizerBusinessProfile>(
        '/organizer/business-profile',
        'GET',
        undefined,
        true,
        signal
      ),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    // Refetching while editing must not replace the organizer's unsaved contact details.
    refetchOnWindowFocus: false
  });
}

export function businessProfileMutationOptions(queryClient: QueryClient, actorId: number) {
  return {
    mutationFn: (input: BusinessProfileInput) => {
      const { address, contactEmail, contactPhone, bankDetails } =
        businessProfileSchema.parse(input);
      return backendRequest<OrganizerBusinessProfile>('/organizer/business-profile', 'PUT', {
        address,
        contactEmail,
        contactPhone,
        ...(bankDetails ? { bankDetails } : {})
      });
    },
    onSuccess: async (profile: OrganizerBusinessProfile) => {
      const queryKey = businessProfileKeys.detail(actorId);
      queryClient.setQueryData(queryKey, profile);
      await queryClient.invalidateQueries({ queryKey, exact: true });
    }
  };
}
