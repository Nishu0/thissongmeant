'use client'

import { useState } from 'react'
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { saveUsername } from "~/lib/user"

interface UsernameClaim {
  isOpen: boolean
  onComplete: (username: string) => void
  user: {
    id: string
    address: string
    username?: string
  }
}

export function UsernameClaimModal({ isOpen, onComplete, user }: UsernameClaim) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Basic validation
    if (!username.trim()) {
      setError('Username is required')
      setIsLoading(false)
      return
    }

    // Username format validation
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters and can only contain letters, numbers, and underscores')
      setIsLoading(false)
      return
    }

    try {
      // Check if username is taken via API
      const checkResponse = await fetch(`/api/username/check?username=${encodeURIComponent(username.toLowerCase())}`)
      const checkData = await checkResponse.json()
      
      if (!checkResponse.ok) {
        throw new Error(checkData.error || 'Failed to check username')
      }
      
      if (checkData.taken) {
        setError('This username is already taken')
        setIsLoading(false)
        return
      }

      // Save username via API
      const saveResponse = await fetch('/api/username/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.toLowerCase(),
          walletAddress: user.address,
          userId: user.id
        }),
      })
      
      const saveData = await saveResponse.json()
      
      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to save username')
      }

      // Save username to localStorage for client-side usage
      saveUsername(username.toLowerCase())
      
      // Call onComplete callback with the new username
      onComplete(username.toLowerCase())
    } catch (error) {
      console.error('Error claiming username:', error)
      setError('Failed to claim username. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Choose Your Username</h2>
        <p className="mb-6 text-sm text-gray-600">
          This will be your unique profile URL and how others find you.
        </p>

        {/* Display wallet address information */}
        <div className="mb-4 rounded-md bg-gray-100 p-3 text-sm">
          <p className="text-gray-700">
            <span className="font-medium">Wallet:</span>{' '}
            {user.address.substring(0, 6)}...{user.address.substring(user.address.length - 4)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-2">
              <label htmlFor="username" className="text-sm text-gray-600">
                Your profile will be at:
              </label>
              <div className="mt-1 flex items-center rounded-md bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-500">thissongmeant.com/</span>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                  className="border-0 bg-transparent focus-visible:ring-0"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="w-full bg-[#333] text-white hover:bg-[#555]"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 