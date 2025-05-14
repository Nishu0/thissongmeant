import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  
  // Extract the filename from the path
  const parts = pathname.split('/');
  const filename = parts[parts.length - 1] || 'frame.json';
  
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'src/app/.well-known/farcaster', filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Return as JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error reading Farcaster config file (${filename}):`, error);
    return NextResponse.json(
      { error: 'Configuration not found' },
      { status: 404 }
    );
  }
} 