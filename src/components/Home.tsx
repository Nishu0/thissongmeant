"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { SongSearch, type SpotifyTrack } from "~/components/SongSearch";
import SongMeaning from "~/components/SongMeaning";
import SongWall from "~/components/SongWall";
import AppLayout from "../AppLayout";
import { useMiniKit } from "~/hooks/useMiniKit";

export default function Home() {
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null);
  const [showAddSong, setShowAddSong] = useState(false);
  const { isSDKLoaded } = useMiniKit();
  
  console.log("DEBUG: Home component rendering, isSDKLoaded:", isSDKLoaded);
  
  useEffect(() => {
    console.log("DEBUG: Home component mounted");
    
    // Force a re-render after 2 seconds to help initialize
    const timer = setTimeout(() => {
      console.log("DEBUG: Forcing home component re-render");
      setShowAddSong(false); // This is just to trigger a re-render
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Skip the loading check for now to test if the content renders
  console.log("DEBUG: About to return Home content. SDK loaded:", isSDKLoaded);
  
  if (!isSDKLoaded) {
    console.log("DEBUG: Showing loading spinner in Home");
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  console.log("DEBUG: Rendering full Home component");
  
  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white pt-6 pb-16 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              What&apos;s your favorite song mean to you?
            </h1>
            <p className="text-zinc-400">
              Share your stories and mint them as collectible coins
            </p>
          </div>

          {selectedSong ? (
            <SongMeaning 
              song={selectedSong} 
              onBack={() => setSelectedSong(null)} 
            />
          ) : showAddSong ? (
            <div className="mb-10">
              <button 
                onClick={() => setShowAddSong(false)}
                className="mb-6 text-blue-400 hover:text-blue-300 flex items-center"
              >
                ← Back to wall
              </button>
              <SongSearch onSelectSong={setSelectedSong} />
            </div>
          ) : (
            <>
              <div className="mb-10 flex justify-center">
                <Button 
                  onClick={() => setShowAddSong(true)}
                  className="bg-blue-600 hover:bg-blue-700 py-2 px-6"
                >
                  Add your song
                </Button>
              </div>
              {/* About to render SongWall */}
              <SongWall />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
