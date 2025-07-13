import { createClient } from '@/lib/supabase/server'
import { generatePresentationContent } from '@/app/services/content-generator'
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

    // Get user profile to check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user has enough credits
    if (profile.credits < 1) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits. You need at least 1 credit to generate a presentation.' },
        { status: 402 } // Payment Required
      )
    }

    const body = await request.json()
    const { prompt, model = 'qwen/qwen-2.5-72b-instruct' } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required and cannot be empty' },
        { status: 400 }
      )
    }

    console.log('🎯 Generating content for authenticated user:', user.email)
    console.log('🤖 Using model:', model)

    // Generate the presentation content
    const result = await generatePresentationContent(prompt, model)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    // Deduct credits using the database function
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      user_uuid: user.id,
      credits_amount: 1,
      action_description: `Generated presentation: "${result.data.title}"`,
      action_type_param: 'presentation_creation'
    })

    if (deductError) {
      console.error('Failed to deduct credits:', deductError)
      return NextResponse.json(
        { success: false, error: 'Failed to process credits' },
        { status: 500 }
      )
    }

    // Save the presentation to the database
    const { data: presentation, error: saveError } = await supabase
      .from('presentations')
      .insert({
        user_id: user.id,
        title: result.data.title,
        content: result.data as any,
        audio_generated: false
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save presentation:', saveError)
      // Try to refund the credit if presentation save failed
      await supabase.rpc('add_credits', {
        user_uuid: user.id,
        credits_amount: 1,
        action_description: 'Refund for failed presentation save'
      })
      
      return NextResponse.json(
        { success: false, error: 'Failed to save presentation' },
        { status: 500 }
      )
    }

    console.log('✅ Content generated and saved successfully')
    console.log('📊 Generated slides:', result.data.slides.length)

    return NextResponse.json({
      success: true,
      data: result.data,
      presentation_id: presentation.id,
      credits_remaining: profile.credits - 1
    })

  } catch (error) {
    console.error('❌ Content generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Content generation API endpoint',
    methods: ['POST'],
    description: 'Generate presentation content from text prompts'
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 