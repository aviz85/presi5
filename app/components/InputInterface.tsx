'use client';

import { useState, useEffect } from 'react';

interface InputInterfaceProps {
  onGenerate: (prompt: string, model: string) => Promise<void>;
  isGenerating: boolean;
  error?: string;
  disabled?: boolean;
}

interface ModelOption {
  value: string;
  label: string;
}

export default function InputInterface({ onGenerate, isGenerating, error, disabled = false }: InputInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [deepResearch, setDeepResearch] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3-8b:free');
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/models?free=true&format=select');
      const data = await response.json();
      
      if (data.success) {
        setAvailableModels(data.data);
      } else {
        // Fallback to default models
        setAvailableModels([
          { value: 'qwen/qwen3-8b:free', label: 'Qwen3 8B (Free)' },
          { value: 'qwen/qwen3-4b:free', label: 'Qwen3 4B (Free)' },
          { value: 'qwen/qwen3-14b:free', label: 'Qwen3 14B (Free)' },
          { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1 (Free)' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([
        { value: 'qwen/qwen3-8b:free', label: 'Qwen3 8B (Free)' },
        { value: 'qwen/qwen3-4b:free', label: 'Qwen3 4B (Free)' }
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim(), selectedModel);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Presi5 - AI Presentation Generator
        </h1>
        <p className="text-gray-600">
          Transform your ideas into engaging presentations with AI-powered content generation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Input Area */}
        <div className="space-y-2">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to present? (e.g., &quot;Machine Learning in Healthcare&quot;)
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe your presentation topic in detail. For example: &quot;The impact of artificial intelligence on modern healthcare, including benefits, challenges, and future prospects&quot;"
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
            disabled={isGenerating}
            maxLength={1000}
          />
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Be specific and detailed for better results</span>
            <span>{prompt.length}/1000</span>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label 
            htmlFor="model" 
            className="block text-sm font-medium text-gray-700"
          >
            AI Model
          </label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isGenerating || loadingModels}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            {loadingModels ? (
              <option value="">Loading models...</option>
            ) : (
              availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))
            )}
          </select>
          <div className="text-xs text-gray-500">
            {loadingModels ? 'Loading available models...' : `${availableModels.length} free models available`}
          </div>
        </div>

        {/* Deep Research Toggle (Disabled) */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="checkbox"
              id="deepResearch"
              checked={deepResearch}
              onChange={(e) => setDeepResearch(e.target.checked)}
              disabled={true}
              className="sr-only"
            />
            <div className="w-5 h-5 bg-gray-200 border border-gray-300 rounded flex items-center justify-center opacity-50 cursor-not-allowed">
              {deepResearch && (
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <label 
            htmlFor="deepResearch" 
            className="text-sm text-gray-400 cursor-not-allowed select-none"
          >
            Deep Research (Coming Soon)
          </label>
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Future Feature
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating || disabled}
                          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                !prompt.trim() || isGenerating || disabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Presentation...</span>
              </div>
            ) : (
              'Generate Presentation'
            )}
          </button>
        </div>
      </form>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Enter a detailed description of your presentation topic</li>
          <li>2. Click &quot;Generate Presentation&quot; to create AI-powered content</li>
          <li>3. Watch as your presentation is built with animations and narration</li>
          <li>4. Navigate through slides with automatic progression</li>
        </ol>
      </div>
    </div>
  );
} 