import { NextRequest, NextResponse } from 'next/server';
import GeminiTTSService from '../../services/gemini-tts';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceName = 'Kore' } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const ttsService = new GeminiTTSService();
    const audioResult = await ttsService.generateAudio(text, voiceName);

    // Return the audio as a response
    return new NextResponse(audioResult.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': audioResult.mimeType,
        'Content-Disposition': `attachment; filename="${audioResult.fileName}"`,
        'Content-Length': audioResult.audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const ttsService = new GeminiTTSService();
    const voices = ttsService.getAvailableVoices();

    return NextResponse.json({
      voices,
      model: 'gemini-2.5-pro-preview-tts',
      status: 'ready'
    });

  } catch (error) {
    console.error('TTS service error:', error);
    return NextResponse.json(
      { 
        error: 'TTS service not available',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 