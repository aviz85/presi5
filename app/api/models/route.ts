import { NextRequest, NextResponse } from 'next/server';
import { getAvailableModels, getFreeModels, getDefaultModels } from '@/app/services/openrouter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const freeOnly = searchParams.get('free') === 'true';
    const format = searchParams.get('format') || 'json';

    let models: string[];
    
    if (freeOnly) {
      models = await getFreeModels();
    } else {
      models = await getAvailableModels();
    }

    // Format for dropdown selection
    if (format === 'select') {
      const formattedModels = models.map(model => ({
        value: model,
        label: model.replace(/:/g, ' - ').replace(/\//g, ' / ')
      }));
      
      return NextResponse.json({
        success: true,
        data: formattedModels,
        count: formattedModels.length,
        freeOnly
      });
    }

    return NextResponse.json({
      success: true,
      data: models,
      count: models.length,
      freeOnly,
      default: getDefaultModels()
    });

  } catch (error: unknown) {
    console.error('Error fetching models:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to fetch models', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 