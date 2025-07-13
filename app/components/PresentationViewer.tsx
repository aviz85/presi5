'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PresentationContent } from '../services/content-generator';
import HTMLConverterService from '../services/html-converter';

interface PresentationViewerProps {
  presentationData: PresentationContent;
  onClose: () => void;
  audioFiles?: any[];
  presentationId?: string;
}

export default function PresentationViewer({ presentationData, onClose, audioFiles = [], presentationId }: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentElement, setCurrentElement] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [htmlPresentation, setHtmlPresentation] = useState<any>(null);
  const [speechContent, setSpeechContent] = useState<any[]>([]);
  const [allElements, setAllElements] = useState<any[]>([]);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const htmlConverter = new HTMLConverterService();

  useEffect(() => {
    // Convert presentation to HTML format
    const converted = htmlConverter.convertToHTML(presentationData);
    setHtmlPresentation(converted);
    
    // Extract speech content for audio generation
    const speech = htmlConverter.extractSpeechContent(converted);
    setSpeechContent(speech);

    // Create a combined list of all elements (visual + speech) for sequential display
    const combinedElements: any[] = [];
    converted.slides.forEach((slide: any) => {
      // Combine visual and speech elements, sort by order
      const slideElements = [
        ...slide.elements.map((el: any) => ({ ...el, slideId: slide.id, elementType: 'visual' })),
        ...slide.speechElements.map((el: any) => ({ ...el, slideId: slide.id, elementType: 'speech' }))
      ].sort((a, b) => a.order - b.order);
      
      combinedElements.push(...slideElements);
    });
    
    setAllElements(combinedElements);
  }, [presentationData]);

  const playAudioForElement = async (elementId: string) => {
    if (!audioFiles || audioFiles.length === 0) return;
    
    setIsAudioLoading(true);
    
    try {
      const audioFile = audioFiles.find(file => file.elementId === elementId);
      if (!audioFile) {
        setIsAudioLoading(false);
        return;
      }
      
      if (audioRef.current) {
        audioRef.current.src = audioFile.audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < presentationData.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setCurrentElement(0);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setCurrentElement(0);
    }
  };

  const startPresentation = async () => {
    setIsPlaying(true);
    setCurrentSlide(0);
    setCurrentElement(0);
    setCurrentElementIndex(0);
    
    // The useEffect will handle starting with the first element
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Effect to handle element progression
  useEffect(() => {
    if (isPlaying && currentElementIndex < allElements.length) {
      const currentEl = allElements[currentElementIndex];
      if (currentEl) {
        // Update current slide based on element's slide
        const slideIndex = htmlPresentation?.slides.findIndex((slide: any) => slide.id === currentEl.slideId);
        if (slideIndex !== -1 && slideIndex !== currentSlide) {
          setCurrentSlide(slideIndex);
        }

        if (currentEl.elementType === 'visual') {
          // For visual elements, automatically move to next after delay
          const timer = setTimeout(() => {
            setCurrentElementIndex(prev => prev + 1);
          }, 2000); // 2 seconds delay for visual elements
          return () => clearTimeout(timer);
        } else if (currentEl.elementType === 'speech') {
          // For speech elements, play audio (audio end will trigger next element)
          playAudioForElement(currentEl.id);
        }
      }
    } else if (isPlaying && currentElementIndex >= allElements.length) {
      // End of presentation
      setIsPlaying(false);
    }
  }, [currentElementIndex, isPlaying, allElements, htmlPresentation, currentSlide]);

  const handleAudioEnded = () => {
    if (isPlaying) {
      // Move to next element after audio ends
      setTimeout(() => {
        if (isPlaying) {
          setCurrentElementIndex(prev => prev + 1);
        }
      }, 500); // Small delay between elements
    }
  };

  if (!htmlPresentation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing presentation...</p>
        </div>
      </div>
    );
  }

  const currentSlideData = htmlPresentation.slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col z-50">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
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
              .filter(el => el.elementType === 'visual' && el.slideId === htmlPresentation?.slides[currentSlide]?.id) // Only show visual elements from current slide
              .map((element: any, index: number) => {
                // Check if this element should be visible based on current progress
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