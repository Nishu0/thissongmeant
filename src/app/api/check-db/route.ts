import { NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

export async function GET() {
  try {
    // Try to connect to the database
    await prisma.$connect();
    
    // Check database connection by performing a simple query
    const count = await prisma.song.count();
    
    // Return successful response with database info
    return NextResponse.json({ 
      status: "success", 
      message: "Database connection successful",
      database_url: process.env.POSTGRESQL_DB ? 
        process.env.POSTGRESQL_DB.replace(/:[^:]*@/, ":***@") : 
        "Environment variable not set",
      song_count: count,
      prisma_initialized: true
    });
  } catch (error) {
    console.error("Database connection error:", error);
    
    let errorDetails = "Unknown error";
    let errorType = "Unknown";
    
    if (error instanceof Error) {
      errorDetails = error.message;
      errorType = error.name;
    }
    
    // Return error information
    return NextResponse.json({ 
      status: "error", 
      message: "Failed to connect to database",
      error_type: errorType,
      error_details: errorDetails,
      database_url_exists: Boolean(process.env.POSTGRESQL_DB),
      node_env: process.env.NODE_ENV
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 