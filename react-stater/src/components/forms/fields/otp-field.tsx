import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { VerificationCode } from '@/components/ui/verification-code';
import { useFieldContext, useFieldInvalid, type BaseFieldProps } from '@/lib/form-context';
/** Six-digit verification code; form state and backend validation stay unchanged. */
export function OtpField({ label, description, required }: BaseFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = useFieldInvalid();
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel>
        {label}
        {required && ' *'}
      </FieldLabel>
      <VerificationCode
        value={field.state.value}
        onChange={field.handleChange}
        ariaLabel={typeof label === 'string' ? label : 'Mã OTP'}
        status={isInvalid ? 'error' : 'idle'}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />}
    </Field>
  );
}
