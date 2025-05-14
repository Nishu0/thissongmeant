import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Get all songs for a specific username
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const username = params.username;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;
    
    // Validate username
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    
    // Get all songs for this username
    const songs = await prisma.song.findMany({
      where: {
        username: username
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });
    
    // Get total count for this user
    const total = await prisma.song.count({
      where: {
        username: username
      }
    });
    
    // Transform the data to match the expected format
    const transformedSongs = songs.map(song => ({
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
      coinAddress: song.coin_address,
      spotify_url: song.spotify_url
    }));
    
    return NextResponse.json({ 
      songs: transformedSongs, 
      total,
      hasMore: false // Since we're getting all songs at once for now
    });
  } catch (error) {
    console.error("Error fetching user songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
} 