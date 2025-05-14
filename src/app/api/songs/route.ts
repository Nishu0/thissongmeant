import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Get all song meanings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    
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
    
    // Get all songs with the specified filters
    const songs = await prisma.song.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc'
      },
      take: 50 // Limit to 50 results
    });
    
    // Get the total count for statistics
    const count = await prisma.song.count();
    
    // Transform the data to match the expected format
    const meanings = songs.map(song => ({
      id: song.id,
      songId: song.spotify_id,
      songName: song.title,
      artistName: song.artist,
      albumImageUrl: song.album_cover,
      meaning: song.note,
      username: song.username,
      userId: song.user_id,
      likes: song.likes,
      createdAt: song.created_at.toISOString(),
      zoraLink: song.zora_link,
      coinAddress: song.coin_address
    }));
    
    return NextResponse.json({ meanings, count });
  } catch (error) {
    console.error("Error fetching meanings:", error);
    return NextResponse.json({ error: "Failed to fetch meanings" }, { status: 500 });
  }
}

// Add a new song meaning
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      songId,
      songName,
      artistName,
      albumName = "", // Default to empty string if not provided
      albumImageUrl,
      meaning,
      username,
      userId,
      userEmail,
      spotifyUrl
    } = data;
    
    // Validate required fields
    if (!songId || !songName || !artistName || !meaning) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Create the new song meaning in the database
    const song = await prisma.song.create({
      data: {
        spotify_id: songId,
        title: songName,
        artist: artistName,
        album: albumName,
        album_cover: albumImageUrl,
        note: meaning,
        username: username || "Anonymous",
        user_id: userId,
        user_email: userEmail,
        spotify_url: spotifyUrl,
        likes: 0,
        user_likes: false
      }
    });
    
    // Transform to expected response format
    const response = {
      id: song.id,
      songId: song.spotify_id,
      songName: song.title,
      artistName: song.artist,
      albumImageUrl: song.album_cover,
      meaning: song.note,
      username: song.username,
      userId: song.user_id,
      likes: song.likes,
      createdAt: song.created_at.toISOString()
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error adding meaning:", error);
    return NextResponse.json({ error: "Failed to add meaning" }, { status: 500 });
  }
} 