import { PresentationContent, PresentationSlide, SlideElement } from './content-generator';

interface HTMLSlide {
  id: string;
  title: string;
  elements: HTMLElement[];
  speechElements: HTMLElement[];
}

interface HTMLElement {
  id: string;
  type: 'title' | 'subtitle' | 'content' | 'bullet-list';
  content: string;
  animationClass: string;
  animationDelay: number;
  order: number;
}

interface HTMLPresentation {
  title: string;
  slides: HTMLSlide[];
  totalElements: number;
  estimatedDuration: number;
}

class HTMLConverterService {
  private animationClasses = [
    'fade-in',
    'slide-in-left',
    'slide-in-right',
    'scale-up',
    'bounce-in'
  ];

  convertToHTML(presentationContent: PresentationContent): HTMLPresentation {
    const htmlSlides: HTMLSlide[] = [];
    let totalElements = 0;
    let estimatedDuration = 0;

    presentationContent.slides.forEach((slide, slideIndex) => {
      const htmlSlide = this.convertSlide(slide, slideIndex);
      htmlSlides.push(htmlSlide);
      totalElements += htmlSlide.elements.length;
      
      // Estimate duration based on content length and speech elements
      const speechContent = htmlSlide.speechElements.map(el => el.content).join(' ');
      estimatedDuration += this.estimateReadingTime(speechContent);
    });

    return {
      title: presentationContent.title,
      slides: htmlSlides,
      totalElements,
      estimatedDuration
    };
  }

  private convertSlide(slide: PresentationSlide, slideIndex: number): HTMLSlide {
    const elements: HTMLElement[] = [];
    const speechElements: HTMLElement[] = [];

    slide.elements.forEach((element, elementIndex) => {
      if (element.type === 'speech') {
        speechElements.push({
          id: `slide-${slideIndex}-speech-${elementIndex}`,
          type: 'content',
          content: element.content,
          animationClass: '',
          animationDelay: 0,
          order: element.order
        });
      } else {
        elements.push({
          id: `slide-${slideIndex}-element-${elementIndex}`,
          type: element.type as 'title' | 'subtitle' | 'content' | 'bullet-list',
          content: this.formatContent(element),
          animationClass: element.animation,
          animationDelay: element.delay,
          order: element.order
        });
      }
    });

    // Sort elements by order
    elements.sort((a, b) => a.order - b.order);
    speechElements.sort((a, b) => a.order - b.order);

    return {
      id: `slide-${slideIndex}`,
      title: slide.title,
      elements,
      speechElements
    };
  }

  private formatContent(element: SlideElement): string {
    switch (element.type) {
      case 'bullet-list':
        if (Array.isArray(element.content)) {
          return element.content.map(item => `<li>${item}</li>`).join('');
        }
        return `<li>${element.content}</li>`;
      
      case 'title':
      case 'subtitle':
      case 'content':
        return typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
      
      default:
        return typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
    }
  }

  private estimateReadingTime(text: string): number {
    // Average reading speed: 200 words per minute
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.max(2, Math.ceil((words / wordsPerMinute) * 60)); // Minimum 2 seconds
  }

  generateSlideHTML(slide: HTMLSlide): string {
    const elementsHTML = slide.elements.map(element => {
      const tag = this.getHTMLTag(element.type);
      const className = `slide-element ${element.animationClass}`;
      const style = `animation-delay: ${element.animationDelay}ms; animation-fill-mode: both;`;
      
      if (element.type === 'bullet-list') {
        return `<ul class="${className}" style="${style}" data-order="${element.order}" data-element-id="${element.id}">
          ${element.content}
        </ul>`;
      }
      
      return `<${tag} class="${className}" style="${style}" data-order="${element.order}" data-element-id="${element.id}">
        ${element.content}
      </${tag}>`;
    }).join('\n');

    return `
      <div class="slide" id="${slide.id}" data-slide-title="${slide.title}">
        <div class="slide-content">
          ${elementsHTML}
        </div>
      </div>
    `;
  }

  private getHTMLTag(type: string): string {
    switch (type) {
      case 'title':
        return 'h1';
      case 'subtitle':
        return 'h2';
      case 'content':
        return 'p';
      case 'bullet-list':
        return 'ul';
      default:
        return 'div';
    }
  }

  generateFullPresentationHTML(htmlPresentation: HTMLPresentation): string {
    const slidesHTML = htmlPresentation.slides.map(slide => 
      this.generateSlideHTML(slide)
    ).join('\n');

    return `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${htmlPresentation.title}</title>
        <link rel="stylesheet" href="/styles/presentation.css">
        <link rel="stylesheet" href="/styles/animations.css">
      </head>
      <body>
        <div class="presentation-container">
          <div class="presentation-header">
            <h1 class="presentation-title">${htmlPresentation.title}</h1>
            <div class="presentation-controls">
              <button id="prev-btn" class="control-btn">❮</button>
              <span id="slide-counter">1 / ${htmlPresentation.slides.length}</span>
              <button id="next-btn" class="control-btn">❯</button>
              <button id="play-btn" class="control-btn">▶️</button>
              <button id="pause-btn" class="control-btn" style="display: none;">⏸️</button>
            </div>
          </div>
          
          <div class="presentation-content">
            ${slidesHTML}
          </div>
          
          <div class="presentation-footer">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>
        
        <script src="/scripts/presentation-controller.js"></script>
      </body>
      </html>
    `;
  }

  // Extract speech content for audio generation
  extractSpeechContent(htmlPresentation: HTMLPresentation): { slideId: string, speechText: string }[] {
    return htmlPresentation.slides.map(slide => ({
      slideId: slide.id,
      speechText: slide.speechElements.map(el => el.content).join(' ')
    }));
  }
}

export default HTMLConverterService; 