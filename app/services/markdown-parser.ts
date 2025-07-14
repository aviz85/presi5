// Define interfaces locally to avoid import issues
interface PresentationContent {
  title: string;
  slides: PresentationSlide[];
  totalSlides: number;
}

interface PresentationSlide {
  id: string;
  title: string;
  content: string;
  elements: SlideElement[];
}

interface SlideElement {
  id: string;
  type: 'title' | 'subtitle' | 'content' | 'bullet-list' | 'bullet-point' | 'speech';
  content: string;
  animation: string;
  delay: number;
  order: number;
}

interface MarkdownSlide {
  title: string;
  content: string[];
  speechNotes: string[];
}

export class MarkdownParser {
  
  parseMarkdownToPresentation(markdown: string): PresentationContent | null {
    try {
      console.log('📝 Parsing Markdown to presentation...');
      
      // Extract title from first # heading
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Presentation';
      
      // Split into slides by ## headings
      const slideBlocks = this.splitIntoSlides(markdown);
      
      if (slideBlocks.length === 0) {
        throw new Error('No slides found in markdown');
      }
      
      // Parse each slide
      const slides: PresentationSlide[] = [];
      
      for (let i = 0; i < slideBlocks.length; i++) {
        const slide = this.parseSlide(slideBlocks[i], i);
        if (slide) {
          slides.push(slide);
        }
      }
      
      if (slides.length === 0) {
        throw new Error('No valid slides parsed');
      }
      
      console.log(`✅ Parsed ${slides.length} slides from Markdown`);
      
      return {
        title,
        slides,
        totalSlides: slides.length
      };
      
    } catch (error) {
      console.error('❌ Markdown parsing error:', error);
      return null;
    }
  }
  
  private splitIntoSlides(markdown: string): string[] {
    // Remove the main title (first # heading)
    const withoutMainTitle = markdown.replace(/^#\s+.+$/m, '').trim();
    
    // Split by ## headings (slide titles)
    const slides = withoutMainTitle.split(/^##\s+/m).filter(block => block.trim());
    
    return slides;
  }
  
  private parseSlide(slideBlock: string, slideIndex: number): PresentationSlide | null {
    try {
      const lines = slideBlock.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) return null;
      
      // First line is the slide title
      const slideTitle = lines[0];
      const slideId = `slide-${slideIndex}`;
      
      // Parse content and speech sections
      const markdownSlide = this.parseSlideContent(lines.slice(1));
      
      // Generate slide elements
      const elements = this.generateSlideElements(slideId, slideTitle, markdownSlide);
      
      return {
        id: slideId,
        title: slideTitle,
        content: markdownSlide.content.join(' '),
        elements
      };
      
    } catch (error) {
      console.error(`❌ Error parsing slide ${slideIndex}:`, error);
      return null;
    }
  }
  
  private parseSlideContent(lines: string[]): MarkdownSlide {
    const content: string[] = [];
    const speechNotes: string[] = [];
    let currentSection: 'content' | 'speech' = 'content';
    
    for (const line of lines) {
      // Check for speech section marker
      if (line.toLowerCase().includes('**speech:**') || line.toLowerCase().includes('**narrator:**')) {
        currentSection = 'speech';
        // Extract speech content from the same line if present
        const speechMatch = line.match(/\*\*(?:speech|narrator):\*\*\s*(.+)/i);
        if (speechMatch && speechMatch[1]) {
          speechNotes.push(speechMatch[1]);
        }
        continue;
      }
      
      // Add to appropriate section
      if (currentSection === 'speech') {
        speechNotes.push(line);
      } else {
        content.push(line);
      }
    }
    
    return {
      title: '',
      content,
      speechNotes
    };
  }
  
  private generateSlideElements(slideId: string, slideTitle: string, markdownSlide: MarkdownSlide): SlideElement[] {
    const elements: SlideElement[] = [];
    let order = 1;
    
    // Add slide title (clean markdown formatting)
    const cleanTitle = slideTitle
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .trim();
    
    elements.push({
      id: `${slideId}-title`,
      type: 'title',
      content: cleanTitle,
      animation: 'fade-in',
      delay: 1000,
      order: order++
    });
    
    // Add speech for title (clean markdown formatting)
    const rawTitleSpeech = markdownSlide.speechNotes[0] || `Welcome to ${cleanTitle}`;
    const cleanTitleSpeech = rawTitleSpeech
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .trim();
    
    elements.push({
      id: `${slideId}-title-speech`,
      type: 'speech',
      content: cleanTitleSpeech,
      animation: '',
      delay: 0,
      order: order++
    });
    
    // Process content items
    for (let i = 0; i < markdownSlide.content.length; i++) {
      const contentLine = markdownSlide.content[i];
      
      if (!contentLine) continue;
      
      // Determine element type
      let elementType: SlideElement['type'] = 'content';
      let animation = 'slide-in-left';
      
      if (contentLine.startsWith('•') || contentLine.startsWith('-') || contentLine.startsWith('*')) {
        elementType = 'bullet-point';
        animation = 'scale-up';
      } else if (contentLine.startsWith('###')) {
        elementType = 'subtitle';
        animation = 'slide-in-right';
      }
      
      // Clean content
      const cleanContent = contentLine
        .replace(/^#{1,6}\s*/, '') // Remove markdown headers
        .replace(/^[•\-*]\s*/, '') // Remove bullet markers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting **text** -> text
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting *text* -> text
        .replace(/`(.*?)`/g, '$1') // Remove code formatting `text` -> text
        .trim();
      
      if (!cleanContent) continue;
      
      // Add visual element
      elements.push({
        id: `${slideId}-content-${i}`,
        type: elementType,
        content: cleanContent,
        animation,
        delay: 1000,
        order: order++
      });
      
      // Add corresponding speech (clean markdown formatting)
      const rawSpeechContent = markdownSlide.speechNotes[i + 1] || this.generateDefaultSpeech(cleanContent, elementType);
      const cleanSpeechContent = rawSpeechContent
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/`(.*?)`/g, '$1') // Remove code formatting
        .trim();
      
      elements.push({
        id: `${slideId}-speech-${i}`,
        type: 'speech',
        content: cleanSpeechContent,
        animation: '',
        delay: 0,
        order: order++
      });
    }
    
    return elements;
  }
  
  private generateDefaultSpeech(content: string, type: SlideElement['type']): string {
    switch (type) {
      case 'bullet-point':
        return `Let's examine this point: ${content}`;
      case 'subtitle':
        return `Now we'll focus on ${content}`;
      case 'content':
        return content;
      default:
        return content;
    }
  }
}

export default MarkdownParser; 