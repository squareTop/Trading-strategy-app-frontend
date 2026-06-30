/**
 * Formats a raw number of currency into a short-hand notation (M, B, T).
 */
export function formatFinancial(value: number, currency = "USD"): string {
  if (value === undefined || value === null) return "N/A";
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  const absVal = Math.abs(value);
  if (absVal >= 1e12) {
    return `${formatter.format(value / 1e12)} T`;
  } else if (absVal >= 1e9) {
    return `${formatter.format(value / 1e9)} B`;
  } else if (absVal >= 1e6) {
    return `${formatter.format(value / 1e6)} M`;
  }

  return formatter.format(value);
}

/**
 * Formats standard price values with exact decimals (e.g. $298.01).
 */
export function formatPrice(value: number, currency = "USD", decimals = 2): string {
  if (value === undefined || value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats ratio into pretty percentages.
 */
export function formatPercent(value: number): string {
  if (value === undefined || value === null) return "0.0%";
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formats a plain number with commas.
 */
export function formatLargeNumber(value: number): string {
  if (value === undefined || value === null) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/**
 * Formats ISO strings into stylized readable date strings.
 */
export function formatDate(isoStr: string, timeZone?: string): string {
  if (!isoStr) return "N/A";
  try {
    const date = new Date(isoStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timeZone
    });
  } catch {
    return isoStr;
  }
}
