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
      console.log('Pinata authentication successful');
    } catch (authError) {
      console.error('Pinata authentication failed:', authError);
      
      // Check for specific Pinata errors
      if (typeof authError === 'object' && authError !== null) {
        try {
          const errorObj = JSON.stringify(authError);
          if (errorObj.includes('NO_SCOPES_FOUND')) {
            return NextResponse.json(
              { 
                error: 'IPFS storage provider configuration error', 
                message: 'The Pinata API key does not have the required scopes. Please update your API key in the Pinata dashboard to include pinning permissions.'
              },
              { status: 500 }
            );
          }
        } catch {
          console.log('Error stringifying authError:', authError);
          // Ignore stringification error
        }
      }
      
      return NextResponse.json(
        { error: 'IPFS storage provider authentication failed', message: JSON.stringify(authError) },
        { status: 500 }
      );
    }

    // Pin the metadata to IPFS
    try {
      const response = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `ThisSongMeant-${Date.now()}`
        }
      });

      console.log('Successfully pinned to IPFS with hash:', response.IpfsHash);

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
    } catch (pinError) {
      console.error('Failed to pin to IPFS:', pinError);
      
      // Extract error message from Pinata's response
      let errorMessage = 'Unknown pinning error';
      
      if (typeof pinError === 'object' && pinError !== null) {
        try {
          const errorStr = JSON.stringify(pinError);
          const errorObj = JSON.parse(errorStr);
          
          if (errorObj.error && errorObj.error.reason) {
            errorMessage = `Pinata error: ${errorObj.error.reason}`;
            if (errorObj.error.details) {
              errorMessage += ` - ${errorObj.error.details}`;
            }
          } else {
            errorMessage = errorStr;
          }
        } catch {
          errorMessage = String(pinError);
        }
      } else if (pinError instanceof Error) {
        errorMessage = pinError.message;
      } else {
        errorMessage = String(pinError);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to pin content to IPFS',
          message: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    
    // Properly handle various error types
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = 'Error object could not be stringified';
      }
    } else {
      errorMessage = String(error);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload to IPFS',
        message: errorMessage
      },
      { status: 500 }
    );
  }
} 