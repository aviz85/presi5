import { createClient } from '@/lib/supabase/server'
import AudioBatchGenerator from '@/app/services/audio-batch-generator'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { presentationId, content } = body

    if (!presentationId || !content) {
      return NextResponse.json(
        { success: false, error: 'Presentation ID and content are required' },
        { status: 400 }
      )
    }

    // Verify the presentation belongs to the user
    const { data: presentation, error: presentationError } = await supabase
      .from('presentations')
      .select('user_id')
      .eq('id', presentationId)
      .eq('user_id', user.id)
      .single()

    if (presentationError || !presentation) {
      return NextResponse.json(
        { success: false, error: 'Presentation not found or access denied' },
        { status: 404 }
      )
    }

    console.log('🎵 Generating audio for presentation:', presentationId)

    // Generate audio files with Supabase Storage
    const audioGenerator = new AudioBatchGenerator()
    const result = await audioGenerator.generatePresentationAudio(content, 'Kore', user.id)

    if (result.status === 'error') {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Save audio file metadata to database
    const audioFiles = result.audioFiles || []
    
    if (audioFiles.length > 0) {
      const audioRecords = audioFiles.map((file) => ({
        presentation_id: presentationId,
        file_name: file.audioPath.split('/').pop() || '',
        file_path: file.audioPath,
        element_id: file.elementId || '',
        element_order: file.elementOrder || 0,
        duration: file.duration
      }))

      const { error: audioInsertError } = await supabase
        .from('audio_files')
        .insert(audioRecords)

      if (audioInsertError) {
        console.error('Failed to save audio metadata:', audioInsertError)
        // Try to clean up uploaded files if database insert fails
        try {
          await audioGenerator.deleteAudioFiles(presentationId)
        } catch (cleanupError) {
          console.error('Failed to cleanup audio files after database error:', cleanupError)
        }
        
        return NextResponse.json(
          { success: false, error: 'Failed to save audio metadata' },
          { status: 500 }
        )
      }

      // Mark presentation as having audio generated
      await supabase
        .from('presentations')
        .update({ audio_generated: true })
        .eq('id', presentationId)
    }

    console.log('✅ Audio generation completed:', audioFiles.length, 'files')

    return NextResponse.json({
      success: true,
      audioFiles,
      message: `Generated ${audioFiles.length} audio files`
    })

  } catch (error) {
    console.error('❌ Audio generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const presentationId = searchParams.get('presentationId')

    if (!presentationId) {
      return NextResponse.json(
        { success: false, error: 'Presentation ID is required' },
        { status: 400 }
      )
    }

    // Use the AudioBatchGenerator to get audio files with proper URLs
    const audioGenerator = new AudioBatchGenerator()
         const audioFiles = await audioGenerator.getAudioFiles(presentationId)

    return NextResponse.json({
      success: true,
      audioFiles
    })

  } catch (error) {
    console.error('❌ Audio fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 