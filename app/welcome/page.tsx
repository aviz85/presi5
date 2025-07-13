import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-indigo-600">Presi5</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create stunning AI-powered presentations with voice narration in minutes
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Transform your ideas into professional presentations with our advanced AI technology. 
            Generate content, design slides, and add voice narration automatically.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started - Sign Up Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-indigo-600 font-semibold py-4 px-8 rounded-lg text-lg transition-colors border-2 border-indigo-600"
          >
            Already have an account? Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Content</h3>
            <p className="text-gray-600">
              Generate professional presentation content instantly using advanced AI models like GPT-4 and Claude.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Voice Narration</h3>
            <p className="text-gray-600">
              Automatic voice generation using Google's Gemini TTS with multiple voice options for engaging presentations.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick & Easy</h3>
            <p className="text-gray-600">
              Create complete presentations in minutes, not hours. Just describe your topic and let AI do the work.
            </p>
          </div>
        </div>

        {/* Free Credits */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-lg max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Free Today</h3>
          <p className="text-lg text-gray-600 mb-6">
            New users get <span className="font-semibold text-indigo-600">10 free credits</span> to create presentations
          </p>
          <p className="text-sm text-gray-500">
            Each presentation costs 1 credit. No subscription required.
          </p>
        </div>
      </div>
    </div>
  )
} 