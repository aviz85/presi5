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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const htmlConverter = new HTMLConverterService();

  useEffect(() => {
    // Convert presentation to HTML format
    const converted = htmlConverter.convertToHTML(presentationData);
    setHtmlPresentation(converted);
    
    // Extract speech content for audio generation
    const speech = htmlConverter.extractSpeechContent(converted);
    setSpeechContent(speech);
  }, [presentationData]);

  const playAudio = async (slideIndex: number) => {
    if (!audioFiles || audioFiles.length === 0) return;
    
    setIsAudioLoading(true);
    
    try {
      const audioFile = audioFiles[slideIndex];
      if (!audioFile) return;
      
      if (audioRef.current) {
        audioRef.current.src = audioFile.audioUrl;
        audioRef.current.play();
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
    
    // Start with first slide's audio
    await playAudio(0);
  };

  const stopPresentation = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleAudioEnded = () => {
    if (isPlaying) {
      // Move to next slide or stop if at the end
      if (currentSlide < presentationData.slides.length - 1) {
        const nextSlideIndex = currentSlide + 1;
        setCurrentSlide(nextSlideIndex);
        
        // Play next slide's audio
        playAudio(nextSlideIndex);
      } else {
        setIsPlaying(false);
      }
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
            {currentSlideData.elements.map((element: any, index: number) => {
              const isVisible = !isPlaying || index <= currentElement;
              
              return (
                <div
                  key={element.id}
                  className={`mb-6 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
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