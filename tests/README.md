# Presi5 Testing Suite

A comprehensive testing system for the Presi5 AI presentation generator, designed to validate all system components including environment setup, audio generation, and complete integration flows.

## 🧪 Test Suites Overview

### 1. Environment Setup Tests (`test-environment.js`)
**Critical Test Suite** - Validates all required configurations

- ✅ Environment variables validation
- ✅ API key configuration check  
- ✅ Supabase connection testing
- ✅ Database schema verification
- ✅ Storage bucket accessibility

### 2. Audio Generation Tests (`test-audio-generation.js`)
**Critical Test Suite** - Tests the complete audio pipeline

- 🎵 Gemini TTS service functionality
- 🔄 HTML converter service
- 🎶 Audio batch generator
- 🌐 Audio API endpoints
- 🗄️ Supabase audio integration
- 🔊 Audio playback integration

### 3. Integration Tests (`test-integration.js`)
**Full System Test** - End-to-end testing

- 🤖 Content generation API
- 🎵 Audio generation API  
- 🔗 Audio file accessibility
- 📋 Models API functionality
- 🔄 Complete presentation flow
- ⚠️ Error handling validation

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
# Environment and configuration tests
npm run test:env

# Audio generation pipeline tests  
npm run test:audio

# Full integration tests
npm run test:integration
```

## 📋 Prerequisites

Before running tests, ensure you have:

1. **Node.js 18+** installed
2. **Environment file** configured (`.env.local`)
3. **API keys** set up:
   - `GEMINI_API_KEY` - Google Gemini for TTS
   - `OPENROUTER_API_KEY` - OpenRouter for content generation
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## 🔧 Setup Instructions

### 1. Create Environment File
```bash
cp env.example .env.local
```

### 2. Configure API Keys
Edit `.env.local` with your actual API keys:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Setup Supabase Database
Execute the SQL schema in your Supabase project:
```bash
# Copy the contents of supabase-schema.sql
# Paste and run in your Supabase SQL editor
```

### 4. Create Storage Bucket
In your Supabase project:
1. Go to Storage
2. Create bucket named `audio-files`
3. Set as public bucket

### 5. Run Tests
```bash
npm run test:all
```

## 📊 Test Reports

The testing suite generates comprehensive reports:

### Comprehensive Test Report
- **Location**: `tests/comprehensive-test-report.json`
- **Contents**: Detailed results, environment info, recommendations

### Integration Test Report  
- **Location**: `tests/integration-test-report.json`
- **Contents**: API testing results, performance metrics

### Setup Guide
- **Location**: `tests/setup-guide.json`
- **Contents**: Automated setup instructions based on failed tests

## 🔍 Understanding Test Results

### Test Status Indicators
- ✅ **PASSED** - Test completed successfully
- ❌ **FAILED** - Test failed, requires attention
- 🚨 **CRITICAL FAILED** - Critical system component failed
- ⚠️ **WARNING** - Non-critical issue detected

### Pass Rate Thresholds
- **80%+** - System ready for use
- **60-79%** - Minor issues, mostly functional
- **<60%** - Significant issues, requires setup

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### Audio Generation Fails
```bash
# Check Gemini API key
npm run test:env

# Verify key format (should start with 'AI')
echo $GEMINI_API_KEY
```

#### Content Generation Fails  
```bash
# Check OpenRouter API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
```

#### Database Connection Issues
```bash
# Verify Supabase configuration
npm run test:env

# Check database schema
# Run supabase-schema.sql in Supabase SQL editor
```

#### Storage Bucket Issues
1. Login to Supabase Dashboard
2. Navigate to Storage
3. Create `audio-files` bucket
4. Set bucket as public

### Debug Mode
For detailed debugging, run individual tests:

```bash
# Environment debugging
node tests/test-environment.js

# Audio system debugging  
node tests/test-audio-generation.js

# Integration debugging
node tests/test-integration.js
```

## 🔄 Continuous Testing

### Development Workflow
```bash
# Before making changes
npm run test:all

# After implementing features
npm run test:integration

# Before deployment
npm run test:all
```

### Automated Testing
Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Presi5 Tests
  run: |
    npm install
    npm run test:all
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 📈 Test Coverage

### System Components Tested
- ✅ Environment configuration
- ✅ API integrations (Gemini, OpenRouter, Supabase)
- ✅ Database schema and connectivity
- ✅ Storage bucket configuration
- ✅ Audio generation pipeline
- ✅ Content generation system
- ✅ Complete user workflow
- ✅ Error handling and edge cases

### Performance Metrics
- API response times
- Audio generation duration
- File upload/download speeds
- Database query performance

## 🆘 Getting Help

### Test Failures
1. **Check the comprehensive test report** for detailed error information
2. **Follow the generated setup guide** for specific fix instructions
3. **Run individual test suites** to isolate issues
4. **Verify environment configuration** using `npm run test:env`

### Common Commands
```bash
# Quick health check
npm run test:env

# Full system validation
npm run test:all

# Integration testing only
npm run test:integration

# Audio system check
npm run test:audio
```

### Support Resources
- **SUPABASE_SETUP.md** - Database and storage setup
- **env.example** - Environment configuration template
- **Test reports** - Automated diagnostic information

---

## 🎯 Success Criteria

Your Presi5 system is ready when:
- ✅ All critical tests pass
- ✅ Audio generation works end-to-end
- ✅ Content generation produces valid presentations
- ✅ Database and storage are properly configured
- ✅ Integration tests achieve 80%+ pass rate

Run `npm run test:all` to validate your complete setup! 