import { createPublicClient, createWalletClient, http, Address, Hex } from "viem";
import { base } from "viem/chains";
import { createCoin, validateMetadataJSON, createCoinCall, getCoinCreateFromLogs } from "@zoralabs/coins-sdk";

// Create the public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

// Create a metadata object for a song meaning
export function createSongMeaningMetadata(data: {
  songName: string;
  artistName: string;
  meaning: string;
  albumImageUrl?: string;
  username: string;
}) {
  // Create a valid metadata object according to Zora's standard
  const metadata = {
    name: `What "${data.songName}" by ${data.artistName} means to me`,
    description: data.meaning,
    image: data.albumImageUrl || "https://thissongmeant.me/logo.png",
    properties: {
      artist: data.artistName,
      author: data.username,
      category: "music-meaning",
      content: {
        type: "text",
        value: data.meaning
      }
    }
  };

  // Validate the metadata
  try {
    validateMetadataJSON(metadata);
    return metadata;
  } catch (error) {
    console.error("Invalid metadata:", error);
    throw new Error("Failed to create valid metadata");
  }
}

// Function to upload metadata to IPFS
export async function uploadMetadataToIPFS(metadata: any): Promise<string> {
  try {
    const response = await fetch('/api/upload-to-ipfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`IPFS upload failed: ${errorData.message || response.statusText}`);
    }
    
    const { uri } = await response.json();
    return uri;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw error;
  }
}

// Generate parameters for creating a song meaning coin with Wagmi
export async function generateSongCoinParams(data: {
  songName: string;
  artistName: string;
  meaning: string;
  albumImageUrl?: string;
  username: string;
  walletAddress: Address;
}) {
  // Create metadata
  const metadata = createSongMeaningMetadata(data);
  
  // Upload metadata to IPFS
  const metadataUri = await uploadMetadataToIPFS(metadata);
  
  // Generate a symbol (up to 5 chars) based on song name + artist
  const symbolBase = `${data.songName}${data.artistName}`
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const symbol = symbolBase.slice(0, 5);
  
  // Create coin parameters
  const coinParams = {
    name: `${data.songName} by ${data.artistName}`,
    symbol,
    uri: metadataUri, // Use IPFS URI instead of data URI
    payoutRecipient: data.walletAddress,
    initialPurchaseWei: 0n,
  };
  
  // Generate Wagmi contract call parameters
  return await createCoinCall(coinParams);
}

// Function to extract coin address from transaction receipt
export function getCoinAddressFromReceipt(receipt: any) {
  return getCoinCreateFromLogs(receipt)?.coin;
}

// Function to mint a content coin using a private key (should only be used server-side!)
export async function mintContentCoin(
  coinName: string,
  coinSymbol: string,
  metadata: Record<string, unknown>,
  privateKey: Hex
) {
  // Create wallet client with the provided private key
  const walletClient = createWalletClient({
    account: privateKey,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  });

  // Get the account address
  const [address] = await walletClient.getAddresses();

  try {
    // Upload metadata to IPFS first
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/upload-to-ipfs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }
    
    const { uri } = await response.json();

    // Create coin parameters
    const coinParams = {
      name: coinName,
      symbol: coinSymbol,
      uri, // Use IPFS URI
      payoutRecipient: address as Address,
      initialPurchaseWei: 0n,
    };

    // Create the coin
    const result = await createCoin(coinParams, walletClient, publicClient);
    
    return {
      txHash: result.hash,
      coinAddress: result.address,
      deployment: result.deployment
    };
  } catch (error) {
    console.error("Error creating content coin:", error);
    throw error;
  }
} 