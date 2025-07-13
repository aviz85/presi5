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
  model: string = 'qwen/qwen3-8b:free'
): Promise<OpenRouterResponse | OpenRouterError> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        error: 'OpenRouter API key not configured',
        code: 'MISSING_API_KEY',
        details: 'Please set OPENROUTER_API_KEY in your environment variables'
      };
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return {
        error: 'No content generated',
        code: 'EMPTY_RESPONSE',
        details: 'The AI model returned an empty response'
      };
    }

    return {
      content,
      model,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined
    };

  } catch (error: any) {
    console.error('OpenRouter API Error:', error);
    
    return {
      error: error.message || 'Failed to generate content',
      code: error.code || 'API_ERROR',
      details: error.response?.data?.error?.message || 'Unknown error occurred'
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
  model: string = 'qwen/qwen3-8b:free',
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
      temperature: 0.7,
      max_tokens: 4000,
      stream: true,
    });

    let fullContent = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return {
      content: fullContent,
      model
    };

  } catch (error: any) {
    console.error('OpenRouter Streaming Error:', error);
    
    return {
      error: error.message || 'Failed to generate streaming content',
      code: error.code || 'STREAMING_ERROR',
      details: error.response?.data?.error?.message || 'Unknown streaming error occurred'
    };
  }
}

/**
 * Get available models from OpenRouter
 * @returns Promise with available models list
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.map((model: any) => model.id) || [];
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

    const data = await response.json();
    const freeModels = data.data?.filter((model: any) => 
      model.pricing?.prompt === '0' && model.pricing?.completion === '0'
    ).map((model: any) => model.id) || [];
    
    return freeModels.length > 0 ? freeModels : getDefaultModels();
  } catch (error) {
    console.error('Error fetching free models:', error);
    return getDefaultModels();
  }
}

export function getDefaultModels(): string[] {
  return [
    'qwen/qwen3-8b:free',
    'qwen/qwen3-4b:free',
    'qwen/qwen3-14b:free',
    'qwen/qwen3-30b-a3b:free',
    'qwen/qwq-32b:free',
    'deepseek/deepseek-r1-0528:free',
    'mistralai/mistral-small-3.2-24b-instruct:free',
    'google/gemma-3n-e2b-it:free'
  ];
} 