"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Share2, Coins } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Textarea } from "~/components/ui/textarea"
import { getCurrentUser } from "~/lib/user"
import { generateSongCoinParams, getCoinAddressFromReceipt } from "~/lib/zora"
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi"

// Define Farcaster types for TypeScript
declare global {
  interface Window {
    farcaster?: {
      sdk?: {
        context?: {
          user?: {
            fid: number;
            username?: string;
            displayName?: string;
            pfpUrl?: string;
          };
        };
        wallet?: any; // Add wallet property
      };
    };
  }
}

interface User {
  id: string
  address: string
  username?: string
  displayName?: string
  fid?: number
  pfpUrl?: string
}

interface Song {
  id: string
  spotify_id?: string
  title: string
  artist: string
  album_cover?: string
  note?: string
  username: string
  user_id?: string
  likes?: number
  color?: string
  spotify_url?: string
  user_likes?: boolean
  songName?: string
  artistName?: string
  albumImageUrl?: string
  meaning?: string
  songId?: string
  // New fields for Spotify API response format
  name?: string
  artists?: { name: string }[]
  album?: {
    name?: string
    images?: { url: string }[]
  }
  external_urls?: {
    spotify?: string
  }
}

interface AddSongModalProps {
  isOpen: boolean
  onClose: () => void
  searchResults: Song[]
  selectedSong: Song | null
  onSongSelect: (song: Song) => void
  onAddStory: (story: any) => void
}

export function AddSongModal({
  isOpen,
  onClose,
  searchResults,
  selectedSong,
  onSongSelect,
  onAddStory,
}: AddSongModalProps) {
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [successState, setSuccessState] = useState(false)
  const [savedSong, setSavedSong] = useState<any>(null)
  const [isZoraMinting, setIsZoraMinting] = useState(false)
  const [zoraSuccess, setZoraSuccess] = useState(false)
  const [zoraCoinAddress, setZoraCoinAddress] = useState("")
  const [farcasterUser, setFarcasterUser] = useState<any>(null)
  
  // Add Wagmi hooks
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isSuccess, isError, data: txReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Get current user from localStorage or Farcaster context
  useEffect(() => {
    // Check if Farcaster context is available
    if (typeof window !== 'undefined' && window.farcaster?.sdk?.context?.user) {
      setFarcasterUser(window.farcaster.sdk.context.user);
    }
    
    // Get user from localStorage as fallback
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, [])

  // Effect to handle transaction receipt
  useEffect(() => {
    if (isSuccess && txReceipt && txHash) {
      // Extract the coin address from the receipt
      const coinAddress = getCoinAddressFromReceipt(txReceipt);
      
      if (coinAddress) {
        setZoraCoinAddress(coinAddress);
        setZoraSuccess(true);
        setIsZoraMinting(false);
        
        // Save the coin address to the database
        saveCoinToDatabase(coinAddress);
      }
    }
    
    if (isError) {
      console.error("Transaction failed");
      setIsZoraMinting(false);
    }
  }, [isSuccess, isError, txReceipt, txHash]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  if (!isOpen) return null

  // Helper function to get song details regardless of the format
  const getSongDetails = () => {
    if (!selectedSong) return null;
    
    return {
      id: selectedSong.id,
      title: selectedSong.title || selectedSong.songName || selectedSong.name || '',
      artist: selectedSong.artist || selectedSong.artistName || (selectedSong.artists?.[0]?.name) || '',
      albumCover: selectedSong.album_cover || selectedSong.albumImageUrl || 
                 (selectedSong.album?.images?.[0]?.url) || '/placeholder.svg',
      spotifyUrl: selectedSong.spotify_url || selectedSong.external_urls?.spotify || '',
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Get username from Farcaster first, then user object, or default to anonymous
      const username = farcasterUser?.username || user?.username || 'anonymous';
      const songDetails = getSongDetails();
      
      if (!songDetails) {
        throw new Error('Song details not available');
      }
      
      // Transform the Spotify track data into your story format
      const newStory = {
        id: songDetails.id,
        title: songDetails.title,
        artist: songDetails.artist,
        albumCover: songDetails.albumCover,
        note,
        username,
        likes: 0,
        color: getRandomColor(),
        spotifyUrl: songDetails.spotifyUrl,
        userId: user?.id,
        walletAddress: user?.address
      }

      // Wait for the parent component to process the story
      const response = await onAddStory(newStory)
      
      // Save the response for sharing options
      setSavedSong(response)
      
      // Show success state with sharing options
      setSuccessState(true)
      setNote("")
    } catch (error) {
      console.error('Error adding story:', error)
      // Don't close modal on error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to generate random colors for stories
  function getRandomColor() {
    const colors = ["pink", "blue", "green", "yellow", "orange", "purple", "indigo", "red", "teal"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Save coin address to database
  const saveCoinToDatabase = async (coinAddress: string) => {
    try {
      if (!savedSong?.id) {
        console.error("No song ID available to save coin address");
        return;
      }
      
      const response = await fetch(`/api/songs/${savedSong.id}/save-coin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coinAddress,
          songId: savedSong.id
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save coin address to database");
      }
      
      setZoraCoinAddress(coinAddress);
    } catch (error) {
      console.error("Error saving coin address:", error);
    }
  };

  // Share to Farcaster
  const shareFarcaster = async () => {
    if (!savedSong) return;
    const songDetails = getSongDetails();
    if (!songDetails) return;
    
    try {
      // Create text for Farcaster
      const username = farcasterUser?.username || user?.username || 'anonymous';
      const text = `I shared what "${songDetails.title}" by ${songDetails.artist} means to me:\n\n"${note}"\n\nCheck it out on ThisSongMeant! ${window.location.origin}/${username}`;
      
      // Open Warpcast in a new window (or other Farcaster clients)
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      
      if (songDetails.albumCover && songDetails.albumCover !== '/placeholder.svg') {
        // Add image to the cast if available
        window.open(`${warpcastUrl}&embeds[]=${encodeURIComponent(songDetails.albumCover)}`, '_blank');
      } else {
        window.open(warpcastUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing to Farcaster:', error);
    }
  };

  // Mint Zora coin
  const mintZoraCoin = async () => {
    if (!savedSong || !selectedSong) return;
    const songDetails = getSongDetails();
    if (!songDetails) return;
    
    try {
      setIsZoraMinting(true);
      
      // Connect wallet if not connected yet
      if (!isConnected && connectors[0]) {
        await connect({ connector: connectors[0] });
      }
      
      if (!address) {
        throw new Error('Wallet not connected');
      }
      
      // Generate Wagmi contract call parameters using the Zora SDK
      const contractCallParams = await generateSongCoinParams({
        songName: songDetails.title,
        artistName: songDetails.artist,
        meaning: note,
        albumImageUrl: songDetails.albumCover,
        username: farcasterUser?.username || user?.username || 'anonymous',
        walletAddress: address
      });
      
      // Execute the contract call
      writeContract(contractCallParams);
      
    } catch (error) {
      console.error('Error minting Zora coin:', error);
      setIsZoraMinting(false);
    }
  };

  // Get album cover image with fallback
  const getAlbumCover = () => {
    if (!selectedSong) return '/placeholder.svg';
    
    const songDetails = getSongDetails();
    return songDetails?.albumCover || '/placeholder.svg';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-4 md:p-6 shadow-xl max-h-[90vh] overflow-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 md:right-4 md:top-4 text-gray-500 hover:text-gray-700 p-2 z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {successState ? (
          // Success view with sharing options
          <div>
            <h3 className="mb-4 text-xl font-bold text-gray-900 pr-8">Story Added Successfully!</h3>
            
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 mb-2">Your story has been added to the wall!</p>
              <p className="text-sm text-gray-600">Now you can share it or mint it as a Zora coin.</p>
            </div>
            
            <div className="mb-4 space-y-3">
              <Button
                onClick={shareFarcaster}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Share2 size={16} />
                Share on Farcaster
              </Button>
              
              {!zoraSuccess ? (
                <Button
                  onClick={mintZoraCoin}
                  className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                  disabled={isZoraMinting || isPending || !address}
                >
                  {isZoraMinting || isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Minting...
                    </>
                  ) : (
                    <>
                      <Coins size={16} />
                      Mint as Zora Coin
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-800 mb-1">
                    <span className="font-medium">Coin minted successfully!</span>
                  </p>
                  <a 
                    href={`https://zora.co/base/tokens/${zoraCoinAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View your coin on Zora
                  </a>
                </div>
              )}
              
              {!address && (
                <p className="text-xs text-red-500 mt-1">
                  Connect your wallet to mint a Zora coin.
                </p>
              )}
            </div>
            
            <Button
              onClick={() => {
                setSuccessState(false);
                onClose();
              }}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : !selectedSong ? (
          // Step 1: Select a song from search results
          <div>
            <h3 className="mb-4 text-xl font-bold text-gray-900 pr-8">Select a Song</h3>

            <div className="max-h-[60vh] overflow-y-auto">
              {searchResults.map((song) => (
                <div
                  key={song.id}
                  className="mb-2 flex cursor-pointer items-center gap-3 rounded-md p-3 hover:bg-gray-100"
                  onClick={() => onSongSelect(song)}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-gray-100">
                    <img
                      src={song.album_cover || song.albumImageUrl || 
                          (song.album?.images?.[0]?.url) || '/placeholder.svg'}
                      alt={`${song.title || song.songName || song.name} album cover`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{song.title || song.songName || song.name}</h4>
                    <p className="text-sm text-gray-600">
                      {song.artist || song.artistName || (song.artists?.[0]?.name)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Step 2: Add note for selected song
          <div>
            <h3 className="mb-4 text-xl font-bold text-gray-900 pr-8">Add Your Story</h3>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-gray-100">
                <img
                  src={getAlbumCover()}
                  alt={`${selectedSong.title || selectedSong.songName || selectedSong.name} album cover`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {selectedSong.title || selectedSong.songName || selectedSong.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedSong.artist || selectedSong.artistName || (selectedSong.artists?.[0]?.name)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Textarea
                  id="note"
                  placeholder="Share your story, memory, or feelings about this song..."
                  className="min-h-[120px] resize-none text-base p-3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                />
              </div>

              {/* Display who you're posting as */}
              {(farcasterUser?.username || user?.username) && (
                <p className="text-sm text-gray-600">
                  Posting as: <span className="font-medium">{farcasterUser?.username || user?.username}</span>
                </p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-[#333] text-white hover:bg-[#555] h-12 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Posting..." : "Post to Wall"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}