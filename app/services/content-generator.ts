import { generateContent, generateStreamingContent, OpenRouterResponse, OpenRouterError } from './openrouter';

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
  type: 'title' | 'subtitle' | 'content' | 'bullet-list' | 'speech';
  content: string;
  animation: string;
  delay: number;
  order: number;
}

/**
 * Content generation prompt template
 */
const CONTENT_GENERATION_PROMPT = `Create a presentation with interleaved visual and speech elements. Each visual element must be followed by a speech element that explains it.

JSON Format:
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
          "animation": "animate-fade-in",
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
          "content": "Key Points",
          "animation": "animate-slide-in-left",
          "delay": 1000,
          "order": 3
        },
        {
          "id": "element-4",
          "type": "speech",
          "content": "Let's examine the main aspects of this subject.",
          "animation": "",
          "delay": 0,
          "order": 4
        }
      ]
    }
  ]
}

RULES:
1. Create 5-7 slides
2. Pattern: Visual → Speech → Visual → Speech
3. Visual types: title, subtitle, content, bullet-list
4. Speech: Natural narration explaining the visual
5. Animations: animate-fade-in, animate-slide-in-left, animate-slide-in-right, animate-scale-up, animate-bounce-in
6. CRITICAL: Visual elements delay=1000, Speech elements delay=0 (ALWAYS)
7. Speech animation MUST be empty string ""
8. Order elements: 1, 2, 3, 4...
9. Each slide: 4-6 elements (2-3 visual + 2-3 speech pairs)
10. Bullet lists: Use <ul><li>text</li></ul> format

Topic: `;

/**
 * Generate presentation content from user prompt
 * @param prompt - User's presentation topic
 * @param model - OpenRouter model to use
 * @returns Promise with structured presentation content
 */
export async function generatePresentationContent(
  prompt: string,
  model: string = 'qwen/qwen3-8b:free'
): Promise<{ success: true; data: PresentationContent } | { success: false; error: OpenRouterError }> {
  try {
    const systemPrompt = CONTENT_GENERATION_PROMPT + prompt;
    
    const response = await generateContent(
      prompt,
      systemPrompt,
      model
    );

    if ('error' in response) {
      return { success: false, error: response };
    }

    // Parse the JSON response
    const parsedContent = parseContentResponse(response.content);
    
    if (!parsedContent) {
      return {
        success: false,
        error: {
          error: 'Failed to parse content',
          code: 'PARSE_ERROR',
          details: 'The AI response could not be parsed as valid JSON'
        }
      };
    }

    return { success: true, data: parsedContent };

  } catch (error: any) {
    console.error('Content generation error:', error);
    
    return {
      success: false,
      error: {
        error: error.message || 'Content generation failed',
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
  model: string = 'qwen/qwen3-8b:free',
  onChunk: (chunk: string) => void
): Promise<{ success: true; data: PresentationContent } | { success: false; error: OpenRouterError }> {
  try {
    const systemPrompt = CONTENT_GENERATION_PROMPT + prompt;
    
    const response = await generateStreamingContent(
      prompt,
      systemPrompt,
      model,
      onChunk
    );

    if ('error' in response) {
      return { success: false, error: response };
    }

    // Parse the final content
    const parsedContent = parseContentResponse(response.content);
    
    if (!parsedContent) {
      return {
        success: false,
        error: {
          error: 'Failed to parse streaming content',
          code: 'PARSE_ERROR',
          details: 'The AI streaming response could not be parsed as valid JSON'
        }
      };
    }

    return { success: true, data: parsedContent };

  } catch (error: any) {
    console.error('Streaming content generation error:', error);
    
    return {
      success: false,
      error: {
        error: error.message || 'Streaming content generation failed',
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
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.title || !parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error('Invalid content structure');
    }

    // Ensure each slide has required fields
    parsed.slides.forEach((slide: any, index: number) => {
      if (!slide.id) slide.id = `slide-${index + 1}`;
      if (!slide.title) slide.title = `Slide ${index + 1}`;
      if (!slide.content) slide.content = '';
      if (!slide.elements || !Array.isArray(slide.elements)) {
        slide.elements = [];
      }

      // Validate elements
      slide.elements.forEach((element: any, elemIndex: number) => {
        if (!element.id) element.id = `element-${index}-${elemIndex}`;
        if (!element.type) element.type = 'content';
        if (!element.content) element.content = '';
        if (!element.animation) element.animation = 'animate-fade-in';
        if (!element.delay) element.delay = 1000;
        if (!element.order) element.order = elemIndex + 1;
      });
    });

    return {
      title: parsed.title,
      slides: parsed.slides,
      totalSlides: parsed.slides.length
    };

  } catch (error) {
    console.error('Content parsing error:', error);
    return null;
  }
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