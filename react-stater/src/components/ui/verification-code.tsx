import CodeSlots, { type CodeSlotsProps } from '@/components/react-bits/CodeSlots';
/** Visual-only OTP adapter: validation and submission remain owned by the caller. */
export function VerificationCode(
  props: Pick<
    CodeSlotsProps,
    'value' | 'onChange' | 'disabled' | 'ariaLabel' | 'status' | 'autoFocus'
  >
) {
  return (
    <CodeSlots
      length={6}
      slotSize={36}
      gap={6}
      accentColor='var(--primary)'
      inkColor='var(--foreground)'
      slotColor='var(--muted)'
      digitColor='var(--primary-foreground)'
      dangerColor='var(--destructive)'
      {...props}
    />
  );
}
