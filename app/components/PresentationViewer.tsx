'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  autoStart?: boolean;
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

interface SlideElements {
  slideId: string;
  slideIndex: number;
  elements: CombinedElement[];
}

export default function PresentationViewer({ content, onBack, audioFiles = [], autoStart = false }: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentSlideElementIndex, setCurrentSlideElementIndex] = useState(-1);
  const [slideElements, setSlideElements] = useState<SlideElements[]>([]);
  const [htmlPresentation, setHtmlPresentation] = useState<HTMLPresentation | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  // Auto-start presentation if autoStart prop is true
  useEffect(() => {
    if (autoStart && htmlPresentation && !isPlaying) {
      console.log('🚀 Auto-starting presentation...');
      startPresentation();
    }
  }, [autoStart, htmlPresentation, isPlaying, startPresentation]);

  // Convert presentation to HTML format and organize elements by slide
  useEffect(() => {
    const htmlConverter = new HTMLConverterService();
    const converted = htmlConverter.convertToHTML(content);
    setHtmlPresentation(converted);

    // Group elements by slide and maintain order within each slide
    const slideElementsArray: SlideElements[] = [];
    
    converted.slides.forEach((slide: HTMLSlide, slideIndex: number) => {
      const slideElementsCombined: CombinedElement[] = [];
      
      // Add visual elements
      slide.elements.forEach((element: HTMLElement) => {
        slideElementsCombined.push({
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
        slideElementsCombined.push({
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

      // Sort elements within this slide by order
      slideElementsCombined.sort((a, b) => a.order - b.order);
      
      slideElementsArray.push({
        slideId: slide.id,
        slideIndex: slideIndex,
        elements: slideElementsCombined
      });
    });

    setSlideElements(slideElementsArray);
  }, [content]);

  // Handle element progression during presentation - now slide-aware
  useEffect(() => {
    let visualTimer: NodeJS.Timeout | null = null;
    let audioEventListeners: (() => void)[] = [];
    let audioTimeouts: NodeJS.Timeout[] = [];

    if (!isPlaying || currentSlide === -1 || currentSlideElementIndex === -1 || slideElements.length === 0) {
      return () => {
        // Cleanup function always returned
        if (visualTimer) {
          clearTimeout(visualTimer);
        }
        audioEventListeners.forEach(cleanup => cleanup());
        audioTimeouts.forEach(timeout => clearTimeout(timeout));
      };
    }

    const currentSlideData = slideElements[currentSlide];
    if (!currentSlideData || currentSlideElementIndex >= currentSlideData.elements.length) {
      // All elements in current slide are done, move to next slide
      if (currentSlide < slideElements.length - 1) {
        console.log(`🎬 All elements in slide ${currentSlide} completed, moving to slide ${currentSlide + 1}`);
        setCurrentSlide(prev => prev + 1);
        setCurrentSlideElementIndex(0);
        setVisibleElements(new Set()); // Clear visible elements for new slide
      } else {
        console.log('🎉 Presentation completed!');
        stopPresentation();
      }
      return () => {
        // Cleanup function always returned
        if (visualTimer) {
          clearTimeout(visualTimer);
        }
        audioEventListeners.forEach(cleanup => cleanup());
        audioTimeouts.forEach(timeout => clearTimeout(timeout));
      };
    }

    const currentElement = currentSlideData.elements[currentSlideElementIndex];
    console.log(`🎯 Processing element ${currentSlideElementIndex + 1}/${currentSlideData.elements.length} in slide ${currentSlide + 1}: ${currentElement.id} (${currentElement.elementType})`);

    if (currentElement.elementType === 'visual') {
      // Show the visual element immediately
      console.log(`👁️ Showing visual element: ${currentElement.id}`);
      setVisibleElements(prev => new Set(prev).add(currentElement.id));
      
      // Wait for animation to complete, then move to next element
      const animationDuration = 800; // Standard animation duration
      console.log(`⏱️ Starting ${animationDuration}ms timer for visual element ${currentElement.id}`);
      
      visualTimer = setTimeout(() => {
        console.log(`⏰ Animation timer finished for ${currentElement.id}, moving to next element`);
        setCurrentSlideElementIndex(prev => {
          const nextIndex = prev + 1;
          console.log(`➡️ Visual element timer: moving from element ${prev} to ${nextIndex} in slide ${currentSlide + 1}`);
          return nextIndex;
        });
      }, animationDuration);
      
    } else if (currentElement.elementType === 'speech') {
      // For speech elements, play audio immediately
      const playAudio = async () => {
        if (!audioRef.current) {
          console.log('⚠️ No audio element available, continuing...');
          const timeout = setTimeout(() => {
            setCurrentSlideElementIndex(prev => prev + 1);
          }, 1000);
          audioTimeouts.push(timeout);
          return;
        }

        setIsAudioLoading(true);
        try {
          // Find audio file by element ID or by order
          const audioFile = audioFiles.find(file => 
            file.elementId === currentElement.id || 
            file.elementOrder === currentElement.order
          );
          
          if (audioFile && audioFile.audioUrl) {
            console.log(`🔊 Playing audio for element ${currentElement.id}: ${audioFile.audioUrl}`);
            
            // Reset audio element
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = audioFile.audioUrl;
            
            // Add event listeners for debugging with proper cleanup tracking
            const onLoadStart = () => console.log(`📥 Audio loading started for ${currentElement.id}`);
            const onCanPlay = () => console.log(`✅ Audio can play for ${currentElement.id}`);
            const onPlay = () => console.log(`▶️ Audio started playing for ${currentElement.id}`);
            const onError = (e: ErrorEvent) => {
              console.error(`❌ Audio error for ${currentElement.id}:`, e);
              // Continue to next element on error
              const timeout = setTimeout(() => {
                setCurrentSlideElementIndex(prev => prev + 1);
              }, 500);
              audioTimeouts.push(timeout);
            };
            
            audioRef.current.addEventListener('loadstart', onLoadStart);
            audioRef.current.addEventListener('canplay', onCanPlay);
            audioRef.current.addEventListener('play', onPlay);
            audioRef.current.addEventListener('error', onError);
            
            // Store cleanup functions for proper removal
            audioEventListeners.push(() => {
              if (audioRef.current) {
                audioRef.current.removeEventListener('loadstart', onLoadStart);
                audioRef.current.removeEventListener('canplay', onCanPlay);
                audioRef.current.removeEventListener('play', onPlay);
                audioRef.current.removeEventListener('error', onError);
              }
            });
            
            // Try to play the audio
            await audioRef.current.play();
            
            // Enhanced fallback timer logic with better duration detection
            let fallbackDuration = 15000; // Default 15 seconds for safety
            
            // First, try to get duration from database
            if (audioFile.duration && audioFile.duration > 0) {
              fallbackDuration = Math.max(audioFile.duration * 1000 + 3000, 15000); // DB duration + 3s buffer, min 15s
              console.log(`📊 Using database duration: ${audioFile.duration}s + 3s buffer = ${fallbackDuration}ms`);
            } else {
              // If no database duration, try to get it from the audio element itself
              const checkAudioDuration = () => {
                if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                  const detectedDuration = audioRef.current.duration * 1000 + 3000; // Detected duration + 3s buffer
                  fallbackDuration = Math.max(detectedDuration, 15000); // Minimum 15 seconds
                  console.log(`🎵 Detected audio duration: ${audioRef.current.duration}s + 3s buffer = ${fallbackDuration}ms`);
                } else {
                  console.log(`⚠️ Could not detect audio duration for ${currentElement.id}, using ${fallbackDuration}ms fallback`);
                }
              };
              
              // Check duration immediately
              checkAudioDuration();
              
              // Also check after a short delay in case duration loads later
              const timeout1 = setTimeout(checkAudioDuration, 500);
              const timeout2 = setTimeout(checkAudioDuration, 1000);
              audioTimeouts.push(timeout1, timeout2);
            }
            
            console.log(`⏱️ Setting fallback timer for ${fallbackDuration}ms for element ${currentElement.id}`);
            fallbackTimerRef.current = setTimeout(() => {
              console.log(`⏰ Fallback timer triggered for audio element ${currentElement.id} after ${fallbackDuration}ms`);
              setCurrentSlideElementIndex(prev => prev + 1);
            }, fallbackDuration);
            
            // Audio will end and trigger handleAudioEnded
          } else {
            console.log(`⚠️ No audio found for element ${currentElement.id}, continuing...`);
            // No audio available, continue after a short pause
            const timeout = setTimeout(() => {
              setCurrentSlideElementIndex(prev => prev + 1);
            }, 1500);
            audioTimeouts.push(timeout);
          }
        } catch (error) {
          console.error('Error playing audio:', error);
          // Continue even if audio fails
          const timeout = setTimeout(() => {
            setCurrentSlideElementIndex(prev => prev + 1);
          }, 1000);
          audioTimeouts.push(timeout);
        } finally {
          setIsAudioLoading(false);
        }
      };
      
      playAudio();
    }

    // Cleanup function always returned
    return () => {
      console.log(`🧹 Cleaning up timers and listeners for element ${currentElement?.id || 'unknown'}`);
      if (visualTimer) {
        clearTimeout(visualTimer);
      }
      // Also clean up fallback timer if it exists
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      audioEventListeners.forEach(cleanup => cleanup());
      audioTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [currentSlideElementIndex, currentSlide, isPlaying, slideElements, audioFiles, stopPresentation]);

  const nextSlide = () => {
    if (currentSlide < (htmlPresentation?.slides.length || 0) - 1) {
      setCurrentSlide(currentSlide + 1);
      setVisibleElements(new Set()); // Clear visible elements for new slide
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setVisibleElements(new Set()); // Clear visible elements for new slide
    }
  };

  const startPresentation = useCallback(async () => {
    setIsPlaying(true);
    setCurrentSlide(0);
    setCurrentSlideElementIndex(0);
    setVisibleElements(new Set());
  }, []);

  const stopPresentation = useCallback(() => {
    setIsPlaying(false);
    setCurrentSlideElementIndex(-1);
    setVisibleElements(new Set());
    
    // Clear fallback timer
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleAudioEnded = () => {
    console.log('🎵 Audio ended, moving to next element in current slide');
    const currentSlideData = slideElements[currentSlide];
    console.log(`📊 Current slide element index: ${currentSlideElementIndex}, Total elements in slide: ${currentSlideData?.elements.length || 0}`);
    
    // Clear fallback timer since audio ended properly
    if (fallbackTimerRef.current) {
      console.log('🧹 Clearing fallback timer - audio ended naturally');
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    
    // Move to next element in current slide
    setCurrentSlideElementIndex(prev => {
      const nextIndex = prev + 1;
      console.log(`➡️ Moving from element ${prev} to ${nextIndex} in slide ${currentSlide + 1}`);
      return nextIndex;
    });
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

  // Calculate total elements and current position for progress display
  const totalElements = slideElements.reduce((total, slide) => total + slide.elements.length, 0);
  const currentElementPosition = slideElements.slice(0, currentSlide).reduce((total, slide) => total + slide.elements.length, 0) + Math.max(0, currentSlideElementIndex);

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
            Slide {currentSlide + 1} / {htmlPresentation.slides.length}
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
          
          {isPlaying && slideElements[currentSlide] && (
            <div className="text-white text-sm">
              Element: {currentSlideElementIndex + 1} / {slideElements[currentSlide].elements.length} (Total: {currentElementPosition + 1} / {totalElements})
            </div>
          )}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl h-full bg-white rounded-lg shadow-2xl p-12 overflow-hidden">
          <div className="h-full flex flex-col justify-center">
            {slideElements[currentSlide]?.elements
              .filter(el => el.elementType === 'visual')
              .map((element) => {
                const isVisible = !isPlaying || visibleElements.has(element.id);
                
                return (
                  <div
                    key={element.id}
                    className={`mb-6 transition-all duration-800 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    } ${isVisible ? element.animationClass : ''}`}
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