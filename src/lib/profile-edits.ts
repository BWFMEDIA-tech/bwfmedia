/** Compare editor values against the loaded snapshot, without touching hidden columns. */
export function changedFields<T extends object>(baseline: T, edited: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(edited) as Array<keyof T>) {
    if (JSON.stringify(baseline[key]) !== JSON.stringify(edited[key])) patch[key] = edited[key];
  }
  return patch;
}