import { generateContent, generateStreamingContent, OpenRouterError } from './openrouter';

export interface PresentationContent {
  title: string;
  slides: PresentationSlide[];
  totalSlides: number;
}

export interface PresentationSlide {
  id: string;
  title: string;
  content: string;
  elements: SlideElement[];
}

export interface SlideElement {
  id: string;
  type: 'title' | 'subtitle' | 'content' | 'bullet-list' | 'bullet-point' | 'speech';
  content: string;
  animation: string;
  delay: number;
  order: number;
}

/**
 * Content generation prompt template
 */
const CONTENT_GENERATION_PROMPT = `You are an AI presentation generator. Create a structured presentation with interleaved visual and speech elements. Each visual element must be followed by a speech element that explains it.

For bullet points, create separate "bullet-point" elements - each bullet point should be its own element with its own speech explanation.

Return ONLY valid JSON in this exact format:
{
  "title": "Presentation Title",
  "slides": [
    {
      "id": "slide-1",
      "title": "Slide Title",
      "content": "Brief summary",
      "elements": [
        {
          "id": "element-1",
          "type": "title",
          "content": "Main Title",
          "animation": "fade-in",
          "delay": 1000,
          "order": 1
        },
        {
          "id": "element-2",
          "type": "speech",
          "content": "Welcome to our presentation. Today we'll explore this topic.",
          "animation": "",
          "delay": 0,
          "order": 2
        },
        {
          "id": "element-3",
          "type": "subtitle",
          "content": "Key Benefits",
          "animation": "slide-in-left",
          "delay": 1000,
          "order": 3
        },
        {
          "id": "element-4",
          "type": "speech",
          "content": "Let's examine the main benefits of this approach.",
          "animation": "",
          "delay": 0,
          "order": 4
        },
        {
          "id": "element-5",
          "type": "bullet-point",
          "content": "• Improved efficiency and productivity",
          "animation": "scale-up",
          "delay": 1000,
          "order": 5
        },
        {
          "id": "element-6",
          "type": "speech",
          "content": "First, we see significant improvements in efficiency and productivity.",
          "animation": "",
          "delay": 0,
          "order": 6
        },
        {
          "id": "element-7",
          "type": "bullet-point",
          "content": "• Cost reduction and better ROI",
          "animation": "scale-up",
          "delay": 1000,
          "order": 7
        },
        {
          "id": "element-8",
          "type": "speech",
          "content": "Additionally, organizations experience substantial cost reductions and better return on investment.",
          "animation": "",
          "delay": 0,
          "order": 8
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Create 5-7 slides total
2. STRICT Pattern: Visual → Speech → Visual → Speech (alternate every element)
3. Visual types: title, subtitle, content, bullet-point
4. Each bullet-point is separate with its own speech explanation
5. Speech: Natural narration explaining the visual element
6. Animations: fade-in, slide-in-left, slide-in-right, scale-up, bounce-in
7. Visual elements: delay=1000ms, Speech elements: delay=0ms
8. Return ONLY valid JSON, no markdown, no explanation
9. Ensure all content is in English unless specifically requested otherwise`;

/**
 * Generate presentation content from user prompt
 * @param prompt - User's presentation topic
 * @param model - OpenRouter model to use
 * @returns Promise with structured presentation content
 */
export async function generatePresentationContent(
  prompt: string,
  model: string = 'qwen/qwen-2.5-72b-instruct'
): Promise<{ success: true; data: PresentationContent } | { success: false; error: OpenRouterError }> {
  try {
    // Validate input prompt
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: {
          error: 'Empty prompt provided',
          code: 'INVALID_INPUT',
          details: 'Prompt cannot be empty'
        }
      };
    }

    // Check if prompt is in non-English and suggest English
    const hasNonEnglish = /[^\x00-\x7F]/.test(prompt);
    if (hasNonEnglish) {
      console.warn('⚠️ Non-English characters detected in prompt. Requesting English translation.');
    }

    const userPrompt = `Create a presentation about: ${prompt.trim()}`;
    
    // Try with the requested model first
    let response = await generateContent(
      userPrompt,
      CONTENT_GENERATION_PROMPT,
      model
    );

    // If the requested model fails, try fallback models
    if ('error' in response) {
      console.warn(`⚠️ Model ${model} failed, trying fallback models...`);
      
      const fallbackModels = [
        'qwen/qwen-2.5-72b-instruct',
        'deepseek/deepseek-r1-distill-llama-70b',
        'microsoft/wizardlm-2-8x22b',
        'qwen/qwen-2.5-7b-instruct',
        'meta-llama/llama-3.1-8b-instruct:free'
      ];

      for (const fallbackModel of fallbackModels) {
        if (fallbackModel === model) continue; // Skip if it's the same model we already tried
        
        console.log(`🔄 Trying fallback model: ${fallbackModel}`);
        response = await generateContent(
          userPrompt,
          CONTENT_GENERATION_PROMPT,
          fallbackModel
        );

        if (!('error' in response)) {
          console.log(`✅ Success with fallback model: ${fallbackModel}`);
          break;
        }
      }
    }

    if ('error' in response) {
      return { success: false, error: response };
    }

    const presentationData = parseContentResponse(response.content);
    
    if (!presentationData) {
      return {
        success: false,
        error: {
          error: 'Failed to parse content',
          code: 'PARSE_ERROR',
          details: 'The AI response could not be parsed as valid JSON'
        }
      };
    }
    
    return { success: true, data: presentationData };

  } catch (error: unknown) {
    console.error('Content generation error:', error);
    
    return {
      success: false,
      error: {
        error: error instanceof Error ? error.message : 'Content generation failed',
        code: 'GENERATION_ERROR',
        details: 'An error occurred while generating presentation content'
      }
    };
  }
}

/**
 * Generate streaming presentation content
 * @param prompt - User's presentation topic
 * @param model - OpenRouter model to use
 * @param onChunk - Callback for each content chunk
 * @returns Promise with structured presentation content
 */
export async function generateStreamingPresentationContent(
  prompt: string,
  model: string = 'qwen/qwen-2.5-72b-instruct',
  onChunk: (chunk: string) => void
): Promise<{ success: true; data: PresentationContent } | { success: false; error: OpenRouterError }> {
  try {
    // Validate input prompt
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: {
          error: 'Empty prompt provided',
          code: 'INVALID_INPUT',
          details: 'Prompt cannot be empty'
        }
      };
    }

    // Check if prompt is in non-English and suggest English
    const hasNonEnglish = /[^\x00-\x7F]/.test(prompt);
    if (hasNonEnglish) {
      console.warn('⚠️ Non-English characters detected in prompt. Requesting English translation.');
    }

    const userPrompt = `Create a presentation about: ${prompt.trim()}`;
    
    const response = await generateStreamingContent(
      userPrompt,
      CONTENT_GENERATION_PROMPT,
      model,
      onChunk
    );

    if ('error' in response) {
      return { success: false, error: response };
    }

    const presentationData = parseContentResponse(response.content);
    
    if (!presentationData) {
      return {
        success: false,
        error: {
          error: 'Failed to parse streaming content',
          code: 'PARSE_ERROR',
          details: 'The AI streaming response could not be parsed as valid JSON'
        }
      };
    }

    return { success: true, data: presentationData };

  } catch (error: unknown) {
    console.error('Streaming content generation error:', error);
    
    return {
      success: false,
      error: {
        error: error instanceof Error ? error.message : 'Streaming content generation failed',
        code: 'STREAMING_GENERATION_ERROR',
        details: 'An error occurred while generating streaming presentation content'
      }
    };
  }
}

/**
 * Parse AI response into structured presentation content
 * @param content - Raw AI response content
 * @returns Parsed presentation content or null if parsing fails
 */
function parseContentResponse(content: string): PresentationContent | null {
  try {
    console.log('📝 Parsing AI response...');
    
    // Remove any markdown code blocks and extract JSON
    let jsonStr = content.trim();
    
    // Remove markdown code block markers if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Remove any leading/trailing text that's not JSON
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Clean up common JSON formatting issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/\n/g, ' ')     // Replace newlines with spaces
      .replace(/\s+/g, ' ');   // Normalize whitespace

    console.log('🔍 Attempting to parse JSON...');
    
    // Parse the JSON
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    
    console.log('✅ JSON parsed successfully');
    
    // Validate the parsed data
    const validatedData = validatePresentationContent(data);
    console.log(`📊 Validated presentation: ${validatedData.title} (${validatedData.totalSlides} slides)`);
    
    return validatedData;

  } catch (error: unknown) {
    console.error('❌ Content parsing error:', error);
    console.error('📄 Raw content preview:', content.substring(0, 200) + '...');
    return null;
  }
}

function validatePresentationContent(data: Record<string, unknown>): PresentationContent {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Invalid or missing title');
  }

  if (!Array.isArray(data.slides)) {
    throw new Error('Invalid or missing slides array');
  }

  const slides = data.slides.map((slide: unknown, index: number) => {
    if (typeof slide !== 'object' || slide === null) {
      throw new Error(`Invalid slide at index ${index}`);
    }

    const slideObj = slide as Record<string, unknown>;
    
    if (!slideObj.title || typeof slideObj.title !== 'string') {
      throw new Error(`Invalid slide title at index ${index}`);
    }

    if (!Array.isArray(slideObj.elements)) {
      throw new Error(`Invalid elements array at slide ${index}`);
    }

    const elements = slideObj.elements.map((element: unknown, elemIndex: number) => {
      if (typeof element !== 'object' || element === null) {
        throw new Error(`Invalid element at slide ${index}, element ${elemIndex}`);
      }

      const elemObj = element as Record<string, unknown>;
      
      return {
        id: (elemObj.id as string) || `slide-${index}-element-${elemIndex}`,
        type: elemObj.type as SlideElement['type'],
        content: elemObj.content as string,
        animation: elemObj.animation as string,
        delay: Number(elemObj.delay) || 0,
        order: Number(elemObj.order) || elemIndex
      };
    });

    return {
      id: (slideObj.id as string) || `slide-${index}`,
      title: slideObj.title,
      content: (slideObj.content as string) || '',
      elements
    };
  });

  return {
    title: data.title,
    slides,
    totalSlides: slides.length
  };
}

/**
 * Create a sample presentation for testing
 * @returns Sample presentation content
 */
export function createSamplePresentation(): PresentationContent {
  return {
    title: "AI-Powered Presentation Generation",
    totalSlides: 3,
    slides: [
      {
        id: "slide-1",
        title: "Welcome",
        content: "Introduction to AI presentation generation",
        elements: [
          {
            id: "element-1-1",
            type: "title",
            content: "AI-Powered Presentation Generation",
            animation: "animate-fade-in",
            delay: 1000,
            order: 1
          },
          {
            id: "element-1-2",
            type: "speech",
            content: "Welcome to our presentation about AI-powered presentation generation. Today we'll explore how artificial intelligence can transform the way we create and deliver presentations.",
            animation: "",
            delay: 2000,
            order: 2
          },
          {
            id: "element-1-3",
            type: "subtitle",
            content: "Revolutionizing Content Creation",
            animation: "animate-slide-in-left",
            delay: 3000,
            order: 3
          }
        ]
      },
      {
        id: "slide-2",
        title: "Key Benefits",
        content: "Main advantages of AI presentation generation",
        elements: [
          {
            id: "element-2-1",
            type: "title",
            content: "Key Benefits",
            animation: "animate-scale-up",
            delay: 1000,
            order: 1
          },
          {
            id: "element-2-2",
            type: "speech",
            content: "AI presentation generation offers numerous advantages for content creators and presenters.",
            animation: "",
            delay: 2000,
            order: 2
          },
          {
            id: "element-2-3",
            type: "bullet-list",
            content: "<ul><li>Automated content generation</li><li>Consistent formatting and design</li><li>Time-saving workflow</li><li>Enhanced creativity and ideas</li></ul>",
            animation: "animate-slide-in-right",
            delay: 3000,
            order: 3
          }
        ]
      },
      {
        id: "slide-3",
        title: "Thank You",
        content: "Conclusion and next steps",
        elements: [
          {
            id: "element-3-1",
            type: "title",
            content: "Thank You",
            animation: "animate-bounce-in",
            delay: 1000,
            order: 1
          },
          {
            id: "element-3-2",
            type: "speech",
            content: "Thank you for your attention. We hope this presentation has shown you the potential of AI-powered presentation generation.",
            animation: "",
            delay: 2000,
            order: 2
          },
          {
            id: "element-3-3",
            type: "content",
            content: "Questions & Discussion",
            animation: "animate-fade-in",
            delay: 3000,
            order: 3
          }
        ]
      }
    ]
  };
} 