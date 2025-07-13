'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
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
        // Auto-generate audio after content is ready
        await generateAudio(result.presentation_id)
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

    setIsGeneratingAudio(true)
    try {
      const response = await fetch('/api/generate-presentation-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          presentationId,
          content: presentationData 
        }),
      })

      const result: AudioResponse = await response.json()

      if (result.success && result.audioFiles) {
        setAudioFiles(result.audioFiles)
      } else {
        console.error('Audio generation failed:', result.error)
        setError(result.error || 'Failed to generate audio')
      }
    } catch (err) {
      console.error('Audio generation error:', err)
      setError('Failed to generate audio files')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  if (showViewer && presentationData) {
    return (
      <PresentationViewer 
        content={presentationData} 
        onBack={() => setShowViewer(false)}
      />
    )
  }

  const creditsRemaining = profile?.credits || 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Presi5</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Credits: {creditsRemaining}</span>
              </div>
              <div className="text-sm text-gray-600">
                {profile?.full_name || user.email}
              </div>
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
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