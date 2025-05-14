import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
// import dynamic from 'next/dynamic'
import ProfileContent from '../../components/profile-content'

// Dynamically import ProfileContent with no SSR
// const ProfileContent = dynamic(() => import('../../components/profile-content'), { ssr: false })

interface PageProps {
  params: {
    username: string
  }
}

// Helper function to check if a string is a wallet address
const isWalletAddress = (str: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
};

export default async function UsernamePage({ params }: PageProps) {
  const prisma = new PrismaClient()
  const { username } = params

  try {
    let userSongs = null;
    
    // Handle differently based on if it's a wallet address or username
    if (isWalletAddress(username)) {
      // It's a wallet address, search by user_id
      userSongs = await prisma.song.findFirst({
        where: {
          user_id: username
        }
      });
    } else {
      // It's a username, search by username
      userSongs = await prisma.song.findFirst({
        where: {
          username: username
        }
      });
    }

    // If no songs found with this username or wallet, return 404
    if (!userSongs) {
      return notFound()
    }

    return <ProfileContent username={username} />
  } catch (error) {
    console.error('Error fetching user data:', error)
    return notFound()
  } finally {
    await prisma.$disconnect()
  }
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const prisma = new PrismaClient()
  const { username } = params

  try {
    let songsCount = 0;
    let displayName = username;
    
    // Handle differently based on if it's a wallet address or username
    if (isWalletAddress(username)) {
      // It's a wallet address
      songsCount = await prisma.song.count({
        where: {
          user_id: username
        }
      });
      
      // Format wallet address for display
      displayName = `${username.substring(0, 6)}...${username.substring(username.length - 4)}`;
    } else {
      // It's a username
      songsCount = await prisma.song.count({
        where: {
          username: username
        }
      });
    }

    // If no songs found, return generic metadata
    if (songsCount === 0) {
      return {
        title: 'Profile Not Found | ThisSongMeant',
        description: 'This profile could not be found.',
      }
    }

    const title = `${displayName}'s Music Scrapbook`
    const description = `Collection of ${songsCount} songs that mean something to me`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: `/api/og?username=${encodeURIComponent(username)}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`/api/og?username=${encodeURIComponent(username)}`],
      },
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      title: 'Music Scrapbook | ThisSongMeant',
      description: 'Share your favorite songs and what they mean to you',
    }
  } finally {
    await prisma.$disconnect()
  }
} 