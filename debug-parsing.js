#!/usr/bin/env node

async function debugParsingIssue() {
  console.log('🔍 Debugging parsing issue with qwen/qwen3-8b:free');
  console.log('==================================================\n');

  try {
    // Test the problematic model directly
    console.log('📤 Testing problematic model directly...');
    
    const response = await fetch('http://localhost:3002/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: 'Simple presentation about cats',
        model: 'qwen/qwen3-8b:free'
      })
    });

    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Raw Response Length: ${responseText.length} characters`);
    console.log(`📄 Raw Response Preview:`);
    console.log('=' .repeat(60));
    console.log(responseText.substring(0, 1000));
    console.log('=' .repeat(60));
    
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('\n✅ Response is valid JSON');
      console.log(`🔍 Error type: ${parsedResponse.error}`);
      console.log(`🔍 Error details: ${parsedResponse.details}`);
    } catch (parseError) {
      console.log('\n❌ Response is not valid JSON');
      console.log(`🚨 Parse error: ${parseError.message}`);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Also test what the OpenRouter API is actually returning
async function testOpenRouterDirectly() {
  console.log('\n🔧 Testing OpenRouter API directly...');
  
  const { generateContent } = await import('./app/services/openrouter.js');
  const { CONTENT_GENERATION_PROMPT } = await import('./app/services/content-generator.js');
  
  try {
    const result = await generateContent(
      'Create a presentation about: Simple presentation about cats',
      'You are an AI presentation generator. Create a structured presentation with interleaved visual and speech elements. Each visual element must be followed by a speech element that explains it.\n\nFor bullet points, create separate "bullet-point" elements - each bullet point should be its own element with its own speech explanation.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "title": "Presentation Title",\n  "slides": [\n    {\n      "id": "slide-1",\n      "title": "Slide Title",\n      "content": "Brief summary",\n      "elements": [\n        {\n          "id": "element-1",\n          "type": "title",\n          "content": "Main Title",\n          "animation": "fade-in",\n          "delay": 1000,\n          "order": 1\n        },\n        {\n          "id": "element-2",\n          "type": "speech",\n          "content": "Welcome to our presentation. Today we\'ll explore this topic.",\n          "animation": "",\n          "delay": 0,\n          "order": 2\n        }\n      ]\n    }\n  ]\n}\n\nCRITICAL RULES:\n1. Create 5-7 slides total\n2. STRICT Pattern: Visual → Speech → Visual → Speech (alternate every element)\n3. Visual types: title, subtitle, content, bullet-point\n4. Each bullet-point is separate with its own speech explanation\n5. Speech: Natural narration explaining the visual element\n6. Animations: fade-in, slide-in-left, slide-in-right, scale-up, bounce-in\n7. Visual elements: delay=1000ms, Speech elements: delay=0ms\n8. Return ONLY valid JSON, no markdown, no explanation\n9. Ensure all content is in English unless specifically requested otherwise',
      'qwen/qwen3-8b:free'
    );
    
    if ('error' in result) {
      console.log('❌ OpenRouter API Error:');
      console.log(`🚨 Error: ${result.error}`);
      console.log(`🚨 Code: ${result.code}`);
      console.log(`🚨 Details: ${result.details}`);
    } else {
      console.log('✅ OpenRouter API Success');
      console.log(`📊 Content Length: ${result.content.length} characters`);
      console.log('📄 Raw Content Preview:');
      console.log('=' .repeat(60));
      console.log(result.content.substring(0, 500));
      console.log('=' .repeat(60));
      
      // Try to parse it manually
      try {
        const parsed = JSON.parse(result.content);
        console.log('\n✅ Content is valid JSON');
        console.log(`📊 Title: ${parsed.title}`);
        console.log(`📊 Slides: ${parsed.slides?.length || 0}`);
      } catch (parseError) {
        console.log('\n❌ Content is not valid JSON');
        console.log(`🚨 Parse error: ${parseError.message}`);
        
        // Try to find JSON in the content
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('\n🔍 Found JSON-like content, trying to parse...');
          try {
            const cleanJson = jsonMatch[0]
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']');
            const parsed = JSON.parse(cleanJson);
            console.log('✅ Cleaned JSON is valid');
            console.log(`📊 Title: ${parsed.title}`);
            console.log(`📊 Slides: ${parsed.slides?.length || 0}`);
          } catch (cleanError) {
            console.log('❌ Even cleaned JSON is invalid');
            console.log(`🚨 Clean error: ${cleanError.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ OpenRouter direct test failed:', error.message);
  }
}

debugParsingIssue().then(() => testOpenRouterDirectly()); 