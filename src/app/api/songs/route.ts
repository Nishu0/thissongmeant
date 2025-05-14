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
    
    console.log("Attempting to fetch songs with whereClause:", JSON.stringify(whereClause));
    console.log("Using pagination - page:", page, "limit:", limit, "skip:", skip);
    
    try {
      // Test database connection first
      await prisma.$connect();
      console.log("Database connection successful");
      
      // Get songs with pagination - removing the filter for null user_ids
      const songs = await prisma.song.findMany({
        where: whereClause, // Removed the user_id: { not: null } filter
        orderBy: {
          created_at: 'desc'
        },
        take: limit,
        skip: skip
      });
      
      console.log(`Successfully fetched ${songs.length} songs`);
      
      // Get the total count for statistics and pagination
      const total = await prisma.song.count({
        where: whereClause
      });
      
      console.log(`Total songs count: ${total}`);
      
      // Calculate if there are more results
      const hasMore = total > skip + songs.length;
      
      // Return using the exact format requested - raw database format
      return NextResponse.json({ 
        songs: songs,
        hasMore,
        total
      });
    } catch (dbError) {
      console.error("Database error details:", dbError);
      throw dbError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error("Error fetching songs:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Check if it's a Prisma error and provide more details
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'PrismaClientInitializationError') {
        console.error("Prisma initialization error - check database connection string and credentials");
      } else if (error.name === 'PrismaClientKnownRequestError' && 'code' in error && 'message' in error) {
        console.error(`Prisma known request error - code: ${error.code}, message: ${error.message}`);
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch songs", 
      errorMessage: error instanceof Error ? error.message : String(error),
      songs: [] 
    }, { status: 500 });
  } finally {
    // Always disconnect to prevent connection pool issues
    await prisma.$disconnect();
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
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error("Error adding song:", error);
    return NextResponse.json({ error: "Failed to add song" }, { status: 500 });
  }
} 