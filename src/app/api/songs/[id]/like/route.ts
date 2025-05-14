import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const songId = params.id;
    const { userId } = await request.json();
    
    // Get the current song
    const song = await prisma.song.findUnique({
      where: { id: songId }
    });
    
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    
    // Check if this user has already liked this song
    if (userId) {
      const existingLike = await prisma.songLike.findUnique({
        where: {
          song_id_user_id: {
            song_id: songId,
            user_id: userId
          }
        }
      });
      
      // If there's no existing like, create one
      if (!existingLike) {
        await prisma.songLike.create({
          data: {
            song_id: songId,
            user_id: userId
          }
        });
      } else {
        // User has already liked this song
        return NextResponse.json({ 
          success: true, 
          likes: song.likes,
          message: "Already liked" 
        });
      }
    }
    
    // Increment the likes count
    const updatedSong = await prisma.song.update({
      where: { id: songId },
      data: {
        likes: { increment: 1 }
      }
    });
    
    return NextResponse.json({ success: true, likes: updatedSong.likes });
  } catch (error) {
    console.error("Error liking song:", error);
    return NextResponse.json({ error: "Failed to like song" }, { status: 500 });
  }
} 