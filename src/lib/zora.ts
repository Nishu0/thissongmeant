import { createPublicClient, createWalletClient, http, Address, Hex } from "viem";
import { base } from "viem/chains";
import { createCoin, validateMetadataJSON } from "@zoralabs/coins-sdk";

// Create the public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://goerli.base.org"),
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
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://goerli.base.org"),
  });

  // Get the account address
  const [address] = await walletClient.getAddresses();

  // Create coin parameters
  const coinParams = {
    name: coinName,
    symbol: coinSymbol,
    uri: `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`,
    payoutRecipient: address as Address,
    initialPurchaseWei: 0n,
  };

  try {
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