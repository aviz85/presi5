import { generateContent, generateStreamingContent, OpenRouterError } from './openrouter'
import MarkdownParser from './markdown-parser';

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
const CONTENT_GENERATION_PROMPT = `You are an AI presentation generator. Create a structured presentation in Markdown format.

Create 4-7 slides with clear sections for content and speech narration. Use this EXACT format:

# [Presentation Title]

## [Slide 1 Title]
- First key point about the topic
- Second important point
- Third relevant detail

**Speech:** Welcome to our presentation on [topic]. Today we'll explore [brief overview]. Let's start by examining [first point]. [Explain second point]. Finally, [explain third point].

## [Slide 2 Title]
### [Subtitle if needed]
Main content paragraph explaining the concept in detail.

• Bullet point with specific benefit
• Another bullet point with example
• Third bullet point with evidence

**Speech:** Now let's dive deeper into [slide topic]. [Explain the main concept]. The key benefits include [explain bullets]. This is important because [reasoning].

## [Slide 3 Title]
Content can be paragraphs, bullet points, or subtitles.

**Speech:** Moving on to [topic], we need to understand [explanation]. This connects to our previous points by [connection].

Continue this pattern for 4-7 slides total.

RULES:
- Use # for presentation title (only once)
- Use ## for slide titles
- Use ### for subtitles within slides
- Use • or - for bullet points
- Include **Speech:** sections with natural narration
- Keep speech conversational and explanatory
- Make content visual-friendly (short, clear points)
- Ensure speech explains and expands on visual content

Return ONLY the Markdown content, no code blocks or explanations.`;

/**
 * Generate presentation content from user prompt
 * @param prompt - User's presentation topic
 * @param model - OpenRouter model to use
 * @returns Promise with structured presentation content and original markdown
 */
export async function generatePresentationContent(
  prompt: string,
  model: string = 'qwen/qwen-2.5-72b-instruct'
): Promise<{ success: true; data: PresentationContent; originalMarkdown: string } | { success: false; error: OpenRouterError }> {
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

    // If the requested model fails, try with a fallback
    if ('error' in response) {
      console.warn(`⚠️ Model ${model} failed, trying fallback model...`);
      
      const fallbackModel = 'qwen/qwen-2.5-72b-instruct';
      if (model !== fallbackModel) {
        response = await generateContent(
          userPrompt,
          CONTENT_GENERATION_PROMPT,
          fallbackModel
        );
      }
      
      // If fallback also fails, return the error
      if ('error' in response) {
        return { success: false, error: response };
      }
    }

    // Store the original markdown content
    const originalMarkdown = response.content;
    
    const presentationData = parseContentResponse(response.content);
    
    if (!presentationData) {
      return {
        success: false,
        error: {
          error: 'Failed to parse AI response',
          code: 'PARSE_ERROR',
          details: 'The AI response could not be parsed as valid presentation content'
        }
      };
    }

    return { 
      success: true, 
      data: presentationData,
      originalMarkdown: originalMarkdown
    };

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
          details: 'The AI streaming response could not be parsed as valid presentation content'
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
 * Parse AI response content into structured presentation data
 * @param content - Raw AI response content
 * @returns Parsed presentation content or null if parsing fails
 */
function parseContentResponse(content: string): PresentationContent | null {
  try {
    console.log('📝 Parsing Markdown response...');
    
    // Remove any markdown code blocks if present
    let markdownContent = content.trim();
    
    // Remove markdown code block markers if present
    if (markdownContent.startsWith('```markdown')) {
      markdownContent = markdownContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    } else if (markdownContent.startsWith('```')) {
      markdownContent = markdownContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Use the markdown parser
    const markdownParser = new MarkdownParser();
    const presentationData = markdownParser.parseMarkdownToPresentation(markdownContent);
    
    if (!presentationData) {
      throw new Error('Failed to parse Markdown content');
    }
    
    console.log(`📊 Parsed presentation: ${presentationData.title} (${presentationData.totalSlides} slides)`);
    
    return presentationData;

  } catch (error: unknown) {
    console.error('❌ Markdown parsing error:', error);
    console.log('📄 Raw content preview:', content.substring(0, 200) + '...');
    return null;
  }
}

function validatePresentationContent(data: Record<string, unknown>): PresentationContent {
  // This function is no longer needed for Markdown parsing but keeping for compatibility
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Invalid or missing title');
  }

  if (!Array.isArray(data.slides)) {
    throw new Error('Invalid or missing slides array');
  }

  const slides: PresentationSlide[] = data.slides.map((slide: any, index: number) => {
    if (!slide || typeof slide !== 'object') {
      throw new Error(`Invalid slide at index ${index}`);
    }

    return {
      id: slide.id || `slide-${index}`,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || '',
      elements: Array.isArray(slide.elements) ? slide.elements : []
    };
  });

  return {
    title: data.title,
    slides,
    totalSlides: slides.length
  };
}

export function createSamplePresentation(): PresentationContent {
  return {
    title: "Sample AI Presentation",
    slides: [
      {
        id: "slide-1",
        title: "Welcome",
        content: "Introduction to our topic",
        elements: [
          {
            id: "element-1",
            type: "title",
            content: "Sample AI Presentation",
            animation: "fade-in",
            delay: 1000,
            order: 1
          },
          {
            id: "element-2",
            type: "speech",
            content: "Welcome to our sample presentation. This demonstrates the AI-powered presentation generation system.",
            animation: "",
            delay: 0,
            order: 2
          }
        ]
      }
    ],
    totalSlides: 1
  };
} 