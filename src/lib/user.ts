// Store wallet address and user info
interface WalletUser {
  id: string;
  address: string;
  username?: string;
  displayName?: string;
  fid?: number;
  pfpUrl?: string;
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

// Check if user has a wallet connected
export function hasWalletConnected(): boolean {
  return !!getWalletAddress();
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
    username: localStorage.getItem('username') || undefined,
    displayName: localStorage.getItem('displayName') || undefined,
    fid: localStorage.getItem('fid') ? Number(localStorage.getItem('fid')) : undefined,
    pfpUrl: localStorage.getItem('pfpUrl') || undefined
  };
}

// Save wallet connection to localStorage with Farcaster context data if available
export function saveWalletConnection(address: string, farcasterUser?: { 
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}): WalletUser {
  const userId = getUserId();
  localStorage.setItem('wallet_address', address);
  
  // Save Farcaster user data if available
  if (farcasterUser) {
    if (farcasterUser.username) {
      localStorage.setItem('username', farcasterUser.username);
    }
    if (farcasterUser.displayName) {
      localStorage.setItem('displayName', farcasterUser.displayName);
    }
    if (farcasterUser.fid) {
      localStorage.setItem('fid', farcasterUser.fid.toString());
    }
    if (farcasterUser.pfpUrl) {
      localStorage.setItem('pfpUrl', farcasterUser.pfpUrl);
    }
  }
  
  // Return user object
  return {
    id: userId,
    address,
    ...farcasterUser
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
  localStorage.removeItem('displayName');
  localStorage.removeItem('fid');
  localStorage.removeItem('pfpUrl');
} 