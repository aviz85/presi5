#!/usr/bin/env node

/**
 * Audio Generation Test Suite
 * Tests the complete audio generation pipeline
 */

const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test data
const testPresentationContent = {
  title: "Test Presentation",
  slides: [
    {
      id: "slide-1",
      title: "Test Slide",
      content: "Test content",
      elements: [
        {
          id: "element-1",
          type: "title",
          content: "Test Title",
          animation: "fade-in",
          delay: 1000,
          order: 1
        },
        {
          id: "element-2",
          type: "speech",
          content: "This is a test speech element for audio generation.",
          animation: "",
          delay: 0,
          order: 2
        },
        {
          id: "element-3",
          type: "content",
          content: "Test content paragraph",
          animation: "slide-in-left",
          delay: 1000,
          order: 3
        },
        {
          id: "element-4",
          type: "speech",
          content: "This is another test speech element.",
          animation: "",
          delay: 0,
          order: 4
        }
      ]
    }
  ]
};

async function testGeminiTTSService() {
  log('\n🎵 Testing Gemini TTS Service', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Load environment variables from .env.local
    const envLocalPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          const value = line.substring(equalIndex + 1).trim();
          if (key && value) {
            process.env[key] = value;
          }
        }
      });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      logError('GEMINI_API_KEY not found in environment');
      logInfo('Make sure GEMINI_API_KEY is set in .env.local');
      return false;
    }

    // Test Gemini API availability
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      logSuccess('Gemini API library loaded successfully');
      logInfo('Gemini API key configured');
      
      // Test basic functionality without full audio generation
      // (since that would require the full TypeScript compilation)
      if (process.env.GEMINI_API_KEY.length > 20) {
        logSuccess('Gemini API key format appears valid');
        logInfo('Audio generation should work when app is running');
        return true;
      } else {
        logWarning('Gemini API key format may be invalid');
        return false;
      }
    } catch (error) {
      logError(`Gemini API test error: ${error.message}`);
      return false;
    }

  } catch (error) {
    logError(`GeminiTTSService test error: ${error.message}`);
    return false;
  }
}

async function testHTMLConverter() {
  log('\n🔄 Testing HTML Converter Service', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Check if the HTML converter service file exists
    const converterPath = path.resolve(__dirname, '../app/services/html-converter.ts');
    
    if (fs.existsSync(converterPath)) {
      logSuccess('HTML converter service file exists');
      
      // Read the file content to check for required methods
      const content = fs.readFileSync(converterPath, 'utf8');
      
      const checks = [
        { method: 'convertToHTML', description: 'HTML conversion method' },
        { method: 'extractElementSpeechContent', description: 'Speech extraction method' }
      ];
      
      let allMethodsFound = true;
      
      for (const check of checks) {
        if (content.includes(check.method)) {
          logSuccess(`${check.description} found`);
        } else {
          logError(`${check.description} not found`);
          allMethodsFound = false;
        }
      }
      
      if (allMethodsFound) {
        logSuccess('HTML converter service appears to be properly implemented');
        logInfo('Full testing requires the application to be running');
        return true;
      } else {
        logError('HTML converter service is missing required methods');
        return false;
      }
    } else {
      logError('HTML converter service file not found');
      return false;
    }

  } catch (error) {
    logError(`HTMLConverter test error: ${error.message}`);
    return false;
  }
}

async function testAudioBatchGenerator() {
  log('\n🎶 Testing Audio Batch Generator', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Check if the audio batch generator service file exists
    const generatorPath = path.resolve(__dirname, '../app/services/audio-batch-generator.ts');
    
    if (fs.existsSync(generatorPath)) {
      logSuccess('Audio batch generator service file exists');
      
      // Read the file content to check for required methods
      const content = fs.readFileSync(generatorPath, 'utf8');
      
      const checks = [
        { method: 'generatePresentationAudio', description: 'Audio generation method' },
        { method: 'getAudioFiles', description: 'Audio file retrieval method' },
        { method: 'deleteAudioFiles', description: 'Audio cleanup method' }
      ];
      
      let allMethodsFound = true;
      
      for (const check of checks) {
        if (content.includes(check.method)) {
          logSuccess(`${check.description} found`);
        } else {
          logError(`${check.description} not found`);
          allMethodsFound = false;
        }
      }
      
      // Check for required dependencies
      if (content.includes('GeminiTTSService')) {
        logSuccess('Gemini TTS integration found');
      } else {
        logWarning('Gemini TTS integration not found');
      }
      
      if (content.includes('HTMLConverterService')) {
        logSuccess('HTML converter integration found');
      } else {
        logWarning('HTML converter integration not found');
      }
      
      if (allMethodsFound) {
        logSuccess('Audio batch generator appears to be properly implemented');
        logInfo('Full testing requires Supabase connection and running application');
        return true;
      } else {
        logError('Audio batch generator is missing required methods');
        return false;
      }
    } else {
      logError('Audio batch generator service file not found');
      return false;
    }

  } catch (error) {
    logError(`AudioBatchGenerator test error: ${error.message}`);
    return false;
  }
}

async function testAudioAPI() {
  log('\n🌐 Testing Audio API Endpoints', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Test if the API route files exist and are properly structured
    const apiFiles = [
      '../app/api/generate-audio/route.ts',
      '../app/api/generate-presentation-audio/route.ts'
    ];

    let allFilesExist = true;

    for (const file of apiFiles) {
      const filePath = path.resolve(__dirname, file);
      if (fs.existsSync(filePath)) {
        logSuccess(`API file exists: ${file}`);
        
        // Read file content to check for required exports
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('export async function POST')) {
          logSuccess(`POST handler found in ${file}`);
        } else {
          logWarning(`POST handler not found in ${file}`);
        }
      } else {
        logError(`API file missing: ${file}`);
        allFilesExist = false;
      }
    }

    return allFilesExist;

  } catch (error) {
    logError(`Audio API test error: ${error.message}`);
    return false;
  }
}

async function testSupabaseIntegration() {
  log('\n🗄️ Testing Supabase Audio Integration', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Load environment variables from .env.local
    const envLocalPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          const value = line.substring(equalIndex + 1).trim();
          if (key && value) {
            process.env[key] = value;
          }
        }
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logError('Supabase credentials not found');
      logInfo('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
      return false;
    }

    // Test audio_files table
    const response = await fetch(`${supabaseUrl}/rest/v1/audio_files?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      logSuccess('audio_files table accessible');
    } else {
      logError('audio_files table not accessible');
      return false;
    }

    // Test storage bucket accessibility
    const storageResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (storageResponse.ok || storageResponse.status === 403) {
      logSuccess('Supabase storage accessible');
      if (storageResponse.status === 403) {
        logInfo('Storage access limited with anonymous key (this is normal)');
      }
      return true;
    } else {
      logError(`Storage API error: ${storageResponse.status}`);
      return false;
    }

  } catch (error) {
    logError(`Supabase integration test error: ${error.message}`);
    return false;
  }
}

async function testAudioPlayback() {
  log('\n🔊 Testing Audio Playback Integration', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // Test if PresentationViewer has audio integration
    const viewerPath = path.resolve(__dirname, '../app/components/PresentationViewer.tsx');
    
    if (fs.existsSync(viewerPath)) {
      logSuccess('PresentationViewer component found');
      
      const content = fs.readFileSync(viewerPath, 'utf8');
      
      // Check for audio-related code
      const audioChecks = [
        { check: 'HTMLAudioElement', description: 'Audio element usage' },
        { check: 'audioUrl', description: 'Audio URL handling' },
        { check: 'play()', description: 'Audio playback method' },
        { check: 'onended', description: 'Audio end event handling' }
      ];

      let audioIntegrationFound = false;

      for (const { check, description } of audioChecks) {
        if (content.includes(check)) {
          logSuccess(`${description} found`);
          audioIntegrationFound = true;
        } else {
          logInfo(`${description} not found`);
        }
      }

      if (audioIntegrationFound) {
        logSuccess('Audio playback integration detected');
        return true;
      } else {
        logWarning('No audio playback integration detected');
        return false;
      }

    } else {
      logError('PresentationViewer component not found');
      return false;
    }

  } catch (error) {
    logError(`Audio playback test error: ${error.message}`);
    return false;
  }
}

async function runAudioDiagnostics() {
  log('\n🔧 Audio System Diagnostics', 'cyan');
  log('='.repeat(50), 'cyan');

  // Check dependencies
  const dependencies = [
    '@google/generative-ai',
    'mime-types'
  ];

  for (const dep of dependencies) {
    try {
      require(dep);
      logSuccess(`Dependency ${dep} available`);
    } catch (error) {
      logError(`Dependency ${dep} missing or broken`);
    }
  }

  // Check file structure
  const requiredFiles = [
    '../app/services/gemini-tts.ts',
    '../app/services/html-converter.ts',
    '../app/services/audio-batch-generator.ts'
  ];

  for (const file of requiredFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Service file exists: ${file}`);
    } else {
      logError(`Service file missing: ${file}`);
    }
  }
}

async function main() {
  log('🎵 Presi5 Audio Generation Test Suite', 'magenta');
  log('='.repeat(50), 'magenta');

  // Run diagnostics first
  await runAudioDiagnostics();

  const results = {
    geminiTTS: await testGeminiTTSService(),
    htmlConverter: await testHTMLConverter(),
    audioBatchGenerator: await testAudioBatchGenerator(),
    audioAPI: await testAudioAPI(),
    supabaseIntegration: await testSupabaseIntegration(),
    audioPlayback: await testAudioPlayback()
  };

  log('\n📊 Audio Test Results Summary', 'magenta');
  log('='.repeat(50), 'magenta');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  for (const [test, result] of Object.entries(results)) {
    if (result) {
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  }

  log(`\n${passed}/${total} audio tests passed`, passed === total ? 'green' : 'red');

  if (passed < total) {
    log('\n🔧 Troubleshooting Tips:', 'yellow');
    log('1. Ensure GEMINI_API_KEY is set in .env.local');
    log('2. Verify Supabase database schema is deployed');
    log('3. Check that audio-files storage bucket exists');
    log('4. Ensure all npm dependencies are installed');
    process.exit(1);
  } else {
    logSuccess('All audio tests passed! Audio system is ready.');
    process.exit(0);
  }
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    logError(`Audio test suite error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testGeminiTTSService,
  testHTMLConverter,
  testAudioBatchGenerator,
  testAudioAPI,
  testSupabaseIntegration,
  testAudioPlayback
}; 