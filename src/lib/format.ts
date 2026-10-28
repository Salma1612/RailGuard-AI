export const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;

export const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export const fileSize = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : mb(n));
