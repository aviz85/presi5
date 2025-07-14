'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import Link from 'next/link'
import PresentationViewer from '../components/PresentationViewer'
import { PresentationContent } from '../services/content-generator'

type Profile = Database['public']['Tables']['profiles']['Row']
type Presentation = Database['public']['Tables']['presentations']['Row']

interface AudioFile {
  slideId: string
  elementId?: string
  elementOrder?: number
  audioPath: string
  audioUrl: string
  duration?: number
}

interface DashboardClientProps {
  user: User
  profile: Profile | null
  presentations: Presentation[]
}

export default function DashboardClient({ user, profile, presentations }: DashboardClientProps) {
  const [loading, setLoading] = useState(false)
  const [viewingPresentation, setViewingPresentation] = useState<Presentation | null>(null)
  const [presentationContent, setPresentationContent] = useState<PresentationContent | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loadingPresentationId, setLoadingPresentationId] = useState<string | null>(null)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleViewPresentation = async (presentation: Presentation) => {
    try {
      setLoadingPresentationId(presentation.id)
      setViewingPresentation(presentation)
      setPresentationContent(presentation.content as unknown as PresentationContent)
      setIsPresentationMode(false) // View mode - no auto-play
      
      // Load audio files if available
      if (presentation.audio_generated) {
        const response = await fetch(`/api/generate-presentation-audio?presentationId=${presentation.id}`)
        const result = await response.json()
        
        if (result.success && result.audioFiles) {
          setAudioFiles(result.audioFiles)
        }
      }
    } catch (error) {
      console.error('Error loading presentation:', error)
    } finally {
      setLoadingPresentationId(null)
    }
  }

  const handlePresentPresentation = async (presentation: Presentation) => {
    try {
      setLoadingPresentationId(presentation.id)
      setViewingPresentation(presentation)
      setPresentationContent(presentation.content as unknown as PresentationContent)
      setIsPresentationMode(true) // Presentation mode - will auto-start
      
      // Load audio files if available
      if (presentation.audio_generated) {
        const response = await fetch(`/api/generate-presentation-audio?presentationId=${presentation.id}`)
        const result = await response.json()
        
        if (result.success && result.audioFiles) {
          setAudioFiles(result.audioFiles)
        }
      }
    } catch (error) {
      console.error('Error loading presentation:', error)
    } finally {
      setLoadingPresentationId(null)
    }
  }

  const handleClosePresentation = () => {
    setViewingPresentation(null)
    setPresentationContent(null)
    setAudioFiles([])
    setIsPresentationMode(false)
  }

  const creditsRemaining = profile?.credits || 0

  // If viewing a presentation, show the PresentationViewer
  if (viewingPresentation && presentationContent) {
    return (
      <PresentationViewer 
        content={presentationContent}
        onBack={handleClosePresentation}
        audioFiles={audioFiles}
        autoStart={isPresentationMode}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Presi5 Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Credits: {creditsRemaining}</span>
              </div>
              <div className="text-sm text-gray-600">
                Welcome, {profile?.full_name || user.email}
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Create New Presentation</p>
                  <p className="text-sm text-gray-500">Generate a new AI-powered presentation</p>
                </div>
              </Link>

              <Link
                href="/profile"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Edit Profile</p>
                  <p className="text-sm text-gray-500">Update your account settings</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Credits Status */}
          <div className="mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Credits Status</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>You have {creditsRemaining} credits remaining. Each presentation creation costs 1 credit.</p>
                </div>
                <div className="mt-3">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((creditsRemaining / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{creditsRemaining}/10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Presentations */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Presentations</h2>
            {presentations.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No presentations</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first presentation.</p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Presentation
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {presentations.map((presentation) => (
                    <li key={presentation.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {presentation.title}
                            </p>
                            {presentation.audio_generated && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Audio Ready
                              </span>
                            )}
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {presentation.is_public ? 'Public' : 'Private'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Created {new Date(presentation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Last updated {new Date(presentation.updated_at || presentation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => handleViewPresentation(presentation)}
                            disabled={loadingPresentationId === presentation.id}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {loadingPresentationId === presentation.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                              </>
                            ) : (
                              <>
                                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handlePresentPresentation(presentation)}
                            disabled={loadingPresentationId === presentation.id}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {loadingPresentationId === presentation.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Starting...
                              </>
                            ) : (
                              <>
                                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Present
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 