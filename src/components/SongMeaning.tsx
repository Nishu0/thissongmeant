"use client";

import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { Textarea } from "~/components/ui/textarea";
import { SpotifyTrack } from "./SongSearch";
import { useAccount } from 'wagmi';
import { WalletConnect } from "./WalletConnect";

interface SongMeaningProps {
  song: SpotifyTrack;
  onBack: () => void;
}

export default function SongMeaning({ song, onBack }: SongMeaningProps) {
  const [meaning, setMeaning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [coinAddress, setCoinAddress] = useState<string | null>(null);
  const [zoraLink, setZoraLink] = useState<string | null>(null);
  const { isConnected, address } = useAccount();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!meaning.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Save the meaning to the database/API
      const response = await fetch("/api/meanings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          songName: song.name,
          artistName: song.artists.map(a => a.name).join(", "),
          albumImageUrl: song.album.images[0]?.url,
          meaning,
          username: "Anonymous", // Default username
          userId: address || "anonymous" // Use wallet address if available, otherwise anonymous
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit meaning");
      }
      
      // Success state
      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting meaning:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mintAsContentCoin = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet to mint");
      return;
    }

    setIsMinting(true);

    try {
      // Call our API endpoint to mint the coin
      const response = await fetch("/api/mint-coin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          songName: song.name,
          artistName: song.artists.map(a => a.name).join(", "),
          albumImageUrl: song.album.images[0]?.url,
          meaning,
          username: "Anonymous", // Default username
          fid: address // Use wallet address
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to mint content coin");
      }

      const data = await response.json();
      setTxHash(data.txHash);
      setCoinAddress(data.coinAddress);
      
      // Also set the Zora link if available
      if (data.zoraLink) {
        setZoraLink(data.zoraLink);
      }
    } catch (error) {
      console.error("Error minting content coin:", error);
      alert(error instanceof Error ? error.message : "Failed to mint content coin. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-[50vh] p-4">
      <div className="max-w-xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 text-blue-400 hover:text-blue-300 flex items-center"
        >
          ← Back to search
        </button>
        
        <div className="flex items-center mb-6">
          <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
            <img 
              src={song.album.images[0]?.url || '/placeholder-album.png'} 
              alt={song.album.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold">{song.name}</h2>
            <p className="text-zinc-400">{song.artists.map(artist => artist.name).join(', ')}</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="text-center mt-8">
            <div className="text-green-500 mb-4 text-2xl">✓</div>
            <h3 className="text-xl font-bold mb-2">Your meaning has been added!</h3>
            <p className="text-zinc-400 mb-6">Thank you for sharing what this song means to you.</p>
            
            {!txHash ? (
              <div className="space-y-4">
                <p className="text-sm mb-2">Want to mint your meaning as a Zora coin?</p>
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-xs text-zinc-400">You need to connect your wallet first</p>
                    <WalletConnect />
                  </div>
                ) : (
                  <Button 
                    onClick={mintAsContentCoin}
                    disabled={isMinting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isMinting ? "Minting..." : "Mint as Content Coin on Zora"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-green-500 mb-2">Successfully minted on Zora!</p>
                <div className="flex flex-col gap-2 mt-3">
                  <a 
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Transaction
                  </a>
                  {zoraLink ? (
                    <a
                      href={zoraLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View Coin on Zora
                    </a>
                  ) : coinAddress && (
                    <a
                      href={`https://zora.co/base/tokens/${coinAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View Coin on Zora
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <Button 
              onClick={onBack}
              className="mt-6 border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
            >
              Add another song
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What does this song mean to you?</h3>
              <Textarea
                value={meaning}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMeaning(e.target.value)}
                placeholder="Share your story, memory, or feelings about this song..."
                className="h-32 bg-zinc-900/70 border-zinc-800 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <Button 
              type="submit"
              disabled={isSubmitting || !meaning.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Posting..." : "Post to Wall"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
} 