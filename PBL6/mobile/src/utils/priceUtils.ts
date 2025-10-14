/**
 * Utility functions for price formatting in the mobile app
 */

/**
 * Parse price from string or number to integer
 * @param priceStr - Price as string or number from backend
 * @returns Integer price
 */
export const parsePrice = (priceStr?: string | number): number => {
  if (typeof priceStr === 'number') return Math.floor(priceStr);
  if (!priceStr) return 0;
  
  // Parse as float first, then convert to integer to handle decimal strings like "35000.00"
  const priceFloat = parseFloat(String(priceStr));
  return isNaN(priceFloat) ? 0 : Math.floor(priceFloat);
};

/**
 * Format price for display with thousand separators
 * @param price - Price as number
 * @returns Formatted price string without currency symbol
 */
export const formatPrice = (price?: string | number): string => {
  const priceNum = parsePrice(price);
  return priceNum.toLocaleString('vi-VN');
};

/**
 * Format price for display with VND currency
 * @param price - Price as number
 * @returns Formatted price string with VND
 */
export const formatPriceWithCurrency = (price?: string | number): string => {
  return `${formatPrice(price)} VND`;
};