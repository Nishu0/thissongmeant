/**
 * Truncates an Ethereum address to a more readable format.
 * Example: 0x1234567890123456789012345678901234567890 -> 0x1234...7890
 * 
 * @param address The Ethereum address to truncate
 * @param startLength Number of characters to keep at the start (defaults to 6)
 * @param endLength Number of characters to keep at the end (defaults to 4)
 * @returns The truncated address string
 */
export function truncateAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return '';
  
  // Return as is if the address is shorter than the combined start and end lengths
  if (address.length <= startLength + endLength) {
    return address;
  }
  
  const start = address.slice(0, startLength);
  const end = address.slice(-endLength);
  
  return `${start}...${end}`;
} 