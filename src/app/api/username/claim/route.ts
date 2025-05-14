import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Claim a username for a wallet address
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { username, walletAddress, userId } = data;

    // Validate required fields
    if (!username || (!walletAddress && !userId)) {
      return NextResponse.json(
        { error: "Username and wallet address are required" }, 
        { status: 400 }
      );
    }

    // Username format validation
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { 
          error: "Username must be 3-20 characters and can only contain letters, numbers, and underscores" 
        }, 
        { status: 400 }
      );
    }

    // Check if username is taken (double-check here to be safe)
    const existingSong = await prisma.song.findFirst({
      where: {
        username: username
      }
    });

    if (existingSong) {
      return NextResponse.json(
        { error: "This username is already taken" }, 
        { status: 409 } // Conflict status
      );
    }

    // We don't store usernames in a separate table, so we just return success
    // The actual username will be used when creating songs
    return NextResponse.json({
      success: true,
      username,
      walletAddress: walletAddress || userId // Use userId as fallback
    });
  } catch (error) {
    console.error("Error claiming username:", error);
    return NextResponse.json(
      { error: "Failed to claim username" }, 
      { status: 500 }
    );
  }
} 