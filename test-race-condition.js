#!/usr/bin/env node

async function testRaceCondition() {
  console.log('🔄 Testing for race conditions with qwen/qwen3-8b:free');
  console.log('================================================\n');

  const results = [];
  const testCount = 5;

  for (let i = 1; i <= testCount; i++) {
    console.log(`🧪 Test ${i}/${testCount}...`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3002/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Test ${i}: Benefits of technology`,
          model: 'qwen/qwen3-8b:free'
        })
      });

      const duration = Date.now() - startTime;
      const data = await response.json();
      
      const result = {
        test: i,
        success: data.success,
        status: response.status,
        duration,
        error: data.error,
        details: data.details,
        slidesCount: data.success ? data.data.slides.length : 0
      };
      
      results.push(result);
      
      if (data.success) {
        console.log(`   ✅ SUCCESS - ${data.data.slides.length} slides in ${duration}ms`);
      } else {
        console.log(`   ❌ FAILED - ${data.error} (${duration}ms)`);
        console.log(`   📄 Details: ${data.details}`);
      }
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   💥 EXCEPTION - ${error.message}`);
      results.push({
        test: i,
        success: false,
        error: 'Exception',
        details: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 RACE CONDITION TEST SUMMARY');
  console.log('===============================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${testCount}`);
  console.log(`❌ Failed: ${failed.length}/${testCount}`);
  console.log(`📈 Success Rate: ${Math.round((successful.length / testCount) * 100)}%`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    console.log(`⏱️  Average Duration: ${Math.round(avgDuration)}ms`);
  }
  
  if (failed.length > 0) {
    console.log('\n🔍 FAILURE ANALYSIS:');
    failed.forEach(f => {
      console.log(`   Test ${f.test}: ${f.error} - ${f.details}`);
    });
  }

  // Test with different model for comparison
  console.log('\n🔄 Testing reliable model for comparison...');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3002/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: 'Comparison test: Benefits of technology',
        model: 'qwen/qwen-2.5-72b-instruct'
      })
    });

    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Reliable model SUCCESS - ${data.data.slides.length} slides in ${duration}ms`);
    } else {
      console.log(`❌ Even reliable model FAILED - ${data.error}`);
    }
    
  } catch (error) {
    console.log(`💥 Reliable model EXCEPTION - ${error.message}`);
  }
}

testRaceCondition(); 