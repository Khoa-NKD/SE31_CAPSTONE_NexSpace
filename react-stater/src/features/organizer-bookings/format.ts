const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function formatBookingMoney(amount: number): string {
  return vndFormatter.format(amount);
}
