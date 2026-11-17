import { createFileRoute } from '@tanstack/react-router';
import { SignUpViewPage } from '@/features/auth/components/sign-up-view';
import { z } from 'zod';

const signUpSearchSchema = z.object({
  verified: z.union([z.boolean(), z.string()]).optional(),
  email: z.string().optional()
});

export const Route = createFileRoute('/auth/sign-up/')({
  validateSearch: (search) => signUpSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Sign Up' }]
  }),
  component: SignUpViewPage
});
