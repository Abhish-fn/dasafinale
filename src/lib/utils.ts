/**
 * Format price from paisa to display string
 * @param paisa - Price in paisa (e.g., 24900 = ₹249.00)
 */
export function formatPrice(paisa: number): string {
  return `₹${(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Generate order ID in DD-DDMMYY-SEQ format
 * DD = brand prefix, DDMMYY = date, SEQ = sequence number
 */
export async function generateOrderId(getCount: () => Promise<number>): Promise<string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const dateStr = `${dd}${mm}${yy}`;
  const count = await getCount();
  const seq = String(count + 1).padStart(3, '0');
  return `DD-${dateStr}-${seq}`;
}

/**
 * Generate URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Merge class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Calculate shipping fee
 * Free above ₹499 (49900 paisa), flat ₹49 (4900 paisa) otherwise
 */
export function calculateShippingFee(subtotalPaisa: number): number {
  return subtotalPaisa >= 49900 ? 0 : 4900;
}

/**
 * Get category prefix for product ID generation
 */
export function getCategoryPrefix(category: string): string {
  const prefixes: Record<string, string> = {
    'Clay Pot Roasted Seeds & Superfoods': 'CPS',
    'Millet Munchies': 'MLM',
    'Trail Mixes': 'TRM',
    'Healthy Cookies': 'HCK',
    'Protein Bars': 'PRB',
    'Granola': 'GRN',
  };
  return prefixes[category] || 'DSN';
}

/**
 * Delay utility for retry logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
