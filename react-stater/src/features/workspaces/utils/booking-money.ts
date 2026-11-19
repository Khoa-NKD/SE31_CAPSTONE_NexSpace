/** Monetary values always carry the currency recorded by the backend; never infer it from their size. */
export function formatBookingMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2
  }).format(amount);
}

export function snapshotCurrency(snapshot?: string): string | null {
  try {
    const currency: unknown = JSON.parse(snapshot ?? '').currency;
    return currency === 'VND' || currency === 'USD' ? currency : null;
  } catch {
    return null;
  }
}
