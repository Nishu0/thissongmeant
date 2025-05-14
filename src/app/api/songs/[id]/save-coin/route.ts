import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { coinAddress } = await request.json();
    const songId = params.id;

    if (!songId || !coinAddress) {
      return NextResponse.json(
        { error: 'Song ID and coin address are required' },
        { status: 400 }
      );
    }

    // Update the song record with the Zora coin address
    const updatedSong = await prisma.song.update({
      where: { id: songId },
      data: {
        coin_address: coinAddress,
        zora_link: `https://zora.co/coin/base:${coinAddress}`
      },
    });

    return NextResponse.json({ 
      success: true, 
      song: updatedSong
    });
  } catch (error) {
    console.error('Error saving coin address:', error);
    return NextResponse.json(
      { error: 'Failed to save coin address' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 