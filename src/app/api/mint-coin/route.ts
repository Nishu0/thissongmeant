import { NextRequest, NextResponse } from "next/server";
import { mintContentCoin, createSongMeaningMetadata } from "~/lib/zora";
import { type Hex } from "viem";
import { prisma } from "~/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { songId, songName, artistName, albumImageUrl, meaning, username, fid } = data;
    
    if (!songId || !songName || !artistName || !meaning || !fid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Check if we have the minting private key
    const mintingPrivateKey = process.env.ZORA_MINTING_PRIVATE_KEY;
    if (!mintingPrivateKey) {
      return NextResponse.json({ error: "Minting is not configured on the server" }, { status: 500 });
    }

    // Find the song in the database
    const song = await prisma.song.findFirst({
      where: {
        spotify_id: songId
      }
    });

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if this song has already been minted
    if (song.zora_link) {
      return NextResponse.json({ 
        success: true, 
        txHash: song.zora_tx,
        coinAddress: song.coin_address,
        zoraLink: song.zora_link,
        message: "Song already minted as a coin"
      });
    }

    // Create the metadata
    const metadata = createSongMeaningMetadata({
      songName,
      artistName,
      meaning,
      albumImageUrl,
      username
    });

    // Create a unique symbol from the song ID (ensure it's under 10 characters for ERC20 compliance)
    const symbol = `SM${songId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7).toUpperCase()}`;

    // Create a coin name
    const coinName = `${songName} Meaning by ${username}`;

    // Mint the coin
    const result = await mintContentCoin(
      coinName,
      symbol,
      metadata,
      mintingPrivateKey as Hex
    );

    // Create Zora link from the coin address - updated format
    const zoraLink = `https://zora.co/coin/base:${result.coinAddress}`;

    // Update the song in the database with Zora information
    await prisma.song.update({
      where: { id: song.id },
      data: {
        zora_link: zoraLink,
        zora_tx: result.txHash,
        coin_address: result.coinAddress
      }
    });
    
    // Return the transaction hash and coin address
    return NextResponse.json({ 
      success: true, 
      txHash: result.txHash,
      coinAddress: result.coinAddress,
      zoraLink,
      message: "Content coin minted successfully"
    });
  } catch (error) {
    console.error("Error minting content coin:", error);
    return NextResponse.json({ 
      error: "Failed to mint content coin", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 