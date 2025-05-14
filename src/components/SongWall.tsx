"use client";

import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { MusicCard } from "./music-card";

interface SongMeaning {
  id: string;
  songId: string;
  songName: string;
  artistName: string;
  albumImageUrl: string;
  meaning: string;
  username: string;
  userId?: string;
  likes: number;
  createdAt: string;
  zoraLink?: string;
  coinAddress?: string;
  spotify_url?: string;
  user_likes?: boolean;
}

export default function SongWall() {
  const [meanings, setMeanings] = useState<SongMeaning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [songCount, setSongCount] = useState(0);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

  console.log("DEBUG: SongWall component rendered");

  useEffect(() => {
    console.log("DEBUG: SongWall useEffect running");
    
    const fetchMeanings = async () => {
      console.log("DEBUG: fetchMeanings function called");
      setIsLoading(true);
      try {
        console.log("DEBUG: About to make fetch call to /api/meanings");
        
        // Try a different approach for fetch
        const response = await fetch("/api/songs", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add cache control to prevent caching
            "Cache-Control": "no-cache"
          }
        });
        
        console.log("DEBUG: API response status:", response.status);
        
        if (!response.ok) {
          console.error("DEBUG: API response not OK");
          throw new Error("Failed to fetch meanings");
        }
        
        const data = await response.json();
        console.log("DEBUG: API response data:", data);
        
        // Process the data and add user_likes based on localStorage
        const savedLikes = localStorage.getItem('likedSongs');
        const likedSongsSet = new Set<string>(savedLikes ? JSON.parse(savedLikes) : []);
        
        const processedMeanings = (data.meanings || []).map((meaning: SongMeaning) => ({
          ...meaning,
          user_likes: likedSongsSet.has(meaning.id)
        }));
        
        setMeanings(processedMeanings);
        setSongCount(data.count || 0);
        setLikedSongs(likedSongsSet);
      } catch (error) {
        console.error("DEBUG: Error fetching meanings:", error);
      } finally {
        console.log("DEBUG: Setting isLoading to false");
        setIsLoading(false);
      }
    };

    // Call fetch immediately
    fetchMeanings();
    
    // Also set up a backup attempt after a delay
    const timer = setTimeout(() => {
      console.log("DEBUG: Trying backup fetch after timeout");
      fetchMeanings();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-xl mx-auto">
      <div className="text-center mb-6">
        <p className="text-zinc-400">{songCount} songs meant something</p>
      </div>

      {meanings.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-zinc-400">No meanings yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {meanings.map((meaning) => (
            <div key={meaning.id}>
              <MusicCard
                song={{
                  id: meaning.id,
                  title: meaning.songName,
                  artist: meaning.artistName,
                  album_cover: meaning.albumImageUrl || '/placeholder-album.png',
                  note: meaning.meaning,
                  username: meaning.username,
                  likes: meaning.likes,
                  spotify_url: meaning.spotify_url,
                  user_likes: likedSongs.has(meaning.id)
                }}
              />
              
              {meaning.zoraLink && (
                <div className="mt-2 flex justify-end">
                  <a 
                    href={meaning.zoraLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs"
                  >
                    <Coins size={14} /> View Coin
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 