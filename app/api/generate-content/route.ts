import { NextRequest, NextResponse } from 'next/server';
import { generatePresentationContent, generateStreamingPresentationContent } from '@/app/services/content-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'qwen/qwen3-8b:free', streaming = false } = body;

    // Validate request
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt cannot be empty' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt is too long (maximum 1000 characters)' },
        { status: 400 }
      );
    }

    // Handle streaming requests
    if (streaming) {
      return handleStreamingRequest(prompt, model);
    }

    // Handle regular requests
    const result = await generatePresentationContent(prompt, model);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error.error,
          code: result.error.code,
          details: result.error.details 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      model,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Content generation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming content generation
 */
async function handleStreamingRequest(prompt: string, model: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        
        const result = await generateStreamingPresentationContent(
          prompt,
          model,
          (chunk: string) => {
            buffer += chunk;
            
            // Send chunk to client
            const data = JSON.stringify({
              type: 'chunk',
              content: chunk,
              buffer: buffer
            });
            
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        );

        // Send final result
        if (result.success) {
          const finalData = JSON.stringify({
            type: 'complete',
            success: true,
            data: result.data,
            model,
            generatedAt: new Date().toISOString()
          });
          
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        } else {
          const errorData = JSON.stringify({
            type: 'error',
            success: false,
            error: result.error.error,
            code: result.error.code,
            details: result.error.details
          });
          
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        }

        controller.close();
        
      } catch (error: any) {
        console.error('Streaming error:', error);
        
        const errorData = JSON.stringify({
          type: 'error',
          success: false,
          error: 'Streaming failed',
          code: 'STREAMING_ERROR',
          details: error.message || 'An error occurred during streaming'
        });
        
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Content generation API is running',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Generate presentation content from prompt',
        parameters: {
          prompt: 'string (required) - The presentation topic',
          model: 'string (optional) - OpenRouter model to use',
          streaming: 'boolean (optional) - Enable streaming response'
        }
      }
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 