# Presi5 - AI-Powered Presentation Generator

## Project Overview

Presi5 is a Next.js application that generates dynamic presentations from user prompts using AI language models. The application transforms text descriptions into fully animated HTML presentations with synchronized audio narration.

## Core Features

### 1. User Input Interface
- **Text Input Field**: Main textarea for users to describe their presentation topic
- **Deep Research Toggle**: Disabled checkbox for future feature (deep research before content generation)
- **Generate Button**: Triggers the presentation generation process

### 2. Content Generation Pipeline
- **AI Integration**: Uses OpenRouter API to access various language models
- **Two-Stage Process**:
  - Stage 1: Generate structured markdown content from user prompt
  - Stage 2: Convert markdown to HTML presentation format

### 3. Presentation Structure
- **Card-Based Layout**: Each slide is an HTML card with various elements
- **Element Types**:
  - Headers (h1, h2, h3)
  - Bullet points
  - Paragraphs
  - Graphics placeholders
  - Background colors/images

### 4. Animation System
- **5 Predefined Animations**: CSS-based entrance animations
- **Element-Level Animation**: Each element gets assigned animation class
- **Timing Control**: Delay parameters for each element
- **Sequential Display**: Elements appear in order with their respective animations

### 5. Audio Narration
- **Hidden Speech Elements**: Invisible elements between visual content
- **Text-to-Speech Integration**: Converts text to audio
- **Synchronized Playback**: Audio plays during element's turn in sequence
- **Automatic Progression**: Next element appears after audio completion

### 6. Presentation Playback
- **JavaScript Controller**: Manages slide progression and element display
- **Sequential Rendering**: Elements appear one by one with animations
- **Audio Synchronization**: Waits for audio completion before proceeding
- **Slide Transitions**: Automatic progression between slides

## Technical Architecture

### Frontend (Next.js with Tailwind v4)
- **Framework**: Next.js 15.3.5 with App Router
- **Styling**: Tailwind CSS v4 with PostCSS
- **TypeScript**: Full TypeScript support
- **Components**:
  - Input interface
  - Presentation viewer
  - Animation engine
  - Audio controller

### Backend API Routes
- **Content Generation**: `/api/generate-content`
- **HTML Conversion**: `/api/convert-to-html`
- **Audio Generation**: `/api/generate-audio`

### AI Integration
- **Provider**: OpenRouter API
- **Models**: Configurable LLM selection
- **Prompts**: Template-based prompt engineering
- **Content Structure**: Markdown to HTML conversion

### Animation System
- **CSS Classes**: 5 predefined animation classes
- **JavaScript Engine**: Controls timing and sequence
- **Element Attributes**: Delay and animation type parameters

## Implementation Plan

### Phase 1: Core Infrastructure
1. Set up OpenRouter API integration
2. Create content generation service
3. Implement markdown parsing
4. Build basic UI components

### Phase 2: Presentation Engine
1. Design HTML slide structure
2. Create CSS animation classes
3. Build JavaScript playback controller
4. Implement element sequencing

### Phase 3: Audio Integration
1. Text-to-speech service integration
2. Audio synchronization system
3. Callback-based progression
4. Audio element management

### Phase 4: Streaming & Optimization
1. Implement streaming responses
2. Real-time slide rendering
3. Progressive presentation loading
4. Performance optimization

## File Structure

```
presi5/
├── app/
│   ├── api/
│   │   ├── generate-content/
│   │   ├── convert-to-html/
│   │   └── generate-audio/
│   ├── components/
│   │   ├── PresentationViewer/
│   │   ├── InputInterface/
│   │   └── AnimationEngine/
│   ├── services/
│   │   ├── openrouter.ts
│   │   ├── content-generator.ts
│   │   └── html-converter.ts
│   ├── styles/
│   │   ├── animations.css
│   │   └── presentation.css
│   └── utils/
├── docs/
└── public/
```

## Key Technologies

### Current Stack
- **Next.js**: 15.3.5 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Tailwind CSS**: 4.x (with PostCSS)
- **ESLint**: 9.x

### Additional Dependencies
- **OpenRouter SDK**: For AI model integration
- **Markdown Parser**: For content structure
- **Audio API**: Web Speech API or external TTS service
- **Animation Library**: CSS-based animations

## Environment Variables

```env
OPENROUTER_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Workflow

1. **Content Generation**: User inputs prompt → AI generates markdown
2. **HTML Conversion**: Markdown → Structured HTML with animation classes
3. **Presentation Rendering**: HTML renders with hidden elements
4. **Playback Control**: JavaScript manages element sequence and audio
5. **Streaming Support**: Elements appear as they're generated

## Future Enhancements

- **Deep Research**: AI-powered topic research before content generation
- **Theme System**: Multiple presentation themes and styles
- **Export Options**: PDF, PowerPoint, and video export
- **Collaboration**: Multi-user editing and sharing
- **Analytics**: Presentation performance tracking

## Success Metrics

- **Generation Speed**: Time from prompt to viewable presentation
- **Content Quality**: Relevance and structure of generated content
- **Animation Smoothness**: Seamless element transitions
- **Audio Sync**: Perfect timing between audio and visual elements
- **User Experience**: Intuitive interface and workflow

## Technical Considerations

### Performance
- **Streaming**: Real-time content generation and display
- **Caching**: Cache generated content and audio
- **Optimization**: Minimize bundle size and load times

### Accessibility
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard control support
- **Audio Controls**: Play/pause and speed controls

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Audio Support**: Web Speech API fallbacks
- **CSS Animations**: Hardware acceleration support

This specification provides a comprehensive roadmap for building the AI-powered presentation generator with all the features and technical requirements outlined in the original request. 