import { OpenAI } from 'openai';

// OpenRouter configuration
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key-for-testing',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Presi5 - AI Presentation Generator',
  },
});

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Generate content using OpenRouter API
 * @param prompt - User prompt for content generation
 * @param systemPrompt - System prompt for AI behavior
 * @param model - OpenRouter model to use (default: gpt-3.5-turbo)
 * @returns Promise with generated content or error
 */
export async function generateContent(
  prompt: string,
  systemPrompt: string,
  model: string = 'qwen/qwen-2.5-72b-instruct'
): Promise<OpenRouterResponse | OpenRouterError> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        error: 'OpenRouter API key not configured',
        code: 'MISSING_API_KEY',
        details: 'Please set OPENROUTER_API_KEY in your environment variables'
      };
    }

    console.log(`🔄 Attempting content generation with model: ${model}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      stream: false
    });

    const choice = response.choices[0];
    if (!choice || !choice.message?.content) {
      console.error(`❌ Empty response from model: ${model}`);
      return {
        error: 'No content generated',
        code: 'EMPTY_RESPONSE',
        details: `The AI model ${model} did not generate any content`
      };
    }

    console.log(`✅ Content generated successfully with model: ${model}`);
    return {
      content: choice.message.content,
      model: response.model || model,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined
    };

  } catch (error: unknown) {
    console.error(`❌ OpenRouter API error with model ${model}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      error: 'OpenRouter API request failed',
      code: 'API_ERROR',
      details: `Model ${model}: ${errorMessage}`
    };
  }
}

/**
 * Generate streaming content using OpenRouter API
 * @param prompt - User prompt for content generation
 * @param systemPrompt - System prompt for AI behavior
 * @param model - OpenRouter model to use
 * @param onChunk - Callback for each content chunk
 * @returns Promise with final content or error
 */
export async function generateStreamingContent(
  prompt: string,
  systemPrompt: string,
  model: string = 'qwen/qwen-2.5-72b-instruct',
  onChunk: (chunk: string) => void
): Promise<OpenRouterResponse | OpenRouterError> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        error: 'OpenRouter API key not configured',
        code: 'MISSING_API_KEY',
        details: 'Please set OPENROUTER_API_KEY in your environment variables'
      };
    }

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      stream: true
    });

    let content = '';
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        content += delta;
        onChunk(delta);
      }
    }

    if (!content) {
      return {
        error: 'No content generated',
        code: 'EMPTY_RESPONSE',
        details: 'The AI model did not generate any content'
      };
    }

    return {
      content,
      model,
      usage: undefined // Usage not available in streaming mode
    };

  } catch (error: unknown) {
    console.error('OpenRouter streaming error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      error: 'OpenRouter streaming request failed',
      code: 'STREAMING_ERROR',
      details: errorMessage
    };
  }
}

interface ModelData {
  id: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

interface ModelsResponse {
  data?: ModelData[];
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ModelsResponse = await response.json();
    return data.data?.map((model: ModelData) => model.id) || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return getDefaultModels();
  }
}

export async function getFreeModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ModelsResponse = await response.json();
    const freeModels = data.data?.filter((model: ModelData) => 
      model.pricing?.prompt === '0' && model.pricing?.completion === '0'
    ).map((model: ModelData) => model.id) || [];
    
    return freeModels.length > 0 ? freeModels : getDefaultModels();
  } catch (error) {
    console.error('Error fetching free models:', error);
    return getDefaultModels();
  }
}

export function getDefaultModels(): string[] {
  return [
    'qwen/qwen3-8b:free',
    'deepseek/deepseek-r1-0528:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'huggingface/zephyr-7b-beta:free'
  ];
} 