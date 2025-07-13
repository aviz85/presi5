#!/usr/bin/env node

async function runFullIntegrationTest() {
  const baseUrl = 'http://localhost:3002';
  
  console.log('🧪 Running Full Integration Test for generate-content');
  console.log('================================================\n');

  try {
    // Test 1: Check if server is responding
    console.log('1️⃣ Testing server connectivity...');
    const healthResponse = await fetch(`${baseUrl}/api/models?free=true`);
    if (healthResponse.ok) {
      const models = await healthResponse.json();
      console.log(`✅ Server responding - ${models.count} models available`);
    } else {
      console.log('❌ Server not responding properly');
      return;
    }

    // Test 2: Test with simple English prompt
    console.log('\n2️⃣ Testing simple English prompt...');
    const test1 = await testContentGeneration({
      prompt: 'Benefits of exercise',
      model: 'qwen/qwen-2.5-72b-instruct'
    }, '2️⃣');

    // Test 3: Test with Hebrew prompt
    console.log('\n3️⃣ Testing Hebrew prompt...');
    const test2 = await testContentGeneration({
      prompt: 'יתרונות של בינה מלאכותית',
      model: 'qwen/qwen-2.5-72b-instruct'
    }, '3️⃣');

    // Test 4: Test with fallback model
    console.log('\n4️⃣ Testing fallback model...');
    const test3 = await testContentGeneration({
      prompt: 'AI in healthcare',
      model: 'meta-llama/llama-3.3-70b-instruct:free'
    }, '4️⃣');

    // Test 5: Test with potentially problematic model
    console.log('\n5️⃣ Testing potentially problematic model...');
    const test4 = await testContentGeneration({
      prompt: 'Climate change solutions',
      model: 'qwen/qwen3-8b:free'
    }, '5️⃣');

    // Test 6: Test edge cases
    console.log('\n6️⃣ Testing edge cases...');
    await testEdgeCases();

    // Summary
    console.log('\n📊 INTEGRATION TEST SUMMARY');
    console.log('===========================');
    const results = [test1, test2, test3, test4].filter(Boolean);
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

async function testContentGeneration(payload, testNumber) {
  const baseUrl = 'http://localhost:3002';
  const startTime = Date.now();
  
  try {
    console.log(`   📤 Sending request with model: ${payload.model}`);
    console.log(`   📝 Prompt: ${payload.prompt.substring(0, 50)}...`);
    
    const response = await fetch(`${baseUrl}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    console.log(`   ⏱️  Response time: ${duration}ms`);

    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ ${testNumber} SUCCESS`);
        console.log(`   📊 Generated ${data.data.slides.length} slides`);
        console.log(`   📝 Title: ${data.data.title}`);
        
        // Validate structure
        const firstSlide = data.data.slides[0];
        if (firstSlide && firstSlide.elements) {
          console.log(`   🔍 First slide has ${firstSlide.elements.length} elements`);
          const hasVisualAndSpeech = firstSlide.elements.some(e => e.type !== 'speech') && 
                                   firstSlide.elements.some(e => e.type === 'speech');
          console.log(`   🎭 Has visual+speech pattern: ${hasVisualAndSpeech ? 'YES' : 'NO'}`);
        }
        
        return { success: true, duration, slides: data.data.slides.length };
      } else {
        console.log(`   ❌ ${testNumber} API ERROR`);
        console.log(`   🚨 Error: ${data.error}`);
        console.log(`   📄 Details: ${data.details || 'No details'}`);
        return { success: false, error: data.error };
      }
    } else {
      console.log(`   ❌ ${testNumber} HTTP ERROR`);
      console.log(`   🚨 Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   📄 Response: ${errorText.substring(0, 200)}...`);
      return { success: false, error: `HTTP ${response.status}` };
    }

  } catch (error) {
    console.log(`   ❌ ${testNumber} NETWORK ERROR`);
    console.log(`   🚨 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testEdgeCases() {
  const baseUrl = 'http://localhost:3002';
  
  // Test empty prompt
  console.log('   🧪 Testing empty prompt...');
  try {
    const response = await fetch(`${baseUrl}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '', model: 'qwen/qwen-2.5-72b-instruct' })
    });
    const data = await response.json();
    console.log(`   📝 Empty prompt result: ${data.success ? 'Unexpected success' : 'Correctly rejected'}`);
  } catch (error) {
    console.log(`   ❌ Empty prompt test failed: ${error.message}`);
  }

  // Test very short prompt
  console.log('   🧪 Testing very short prompt...');
  try {
    const response = await fetch(`${baseUrl}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'AI', model: 'qwen/qwen-2.5-72b-instruct' })
    });
    const data = await response.json();
    console.log(`   📝 Short prompt result: ${data.success ? 'Unexpected success' : 'Correctly rejected'}`);
  } catch (error) {
    console.log(`   ❌ Short prompt test failed: ${error.message}`);
  }

  // Test invalid model
  console.log('   🧪 Testing invalid model...');
  try {
    const response = await fetch(`${baseUrl}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test prompt for invalid model', model: 'invalid/model:free' })
    });
    const data = await response.json();
    console.log(`   📝 Invalid model result: ${data.success ? 'Unexpected success' : 'Correctly failed'}`);
    if (!data.success) {
      console.log(`   🔍 Error details: ${data.details}`);
    }
  } catch (error) {
    console.log(`   ❌ Invalid model test failed: ${error.message}`);
  }
}

runFullIntegrationTest(); 