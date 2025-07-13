import { NextResponse } from 'next/server';
import { generatePresentationContent } from '@/app/services/content-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model = 'qwen/qwen-2.5-72b-instruct' } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Prompt must be at least 10 characters long' },
        { status: 400 }
      );
    }

    console.log('🎯 Generating content for prompt:', prompt.substring(0, 100) + '...');
    console.log('🤖 Using model:', model);

    // Generate presentation content
    const result = await generatePresentationContent(prompt.trim(), model);

    if (!result.success) {
      console.error('❌ Content generation failed:', result.error);
      return NextResponse.json(
        { 
          error: 'Content generation failed',
          details: result.error.error || 'Unknown error occurred'
        },
        { status: 500 }
      );
    }

    console.log('✅ Content generated successfully');
    console.log('📊 Generated slides:', result.data.slides.length);

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error: unknown) {
    console.error('❌ API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
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