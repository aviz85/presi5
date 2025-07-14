import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const presentationId = params.id

    // Get presentation with markdown content
    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', presentationId)
      .eq('user_id', user.id) // Ensure user owns the presentation
      .single()

    if (fetchError || !presentation) {
      return NextResponse.json(
        { success: false, error: 'Presentation not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: presentation.id,
        title: presentation.title,
        content: presentation.content,
        markdown_content: presentation.markdown_content,
        created_at: presentation.created_at,
        updated_at: presentation.updated_at,
        is_public: presentation.is_public,
        audio_generated: presentation.audio_generated
      }
    })

  } catch (error) {
    console.error('❌ Presentation fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 