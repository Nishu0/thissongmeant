// Store wallet address and user info
interface WalletUser {
  id: string;
  address: string;
  username?: string;
}

// Get user ID from localStorage or generate one
export function getUserId(): string {
  let userId = localStorage.getItem('user_id');
  
  if (!userId) {
    // Generate a new UUID if none exists
    userId = crypto.randomUUID();
    localStorage.setItem('user_id', userId);
  }
  
  return userId;
}

// Get wallet address if connected
export function getWalletAddress(): string | null {
  return localStorage.getItem('wallet_address');
}

// Get current user with wallet if available
export function getCurrentUser(): WalletUser | null {
  const userId = getUserId();
  const walletAddress = getWalletAddress();
  
  if (!walletAddress) {
    return null;
  }
  
  return {
    id: userId,
    address: walletAddress,
    username: localStorage.getItem('username') || undefined
  };
}

// Save wallet address to localStorage
export function saveWalletConnection(address: string): WalletUser {
  const userId = getUserId();
  localStorage.setItem('wallet_address', address);
  
  // Return user object
  return {
    id: userId,
    address
  };
}

// Save username to localStorage
export function saveUsername(username: string): void {
  localStorage.setItem('username', username);
}

// Clear wallet connection
export function disconnectWallet(): void {
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('username');
} 