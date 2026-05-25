/**
 * Sanitize objects to prevent MongoDB operator injection.
 * Strips keys starting with '$' or containing '.' which could be used
 * to inject operators like $gt, $where, $regex into queries.
 *
 * Mongoose alone does NOT prevent this — query params can still be objects.
 */
export function sanitize<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize) as T;

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip dangerous keys
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = typeof value === 'object' ? sanitize(value) : value;
  }
  return clean as T;
}

/**
 * Sanitize a string value to prevent regex injection
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
