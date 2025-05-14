import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Add a new song 
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      id: songId,
      title: songName,
      artist: artistName,
      album: albumName = "",
      albumCover: albumImageUrl,
      note: meaning,
      username,
      userId, // This should be the wallet address
      walletAddress, // Alternative wallet address field
      spotifyUrl,
      color = "green" // Default color
    } = data;
    
    // Validate required fields
    if (!songId || !songName || !artistName || !meaning) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Use wallet address as user_id when available, otherwise use provided userId or generate random
    const userWalletId = walletAddress || userId || crypto.randomUUID();
    
    // Create the new song in the database
    const song = await prisma.song.create({
      data: {
        spotify_id: songId,
        title: songName,
        artist: artistName,
        album: albumName,
        album_cover: albumImageUrl,
        note: meaning,
        username: username || "Anonymous",
        user_id: userWalletId,
        user_email: null, // No longer using email
        spotify_url: spotifyUrl,
        color: color,
        likes: 0,
        user_likes: false
      }
    });
    
    // Return the raw song object directly
    return NextResponse.json(song, { status: 200 });
  } catch (error) {
    console.error("Error adding song:", error);
    return NextResponse.json({ error: "Failed to add song" }, { status: 500 });
  }
} 