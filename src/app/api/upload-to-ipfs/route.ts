import { NextRequest, NextResponse } from 'next/server';
import pinataSDK from '@pinata/sdk';

// Initialize Pinata client with your API keys
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY as string,
  process.env.PINATA_API_SECRET as string
);

export async function POST(request: NextRequest) {
  try {
    // Get metadata from request body
    const metadata = await request.json();
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      );
    }

    // Validate Pinata credentials
    try {
      await pinata.testAuthentication();
    } catch (authError) {
      console.error('Pinata authentication failed:', authError);
      return NextResponse.json(
        { error: 'IPFS storage provider authentication failed' },
        { status: 500 }
      );
    }

    // Pin the metadata to IPFS
    const response = await pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: {
        name: `ThisSongMeant-${Date.now()}`
      }
    });

    // Construct the IPFS URI
    const ipfsUri = `ipfs://${response.IpfsHash}`;
    
    // Also provide an HTTP gateway URL
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${response.IpfsHash}`;

    return NextResponse.json({
      success: true,
      uri: ipfsUri,
      gateway: gatewayUrl,
      hash: response.IpfsHash
    });
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload to IPFS',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 