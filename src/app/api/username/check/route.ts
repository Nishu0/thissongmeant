import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

// Check if a username is already taken
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" }, 
        { status: 400 }
      );
    }

    // Search for any song with this username
    const existingSong = await prisma.song.findFirst({
      where: {
        username: username
      }
    });

    // Return whether the username is taken
    return NextResponse.json({
      taken: !!existingSong,
      available: !existingSong
    });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json(
      { error: "Failed to check username availability" }, 
      { status: 500 }
    );
  }
} 