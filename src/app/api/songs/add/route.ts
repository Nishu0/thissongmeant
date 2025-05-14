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
    
    // Prefer the Farcaster username or wallet address as the displayable username
    // If a username wasn't provided and it looks like a UUID, use the wallet address instead
    let displayUsername = username;
    
    // If username is missing or looks like a UUID, use the wallet address as username
    if (!displayUsername || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(displayUsername)) {
      if (userWalletId.startsWith('farcaster_')) {
        // For Farcaster users, use "farcaster_user" if no username provided
        displayUsername = "farcaster_user";
      } else if (userWalletId.startsWith('0x')) {
        // For wallet addresses, use the address as the username
        displayUsername = userWalletId;
      } else {
        displayUsername = "Anonymous";
      }
    }
    
    // Create the new song in the database
    const song = await prisma.song.create({
      data: {
        spotify_id: songId,
        title: songName,
        artist: artistName,
        album: albumName,
        album_cover: albumImageUrl,
        note: meaning,
        username: displayUsername,
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