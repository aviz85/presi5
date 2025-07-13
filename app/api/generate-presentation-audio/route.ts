import { NextRequest, NextResponse } from 'next/server';
import AudioBatchGenerator from '../../services/audio-batch-generator';
import { PresentationContent } from '../../services/content-generator';

export async function POST(request: NextRequest) {
  try {
    const { presentationContent, voiceName = 'Kore' } = await request.json();

    if (!presentationContent) {
      return NextResponse.json(
        { error: 'Presentation content is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const batchGenerator = new AudioBatchGenerator();
    const result = await batchGenerator.generatePresentationAudio(
      presentationContent as PresentationContent,
      voiceName
    );

    if (result.status === 'error') {
      return NextResponse.json(
        { 
          error: 'Failed to generate audio files',
          details: result.error 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      presentationId: result.presentationId,
      audioFiles: result.audioFiles,
      totalDuration: result.totalDuration,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch audio generation API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate presentation audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const presentationId = searchParams.get('presentationId');

    if (!presentationId) {
      return NextResponse.json(
        { error: 'Presentation ID is required' },
        { status: 400 }
      );
    }

    const batchGenerator = new AudioBatchGenerator();
    const audioFiles = await batchGenerator.getAudioFiles(presentationId);

    return NextResponse.json({
      success: true,
      presentationId,
      audioFiles,
      totalFiles: audioFiles.length
    });

  } catch (error) {
    console.error('Audio files retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve audio files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 