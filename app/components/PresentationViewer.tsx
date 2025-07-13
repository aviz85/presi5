'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PresentationContent } from '../services/content-generator';
import HTMLConverterService from '../services/html-converter';

interface AudioFile {
  slideId: string;
  elementId?: string;
  elementOrder?: number;
  audioPath: string;
  audioUrl: string;
  duration?: number;
}

interface PresentationViewerProps {
  content: PresentationContent;
  onBack: () => void;
  audioFiles?: AudioFile[];
}

interface CombinedElement {
  id: string;
  slideId: string;
  elementType: 'visual' | 'speech';
  type: string;
  content: string;
  animationClass: string;
  animationDelay: number;
  order: number;
}

interface HTMLSlide {
  id: string;
  title: string;
  elements: HTMLElement[];
  speechElements: HTMLElement[];
}

interface HTMLElement {
  id: string;
  type: 'title' | 'subtitle' | 'content' | 'bullet-list' | 'bullet-point';
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

export default function PresentationViewer({ content, onBack, audioFiles = [] }: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentElementIndex, setCurrentElementIndex] = useState(-1);
  const [allElements, setAllElements] = useState<CombinedElement[]>([]);
  const [htmlPresentation, setHtmlPresentation] = useState<HTMLPresentation | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Convert presentation to HTML format
  useEffect(() => {
    const htmlConverter = new HTMLConverterService();
    const converted = htmlConverter.convertToHTML(content);
    setHtmlPresentation(converted);

    // Create combined array of all elements (visual + speech) sorted by order
    const combined: CombinedElement[] = [];
    
    converted.slides.forEach((slide: HTMLSlide) => {
      // Add visual elements
      slide.elements.forEach((element: HTMLElement) => {
        combined.push({
          id: element.id,
          slideId: slide.id,
          elementType: 'visual',
          type: element.type,
          content: element.content,
          animationClass: `animate-${element.animationClass}`,
          animationDelay: element.animationDelay,
          order: element.order
        });
      });

      // Add speech elements
      slide.speechElements.forEach((speechElement: HTMLElement) => {
        combined.push({
          id: speechElement.id,
          slideId: slide.id,
          elementType: 'speech',
          type: speechElement.type,
          content: speechElement.content,
          animationClass: '',
          animationDelay: 0,
          order: speechElement.order
        });
      });
    });

    // Sort by order
    combined.sort((a, b) => a.order - b.order);
    setAllElements(combined);
  }, [content]);

  // Handle element progression during presentation
  useEffect(() => {
    if (!isPlaying || currentElementIndex === -1 || currentElementIndex >= allElements.length) {
      return;
    }

    const currentElement = allElements[currentElementIndex];
    
    // Switch to the slide that contains this element
    if (htmlPresentation) {
      const slideIndex = htmlPresentation.slides.findIndex((slide: HTMLSlide) => slide.id === currentElement.slideId);
      if (slideIndex !== -1 && slideIndex !== currentSlide) {
        setCurrentSlide(slideIndex);
      }
    }

    if (currentElement.elementType === 'visual') {
      // For visual elements, wait for animation delay + 2 seconds, then move to next
      const delay = currentElement.animationDelay + 2000;
      const timer = setTimeout(() => {
        setCurrentElementIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (currentElement.elementType === 'speech') {
      // For speech elements, play audio immediately
      const playAudio = async (elementId: string) => {
        if (!audioRef.current) return;

        setIsAudioLoading(true);
        try {
          const audioFile = audioFiles.find(file => file.elementId === elementId);
          if (audioFile && audioFile.audioUrl) {
            audioRef.current.src = audioFile.audioUrl;
            await audioRef.current.play();
          }
        } catch (error) {
          console.error('Error playing audio:', error);
        } finally {
          setIsAudioLoading(false);
        }
      };
      
      playAudio(currentElement.id);
    }
  }, [currentElementIndex, isPlaying, allElements, currentSlide, htmlPresentation, audioFiles]);

  const nextSlide = () => {
    if (currentSlide < (htmlPresentation?.slides.length || 0) - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const startPresentation = async () => {
    setIsPlaying(true);
    setCurrentElementIndex(0);
    setCurrentSlide(0);
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    setCurrentElementIndex(-1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleAudioEnded = () => {
    // Move to next element when audio ends
    setCurrentElementIndex(prev => prev + 1);
  };

  if (!htmlPresentation) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center z-50">
        <div className="text-white text-xl">
          Loading presentation...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col z-50">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
          <h1 className="text-white text-xl font-bold">
            {htmlPresentation.title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-white">
            {currentSlide + 1} / {htmlPresentation.slides.length}
          </span>
          
          {!isPlaying ? (
            <button
              onClick={startPresentation}
              disabled={isAudioLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isAudioLoading ? 'Loading...' : '▶️ Play'}
            </button>
          ) : (
            <button
              onClick={stopPresentation}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              ⏸️ Pause
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl h-full bg-white rounded-lg shadow-2xl p-12 overflow-hidden">
          <div className="h-full flex flex-col justify-center">
            {allElements
              .filter(el => el.elementType === 'visual' && el.slideId === htmlPresentation?.slides[currentSlide]?.id)
              .map((element) => {
                const elementGlobalIndex = allElements.findIndex(el => el.id === element.id);
                const isVisible = !isPlaying || elementGlobalIndex <= currentElementIndex;
                
                return (
                  <div
                    key={element.id}
                    className={`mb-6 transition-all duration-500 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    } ${element.animationClass}`}
                    style={{
                      animationDelay: isPlaying ? `${element.animationDelay}ms` : '0ms'
                    }}
                  >
                    {element.type === 'title' && (
                      <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
                        {element.content}
                      </h1>
                    )}
                    
                    {element.type === 'subtitle' && (
                      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                        {element.content}
                      </h2>
                    )}
                    
                    {element.type === 'content' && (
                      <p className="text-lg text-gray-600 leading-relaxed mb-4">
                        {element.content}
                      </p>
                    )}
                    
                    {element.type === 'bullet-point' && (
                      <div className="text-lg text-gray-600 mb-4 pl-4">
                        <p className="flex items-start">
                          <span className="text-blue-600 font-bold mr-3 mt-1">•</span>
                          <span>{element.content.replace(/^[•·-]\s*/, '')}</span>
                        </p>
                      </div>
                    )}
                    
                    {element.type === 'bullet-list' && (
                      <div 
                        className="text-lg text-gray-600 mb-4"
                        dangerouslySetInnerHTML={{ __html: element.content }}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-20">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ❮ Previous
        </button>
        
        <div className="flex-1 mx-8">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / htmlPresentation.slides.length) * 100}%` }}
            />
          </div>
        </div>
        
        <button
          onClick={nextSlide}
          disabled={currentSlide === htmlPresentation.slides.length - 1}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next ❯
        </button>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        preload="none"
        hidden
      />
    </div>
  );
} 