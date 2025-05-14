"use client";

import { useState, useEffect, useRef } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { MusicCard } from "~/components/music-card"
import { AddSongModal } from "~/components/add-song-modal"
import { Plus } from "lucide-react"
import axios from "axios"
import { getUserId, getCurrentUser, saveWalletConnection } from "~/lib/user"
import { LoadingSkeleton } from "~/components/loading-skeleton"
import Link from "next/link"
import { useAccount, useConnect } from 'wagmi'

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
        wallet?: any;
      };
    };
  }
}

// Define our own simpler User type 
interface User {
  id: string
  address: string
  username?: string
  displayName?: string
  fid?: number
  pfpUrl?: string
}

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  },
  external_urls: {
    spotify: string
  },
  href: string
}

// Add a new WalletLink component for displaying wallet addresses/usernames
interface WalletLinkProps {
  address: string;
  username?: string;
  showIcon?: boolean;
  className?: string;
}

const WalletLink = ({ address, username, showIcon = true, className = "" }: WalletLinkProps) => {
  const displayText = username || (address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "");
  const href = username ? `/${username}` : address ? `/${address}` : "#";
  
  return (
    <Link 
      href={href}
      className={`inline-flex items-center text-sm font-medium hover:underline ${className}`}
      title={address || username || ""}
    >
      {showIcon && (
        <div className="mr-2 h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-xs">👛</span>
        </div>
      )}
      <span>{displayText}</span>
    </Link>
  );
};

const WalletConnectButton = () => {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return null; // Don't show button if already connected
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-blue-50 rounded-lg">
      <p className="text-center text-sm font-medium text-blue-700 mb-2">
        Connect a wallet to build your music scrapbook
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {/* For Farcaster Frame environment, use the first connector */}
        {window.farcaster?.sdk && (
          <Button 
            onClick={() => connect({ connector: connectors[0] })}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Connect with Farcaster
          </Button>
        )}
        
        {/* For web environment, show multiple options */}
        {!window.farcaster?.sdk && (
          <>
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                onClick={() => connect({ connector })}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {connector.name === 'MetaMask' ? 'Connect MetaMask' : 
                 connector.name === 'Coinbase Wallet' ? 'Connect Coinbase' : 
                 'Connect Wallet'}
              </Button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [stories, setStories] = useState<any[]>([])
  const [totalSongs, setTotalSongs] = useState(0)
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSong, setSelectedSong] = useState<any>(null)
  const [showStickySearch, setShowStickySearch] = useState(false)
  const [showFloatingSearch, setShowFloatingSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mainSearchRef = useRef<HTMLDivElement>(null)
  const floatingSearchRef = useRef<HTMLDivElement>(null)
  const [showSearchInput, setShowSearchInput] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)

  // Handle scroll to show/hide floating button
  useEffect(() => {
    const handleScroll = () => {
      if (mainSearchRef.current) {
        const mainSearchPosition = mainSearchRef.current.getBoundingClientRect().top
        // Show floating button when the main search is scrolled out of view
        setShowStickySearch(mainSearchPosition < 0)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Handle clicks outside the search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Handle click outside search
      }

      if (
        floatingSearchRef.current &&
        showFloatingSearch &&
        !floatingSearchRef.current.contains(event.target as Node)
      ) {
        setShowFloatingSearch(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showFloatingSearch])

  // Check for Farcaster context and get user info
  useEffect(() => {
    const checkFarcasterContext = () => {
      // Check if Farcaster SDK is available
      if (typeof window !== 'undefined' && window.farcaster?.sdk?.context?.user) {
        const farcasterUser = window.farcaster.sdk.context.user;
        if (farcasterUser && farcasterUser.fid) {
          // Create a consistent, never-null user_id from FID
          const userId = `farcaster_${farcasterUser.fid}`;
          
          // Save Farcaster user info in localStorage with consistent ID
          const savedUser = saveWalletConnection(userId, {
            fid: farcasterUser.fid,
            username: farcasterUser.username,
            displayName: farcasterUser.displayName,
            pfpUrl: farcasterUser.pfpUrl
          });
          
          setUser(savedUser);
        }
      } else {
        // Fallback to localStorage if Farcaster context not available
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
        // No longer creating anonymous users automatically
      }
    };
    
    checkFarcasterContext();
  }, []);

  const fetchSongs = async (page: number, append = false) => {
    try {
      const loadingState = append ? setIsLoadingMore : setIsLoadingStories
      loadingState(true)
      
      // Update API endpoint to fetch all songs, not just for a specific user
      const response = await fetch(`/api/songs?page=${page}&limit=12`)
      if (!response.ok) throw new Error(`Failed to fetch songs: ${response.statusText}`)
      
      const data = await response.json()
      
      // Handle both new format (songs) and old format (meanings)
      let songsData = [];
      if (Array.isArray(data.songs)) {
        songsData = data.songs;
      } else if (Array.isArray(data.meanings)) {
        songsData = data.meanings;
      } else {
        songsData = [];
      }
      
      // Handle both total and count for pagination metrics
      const totalSongs = data.total || data.count || songsData.length || 0;
      
      setStories(prev => append ? [...prev, ...songsData] : songsData)
      setHasMore(data?.hasMore || false)
      setTotalSongs(totalSongs)
    } catch (error) {
      console.error('Error fetching songs:', error)
      // Set default values in case of error
      if (!append) {
        setStories([])
        setHasMore(false)
        setTotalSongs(0)
      }
    } finally {
      const loadingState = append ? setIsLoadingMore : setIsLoadingStories
      loadingState(false)
    }
  }

  // Move the fetch inside useEffect
  useEffect(() => {
    setIsLoadingStories(true)
    fetchSongs(1)
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = currentPage + 1
          setCurrentPage(nextPage)
          fetchSongs(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [currentPage, hasMore, isLoadingMore])

  const handleSongSelect = (song: any) => {
    setSelectedSong(song)
    setShowSearchInput(false)
    setShowFloatingSearch(false)
    setIsModalOpen(true)
  }

  const handleAddStory = async (newStory: any) => {
    try {
      const userId = getUserId(); // This is just a user ID, not a wallet address
      const walletUser = getCurrentUser(); // This will be null if no wallet connected
      
      // Only include wallet address if the user actually has a connected wallet
      const response = await axios.post('/api/songs/add', {
        ...newStory,
        userId, 
        walletAddress: walletUser?.address // Will be undefined if no wallet connected
      });
      
      if (response.status !== 200) {
        throw new Error('Failed to save song');
      }

      const savedSong = response.data;

      // Add the new song to the stories list
      setStories(prevStories => [savedSong, ...prevStories]);
      setTotalSongs(prev => prev + 1);
      
      // Return the saved song data so the AddSongModal can show success state
      return savedSong;
    } catch (error) {
      console.error('Error saving song:', error);
      throw error; // Rethrow so the modal can handle the error
    }
  }

  // Shared search input component
  const SearchInput = ({ isSticky = false, className = "" }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Track[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    const debouncedSearch = async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await axios.get(`/api/spotify/search?q=${encodeURIComponent(query)}`)
        setSearchResults(response.data.tracks.items)
        setShowDropdown(true)
      } catch (error) {
        console.error("Failed to search:", error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    useEffect(() => {
      const timer = setTimeout(() => {
        debouncedSearch(searchQuery)
      }, 500)

      return () => clearTimeout(timer)
    }, [searchQuery])

    return (
      <div className={`relative ${className}`} ref={isSticky ? floatingSearchRef : mainSearchRef}>
        {!showSearchInput && !isSticky ? (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowSearchInput(true)}
              className="h-12 w-48 rounded-full bg-[#333] text-base text-white hover:bg-[#555]"
            >
              Add your song
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Input
                type="search"
                placeholder="Search a song to add..."
                className="h-12 w-full rounded-full border-[#333] pr-10 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={() => {
                  if (!searchQuery && !isSticky) {
                    setTimeout(() => {
                      setShowSearchInput(false)
                    }, 200)
                  }
                }}
                autoFocus
                aria-label="Search for songs"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#333] border-t-transparent" />
                </div>
              )}
            </div>

            {/* Search results dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className={`absolute ${isSticky ? 'bottom-full mb-1' : 'top-full mt-1'} w-full rounded-md border border-gray-200 bg-white shadow-lg z-50`}>
                <div className="max-h-60 overflow-auto py-1">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-100"
                      onClick={() => handleSongSelect(track)}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-gray-100">
                        <img
                          src={track.album.images[0]?.url || "/placeholder.svg"}
                          alt={`${track.name} album cover`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{track.name}</div>
                        <div className="text-sm text-gray-600">{track.artists[0].name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      {/* Banner at the very top - only show if not logged in */}
      {!user && <WalletConnectButton />}

      {/* Header with profile dropdown if logged in */}
      <header className="fixed top-4 md:top-6 right-0 left-0 z-50 flex items-center justify-end px-6 md:px-8 bg-transparent">
        {user && (
          <WalletLink 
            address={user.address}
            username={user.username}
            className="bg-[#333] text-white px-4 py-2 rounded-full"
          />
        )}
      </header>

      <main className="pt-20 md:pt-16 px-10 pb-4">
        <h1 className="text-center font-instrument text-4xl md:text-5xl text-[#333] mb-2 md:mb-3 font-bold tracking-tight">
          What&apos;s your favorite song mean to you?
        </h1>
        <p className="text-center text-[#666] font-sans mb-6 md:mb-8">
          {/* {stories.length} {stories.length === 1 ? 'story' : 'stories'} shared */}
          {totalSongs} {totalSongs === 1 ? 'story' : 'songs'} meant something
        </p>

        {/* Main search field */}
        <div className="max-w-xs mx-auto mb-8 md:mb-10">
          <SearchInput isSticky={false} />
        </div>

        {/* Floating add button */}
        {showStickySearch && (
          <>
            {!showFloatingSearch ? (
              <div className="fixed bottom-6 right-6 z-40">
                <Button
                  onClick={() => setShowFloatingSearch(true)}
                  className="h-14 w-14 rounded-full bg-[#333] text-white hover:bg-[#555] shadow-lg flex items-center justify-center font-sans"
                  aria-label="Add your song"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            ) : (
              <div className="fixed bottom-6 left-0 right-0 z-40 px-4" ref={floatingSearchRef}>
                <div className="mx-auto max-w-md bg-white rounded-full shadow-lg p-2">
                  <SearchInput isSticky={true} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="mx-auto max-w-6xl">
          <section className="mb-12">
            {isLoadingStories ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="columns-1 gap-4 sm:gap-5 sm:columns-2 md:columns-3 lg:columns-4">
                  {Array.isArray(stories) && stories.map((story) => (
                    <div key={story?.id || Math.random()} className="mb-4 sm:mb-5 break-inside-avoid">
                      <MusicCard song={story} />
                    </div>
                  ))}
                </div>

                {/* Infinite scroll target */}
                <div ref={observerTarget} className="h-10">
                  {isLoadingMore && (
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
                    </div>
                  )}
                </div>

                {!isLoadingStories && stories.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 font-sans">No stories yet. Be the first to share!</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {/* Add Song Modal - now only shows the note form */}
      <AddSongModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedSong(null)
        }}
        searchResults={[]}
        selectedSong={selectedSong}
        onSongSelect={() => {}}
        onAddStory={handleAddStory}
      />

      {/* Simple footer */}
      {/* <footer className="px-4 py-4 md:py-6 text-center text-sm text-[#666] font-sans">
        <div className="container mx-auto">
          <p>
            A CultureWare Product.
          </p>
        </div>
      </footer> */}
    </div>
  )
}
