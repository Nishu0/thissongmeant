import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    // Proxy to the thissongmeant.me API
    const response = await fetch(`https://www.thissongmeant.me/api/spotify/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Spotify search failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return NextResponse.json({ error: "Failed to search Spotify" }, { status: 500 });
  }
} 