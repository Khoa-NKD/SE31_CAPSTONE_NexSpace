/** Allow consent only after the readable agreement reaches its end, including short documents. */
export function agreementReadComplete(metrics: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  return (
    Number.isFinite(metrics.scrollTop) &&
    Number.isFinite(metrics.clientHeight) &&
    Number.isFinite(metrics.scrollHeight) &&
    metrics.scrollTop >= 0 &&
    metrics.clientHeight > 0 &&
    metrics.scrollHeight > 0 &&
    metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 2
  );
}
