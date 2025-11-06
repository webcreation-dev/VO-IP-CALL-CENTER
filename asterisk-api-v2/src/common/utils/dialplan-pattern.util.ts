/**
 * Utility for parsing Asterisk dialplan patterns
 *
 * Extracts the starting number from patterns like:
 * - _1XXX -> 1000 (1000-1999)
 * - _2XXX -> 2000 (2000-2999)
 * - _[1-5]XXX -> 1000 (1000-5999)
 * - _9XX -> 900 (900-999)
 */

/**
 * Extracts the starting number from an Asterisk dialplan pattern
 *
 * @param pattern - The dialplan pattern (e.g., "_1XXX", "_2XXX")
 * @returns The starting number for agent IDs
 *
 * @example
 * getStartingNumberFromPattern("_1XXX") // => 1000
 * getStartingNumberFromPattern("_2XXX") // => 2000
 * getStartingNumberFromPattern("_[1-5]XXX") // => 1000
 * getStartingNumberFromPattern("_9XX") // => 900
 */
export function getStartingNumberFromPattern(pattern: string): number {
  if (!pattern || typeof pattern !== 'string') {
    return 1000; // Default fallback
  }

  // Remove the leading underscore if present
  const cleanPattern = pattern.startsWith('_') ? pattern.slice(1) : pattern;

  // Handle bracket patterns like [1-5]XXX -> extract first digit
  const bracketMatch = cleanPattern.match(/^\[(\d)-\d\]/);
  if (bracketMatch) {
    const firstDigit = bracketMatch[1];
    const xCount = (cleanPattern.match(/X/g) || []).length;
    return parseInt(firstDigit) * Math.pow(10, xCount);
  }

  // Handle simple patterns like 1XXX, 2XXX, etc.
  const digitMatch = cleanPattern.match(/^(\d+)(X+)$/);
  if (digitMatch) {
    const prefix = digitMatch[1];
    const xCount = digitMatch[2].length;
    // For "1XXX" with 3 X's: 1 * 1000 = 1000
    // For "2XXX" with 3 X's: 2 * 1000 = 2000
    // For "9XX" with 2 X's: 9 * 100 = 900
    return parseInt(prefix) * Math.pow(10, xCount);
  }

  // Handle patterns with only X's (like "XXX")
  const onlyXMatch = cleanPattern.match(/^(X+)$/);
  if (onlyXMatch) {
    const xCount = onlyXMatch[1].length;
    // For "XXX": start at 100
    // For "XXXX": start at 1000
    return Math.pow(10, xCount - 1);
  }

  // Default fallback
  return 1000;
}

/**
 * Validates if a number matches a dialplan pattern
 *
 * @param number - The number to validate
 * @param pattern - The dialplan pattern
 * @returns true if the number matches the pattern
 *
 * @example
 * isNumberInPattern(1001, "_1XXX") // => true
 * isNumberInPattern(2001, "_1XXX") // => false
 * isNumberInPattern(1500, "_[1-5]XXX") // => true
 */
export function isNumberInPattern(number: number, pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  const numStr = number.toString();

  // Remove the leading underscore if present
  const cleanPattern = pattern.startsWith('_') ? pattern.slice(1) : pattern;

  // Handle bracket patterns like [1-5]XXX
  const bracketMatch = cleanPattern.match(/^\[(\d)-(\d)\](X+)$/);
  if (bracketMatch) {
    const minDigit = parseInt(bracketMatch[1]);
    const maxDigit = parseInt(bracketMatch[2]);
    const xCount = bracketMatch[3].length;

    if (numStr.length !== xCount + 1) {
      return false;
    }

    const firstDigit = parseInt(numStr[0]);
    return firstDigit >= minDigit && firstDigit <= maxDigit;
  }

  // Handle simple patterns like 1XXX, 2XXX
  const digitMatch = cleanPattern.match(/^(\d+)(X+)$/);
  if (digitMatch) {
    const prefix = digitMatch[1];
    const xCount = digitMatch[2].length;
    const expectedLength = prefix.length + xCount;

    return numStr.length === expectedLength && numStr.startsWith(prefix);
  }

  // Handle patterns with only X's
  const onlyXMatch = cleanPattern.match(/^(X+)$/);
  if (onlyXMatch) {
    const xCount = onlyXMatch[1].length;
    return numStr.length === xCount;
  }

  return false;
}

/**
 * Gets the maximum number that can be assigned for a pattern
 *
 * @param pattern - The dialplan pattern
 * @returns The maximum number allowed by the pattern
 *
 * @example
 * getMaxNumberFromPattern("_1XXX") // => 1999
 * getMaxNumberFromPattern("_2XXX") // => 2999
 */
export function getMaxNumberFromPattern(pattern: string): number {
  if (!pattern || typeof pattern !== 'string') {
    return 9999; // Default fallback
  }

  // Remove the leading underscore if present
  const cleanPattern = pattern.startsWith('_') ? pattern.slice(1) : pattern;

  // Handle bracket patterns like [1-5]XXX -> max is 5999
  const bracketMatch = cleanPattern.match(/^\[(\d)-(\d)\](X+)$/);
  if (bracketMatch) {
    const maxDigit = bracketMatch[2];
    const xCount = bracketMatch[3].length;
    const maxForX = Math.pow(10, xCount) - 1;
    return parseInt(maxDigit) * Math.pow(10, xCount) + maxForX;
  }

  // Handle simple patterns like 1XXX, 2XXX
  const digitMatch = cleanPattern.match(/^(\d+)(X+)$/);
  if (digitMatch) {
    const prefix = digitMatch[1];
    const xCount = digitMatch[2].length;
    const maxForX = Math.pow(10, xCount) - 1;
    return parseInt(prefix) * Math.pow(10, xCount) + maxForX;
  }

  // Handle patterns with only X's
  const onlyXMatch = cleanPattern.match(/^(X+)$/);
  if (onlyXMatch) {
    const xCount = onlyXMatch[1].length;
    return Math.pow(10, xCount) - 1;
  }

  return 9999; // Default fallback
}
