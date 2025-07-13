'use client';

import { useState } from 'react';
import InputInterface from './components/InputInterface';
import PresentationViewer from './components/PresentationViewer';
import { PresentationContent } from './services/content-generator';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [presentationData, setPresentationData] = useState<PresentationContent | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const handleGenerate = async (prompt: string, model: string) => {
    setIsGenerating(true);
    setError('');
    setPresentationData(null);

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          streaming: false
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate presentation');
      }

      if (data.success) {
        setPresentationData(data.data);
      } else {
        throw new Error(data.error || 'Generation failed');
      }

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred while generating the presentation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
        {!presentationData ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <InputInterface
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              error={error}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="max-w-4xl mx-auto p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 text-sm">
                  Presentation &quot;{presentationData.title}&quot; generated successfully! ({presentationData.totalSlides} slides)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="max-w-4xl mx-auto flex justify-center space-x-4">
              <button
                onClick={() => setShowViewer(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🎥 View Presentation
              </button>
              <button
                onClick={() => {
                  setPresentationData(null);
                  setError('');
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                ↩️ Create New
              </button>
            </div>

            {/* Presentation Preview */}
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {presentationData.title}
                </h2>
                <p className="text-gray-600">
                  {presentationData.totalSlides} slides generated
                </p>
              </div>

              {/* Slides Preview */}
              <div className="space-y-4">
                {presentationData.slides.map((slide, index) => (
                  <div key={slide.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Slide {index + 1}: {slide.title}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {slide.elements.length} elements
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {slide.elements.map((element) => (
                        <div key={element.id} className="flex items-start space-x-3 text-sm">
                          <span className="inline-block w-16 text-gray-500 font-mono">
                            {element.type}
                          </span>
                          <span className="flex-1 text-gray-700">
                            {element.type === 'bullet-list' ? (
                              <div dangerouslySetInnerHTML={{ __html: element.content }} />
                            ) : (
                              element.content
                            )}
                          </span>
                          <span className="text-xs text-gray-400">
                            {element.animation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setPresentationData(null);
                    setError('');
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Generate New Presentation
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={true}
                >
                  Start Presentation (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Presentation Viewer Modal */}
    {showViewer && presentationData && (
      <PresentationViewer
        presentationData={presentationData}
        onClose={() => setShowViewer(false)}
      />
    )}
  </>
  );
}
