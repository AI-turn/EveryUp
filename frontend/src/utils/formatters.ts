/**
 * Check if a string is valid JSON
 */
export function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format JSON string with indentation
 */
export function formatJSON(str: string, indent: number = 2): string {
  try {
    return JSON.stringify(JSON.parse(str), null, indent);
  } catch {
    return str;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
