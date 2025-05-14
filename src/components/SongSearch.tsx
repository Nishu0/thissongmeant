"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { debounce } from "~/lib/utils";

interface SongSearchProps {
  onSelectSong: (song: SpotifyTrack) => void;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  uri: string;
}

export function SongSearch({ onSelectSong }: SongSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search function
  const performSearch = debounce(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data.tracks?.items || []);
    } catch (error) {
      console.error('Error searching for songs:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    performSearch(value);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSelectSong = (song: SpotifyTrack) => {
    onSelectSong(song);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-zinc-400" />
        </div>
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a song..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          className="pl-10 pr-10 py-2 w-full bg-zinc-900/70 border-zinc-800 rounded-xl focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <button 
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={clearSearch}
          >
            <X size={18} className="text-zinc-400 hover:text-white" />
          </button>
        )}
      </div>

      {showResults && (query || isSearching) && (
        <div 
          ref={resultsRef}
          className="absolute mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {isSearching ? (
            <div className="p-4 text-center text-zinc-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <ul>
              {searchResults.map((song) => (
                <li 
                  key={song.id}
                  className="flex items-center p-3 cursor-pointer hover:bg-zinc-800/50"
                  onClick={() => handleSelectSong(song)}
                >
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={song.album.images[0]?.url || '/placeholder-album.png'} 
                      alt={song.album.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <p className="text-white truncate font-medium">{song.name}</p>
                    <p className="text-zinc-400 text-sm truncate">
                      {song.artists.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : query ? (
            <div className="p-4 text-center text-zinc-400">
              No songs found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 