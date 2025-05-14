import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Get all songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    let whereClause = {};
    
    // Filter by songId if provided
    if (songId) {
      whereClause = {
        ...whereClause,
        spotify_id: songId
      };
    }
    
    // Filter by userId if provided
    if (userId) {
      whereClause = {
        ...whereClause,
        user_id: userId
      };
    }
    
    // Get songs with pagination
    const songs = await prisma.song.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: skip
    });
    
    // Get the total count for statistics and pagination
    const total = await prisma.song.count({
      where: whereClause
    });
    
    // Calculate if there are more results
    const hasMore = total > skip + songs.length;
    
    // Return using the exact format requested - raw database format
    return NextResponse.json({ 
      songs: songs,
      hasMore,
      total
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs", songs: [] }, { status: 500 });
  }
}

// Add a new song
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Extract data with field mappings
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
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error("Error adding song:", error);
    return NextResponse.json({ error: "Failed to add song" }, { status: 500 });
  }
} 