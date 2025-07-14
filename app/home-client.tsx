'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import InputInterface from './components/InputInterface'
import PresentationViewer from './components/PresentationViewer'
import { PresentationContent } from './services/content-generator'
import Link from 'next/link'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AudioResponse {
  success: boolean
  audioFiles?: AudioFile[]
  error?: string
}

interface AudioFile {
  slideId: string
  elementId?: string
  elementOrder?: number
  audioPath: string
  audioUrl: string
  duration?: number
}

interface HomeClientProps {
  user: User
  profile: Profile | null
}

export default function HomeClient({ user, profile }: HomeClientProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [presentationData, setPresentationData] = useState<PresentationContent | null>(null)
  const [error, setError] = useState<string>('')
  const [showViewer, setShowViewer] = useState(false)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [, setPresentationId] = useState<string>('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMobileMenu])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/welcome')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleGenerate = async (prompt: string, model: string) => {
    setIsGenerating(true)
    setError('')
    setPresentationData(null)
    setAudioFiles([])

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, model }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success) {
        setPresentationData(result.data)
        setPresentationId(result.presentation_id)
        // Auto-generate audio after content is ready - pass the data directly
        try {
          await generateAudioWithData(result.presentation_id, result.data)
        } catch (audioError) {
          console.error('❌ Audio generation failed:', audioError)
          // Don't set error state for audio failures - let user continue without audio
        }
      } else {
        setError(result.error || 'Failed to generate content')
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAudio = async (presentationId: string) => {
    if (!presentationData) return
    await generateAudioWithData(presentationId, presentationData)
  }

  const generateAudioWithData = async (presentationId: string, content: PresentationContent) => {
    setIsGeneratingAudio(true)
    console.log('🎵 Starting audio generation for presentation:', presentationId)
    console.log('📊 Content data:', { title: content.title, slides: content.slides.length })
    
    try {
      const response = await fetch('/api/generate-presentation-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          presentationId,
          content 
        }),
      })

      console.log('📡 Audio API response status:', response.status)
      const result: AudioResponse = await response.json()
      console.log('📋 Audio API response:', result)

      if (result.success && result.audioFiles) {
        console.log('✅ Audio generation successful:', result.audioFiles.length, 'files')
        setAudioFiles(result.audioFiles)
      } else {
        console.error('❌ Audio generation failed:', result.error)
        // Don't set error state - let user continue without audio
      }
    } catch (err) {
      console.error('❌ Audio generation error:', err)
      // Don't set error state - let user continue without audio
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  if (showViewer && presentationData) {
    return (
      <PresentationViewer 
        content={presentationData} 
        onBack={() => setShowViewer(false)}
        audioFiles={audioFiles}
      />
    )
  }

  const creditsRemaining = profile?.credits || 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Presi5</h1>
              <span className="ml-2 text-sm text-gray-500">AI Presentation Generator</span>
            </div>
            <div className="flex items-center space-x-6">
              {/* Credits Display */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-indigo-50 px-3 py-1 rounded-full">
                  <svg className="w-4 h-4 text-indigo-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="text-sm font-semibold text-indigo-700">
                    {creditsRemaining} Credits
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center space-x-2">
                {/* Desktop Navigation */}
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    href="/dashboard"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>

                {/* Mobile Menu */}
                <div className="sm:hidden relative" ref={mobileMenuRef}>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  {showMobileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setShowMobileMenu(false)
                            handleSignOut()
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center mb-8 pt-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Create Your Presentation
          </h2>
          <p className="text-lg text-gray-600">
            AI-Powered Presentation Generator
          </p>
        </div>

        {/* Credits Warning */}
        {creditsRemaining === 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  No Credits Remaining
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You have used all your credits. Contact support to get more credits.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <InputInterface 
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          disabled={creditsRemaining === 0}
        />
        
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {presentationData && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {presentationData.title}
            </h2>
            <p className="text-gray-600 mb-4">
              Generated {presentationData.slides.length} slides
            </p>
            
            {isGeneratingAudio ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-blue-700">
                    Generating audio files...
                  </p>
                </div>
              </div>
            ) : audioFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-medium">
                    ✅ {audioFiles.length} audio files ready
                  </p>
                </div>
                <button
                  onClick={() => setShowViewer(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Start Presentation
                </button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700">
                  Audio generation failed. You can still view the presentation without audio.
                </p>
                <button
                  onClick={() => setShowViewer(true)}
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  View Presentation (No Audio)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
} 