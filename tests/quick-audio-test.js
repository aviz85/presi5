#!/usr/bin/env node

/**
 * Quick Audio Test - Fast check for audio system functionality
 * Usage: npm run test:quick-audio
 */

const fs = require('fs');
const path = require('path');

// Add fetch polyfill for Node.js
if (!globalThis.fetch) {
  globalThis.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function quickAudioTest() {
  log('\n🎵 Quick Audio System Test', 'cyan');
  log('='.repeat(40), 'cyan');
  
  let allPassed = true;
  
  try {
    // Load environment variables
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
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

    // 1. Check Gemini API Key
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20) {
      logSuccess('Gemini API key configured');
    } else {
      logError('Gemini API key missing or invalid');
      allPassed = false;
    }

    // 2. Check Supabase connection
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audio_files?limit=1`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        logSuccess('Supabase audio table accessible');
      } else {
        logError('Supabase audio table not accessible');
        allPassed = false;
      }
    } else {
      logError('Supabase credentials missing');
      allPassed = false;
    }

    // 3. Check service files
    const serviceFiles = [
      '../app/services/gemini-tts.ts',
      '../app/services/html-converter.ts',
      '../app/services/audio-batch-generator.ts'
    ];
    
    for (const file of serviceFiles) {
      const filePath = path.resolve(__dirname, file);
      if (fs.existsSync(filePath)) {
        logSuccess(`Service file exists: ${path.basename(file)}`);
      } else {
        logError(`Service file missing: ${path.basename(file)}`);
        allPassed = false;
      }
    }

    // 4. Check API endpoints
    const apiFiles = [
      '../app/api/generate-audio/route.ts',
      '../app/api/generate-presentation-audio/route.ts'
    ];
    
    for (const file of apiFiles) {
      const filePath = path.resolve(__dirname, file);
      if (fs.existsSync(filePath)) {
        logSuccess(`API endpoint exists: ${path.basename(path.dirname(file))}`);
      } else {
        logError(`API endpoint missing: ${path.basename(path.dirname(file))}`);
        allPassed = false;
      }
    }

    // 5. Test server if running
    try {
      const serverResponse = await fetch('http://localhost:3000/api/models?free=true&format=select');
      if (serverResponse.ok) {
        logSuccess('Development server is running');
        const data = await serverResponse.json();
        logInfo(`${data.data?.length || 0} models available`);
      } else {
        logInfo('Development server not running (this is OK)');
      }
    } catch (error) {
      logInfo('Development server not running (this is OK)');
    }

    // Summary
    log('\n📊 Quick Test Results', 'cyan');
    log('='.repeat(40), 'cyan');
    
    if (allPassed) {
      logSuccess('All critical audio components are ready! 🎉');
      logInfo('You can now create presentations with audio');
      process.exit(0);
    } else {
      logError('Some audio components need attention');
      logInfo('Run "npm run test:audio" for detailed diagnostics');
      process.exit(1);
    }

  } catch (error) {
    logError(`Quick test error: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
quickAudioTest(); 