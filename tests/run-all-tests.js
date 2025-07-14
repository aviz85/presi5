#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all test suites and provides a comprehensive report
 */

const { spawn } = require('child_process');
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
  white: '\x1b[37m',
  bold: '\x1b[1m'
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

function logHeader(message) {
  log(`\n${colors.bold}${colors.magenta}${message}${colors.reset}`);
  log('='.repeat(60), 'magenta');
}

// Test suites configuration
const TEST_SUITES = [
  {
    name: 'Environment Setup',
    script: 'test-environment.js',
    description: 'Tests environment variables and API configurations',
    critical: true
  },
  {
    name: 'Audio Generation',
    script: 'test-audio-generation.js',
    description: 'Tests audio generation pipeline and services',
    critical: true
  },
  {
    name: 'Integration Tests',
    script: 'test-integration.js',
    description: 'Tests complete presentation creation and audio flow',
    critical: false
  }
];

async function runTestSuite(testSuite) {
  return new Promise((resolve) => {
    log(`\n🚀 Running: ${testSuite.name}`, 'cyan');
    log(`📝 ${testSuite.description}`, 'blue');
    
    const scriptPath = path.join(__dirname, testSuite.script);
    const testProcess = spawn('node', [scriptPath], {
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    testProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      const result = {
        suite: testSuite.name,
        script: testSuite.script,
        success,
        exitCode: code,
        output,
        errorOutput,
        critical: testSuite.critical,
        timestamp: new Date().toISOString()
      };

      if (success) {
        logSuccess(`${testSuite.name} completed successfully`);
      } else {
        logError(`${testSuite.name} failed with exit code ${code}`);
      }

      resolve(result);
    });

    testProcess.on('error', (error) => {
      logError(`Failed to run ${testSuite.name}: ${error.message}`);
      resolve({
        suite: testSuite.name,
        script: testSuite.script,
        success: false,
        exitCode: -1,
        output: '',
        errorOutput: error.message,
        critical: testSuite.critical,
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function checkPrerequisites() {
  logHeader('🔍 Checking Prerequisites');

  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 18;
      },
      message: 'Node.js 18+ required'
    },
    {
      name: 'Test files exist',
      check: () => {
        return TEST_SUITES.every(suite => 
          fs.existsSync(path.join(__dirname, suite.script))
        );
      },
      message: 'All test script files must exist'
    },
    {
      name: 'Package.json exists',
      check: () => {
        return fs.existsSync(path.join(process.cwd(), 'package.json'));
      },
      message: 'package.json must exist in project root'
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      if (check.check()) {
        logSuccess(check.name);
      } else {
        logError(`${check.name}: ${check.message}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function generateComprehensiveReport(results) {
  logHeader('📊 Comprehensive Test Report');

  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const criticalFailed = results.filter(r => !r.success && r.critical).length;

  // Create detailed report
  const report = {
    summary: {
      timestamp,
      totalSuites: results.length,
      passed,
      failed,
      criticalFailed,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env: {
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    },
    results,
    recommendations: []
  };

  // Generate recommendations
  if (criticalFailed > 0) {
    report.recommendations.push('🚨 Critical tests failed - system may not be functional');
  }

  if (!report.environment.env.hasGeminiKey) {
    report.recommendations.push('🔑 Set GEMINI_API_KEY in .env.local for audio generation');
  }

  if (!report.environment.env.hasOpenRouterKey) {
    report.recommendations.push('🔑 Set OPENROUTER_API_KEY in .env.local for content generation');
  }

  if (!report.environment.env.hasSupabaseUrl || !report.environment.env.hasSupabaseKey) {
    report.recommendations.push('🗄️ Configure Supabase credentials in .env.local');
  }

  if (report.summary.passRate < 80) {
    report.recommendations.push('📈 Less than 80% tests passed - review failed tests');
  }

  // Save report to file
  const reportPath = path.join(__dirname, 'comprehensive-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Display summary
  log('\n📋 Test Results Summary:', 'white');
  log(`   Total Test Suites: ${report.summary.totalSuites}`, 'white');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'white');
  log(`   🚨 Critical Failed: ${criticalFailed}`, criticalFailed > 0 ? 'red' : 'white');
  log(`   📊 Pass Rate: ${report.summary.passRate.toFixed(1)}%`, 
      report.summary.passRate >= 80 ? 'green' : 'yellow');

  log('\n📁 Detailed Results:', 'white');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const criticalMark = result.critical ? '🚨' : '  ';
    log(`   ${icon} ${criticalMark} ${result.suite}`, result.success ? 'green' : 'red');
  });

  if (report.recommendations.length > 0) {
    log('\n💡 Recommendations:', 'yellow');
    report.recommendations.forEach(rec => {
      log(`   ${rec}`, 'yellow');
    });
  }

  log(`\n📄 Full report saved to: ${reportPath}`, 'blue');

  return report;
}

async function createSetupGuide(report) {
  logHeader('📚 Setup Guide Generation');

  const setupSteps = [];

  if (!report.environment.env.hasGeminiKey || !report.environment.env.hasOpenRouterKey || 
      !report.environment.env.hasSupabaseUrl || !report.environment.env.hasSupabaseKey) {
    setupSteps.push({
      step: 1,
      title: 'Create Environment Configuration',
      commands: [
        'cp env.example .env.local',
        'nano .env.local  # Edit with your API keys'
      ],
      description: 'Copy the example environment file and add your API keys'
    });
  }

  if (report.summary.criticalFailed > 0) {
    setupSteps.push({
      step: setupSteps.length + 1,
      title: 'Fix Critical Issues',
      commands: [
        'npm run test:env',
        'npm run test:audio'
      ],
      description: 'Run individual test suites to identify specific issues'
    });
  }

  setupSteps.push({
    step: setupSteps.length + 1,
    title: 'Verify Installation',
    commands: [
      'npm install',
      'npm run test:all'
    ],
    description: 'Ensure all dependencies are installed and tests pass'
  });

  const guide = {
    title: 'Presi5 Setup Guide',
    timestamp: new Date().toISOString(),
    steps: setupSteps,
    troubleshooting: [
      {
        issue: 'Audio generation fails',
        solution: 'Ensure GEMINI_API_KEY is set and valid'
      },
      {
        issue: 'Content generation fails',
        solution: 'Ensure OPENROUTER_API_KEY is set and valid'
      },
      {
        issue: 'Database errors',
        solution: 'Run the SQL schema in your Supabase project'
      },
      {
        issue: 'Storage errors',
        solution: 'Create audio-files bucket in Supabase Storage'
      }
    ]
  };

  const guidePath = path.join(__dirname, 'setup-guide.json');
  fs.writeFileSync(guidePath, JSON.stringify(guide, null, 2));

  logInfo(`Setup guide saved to: ${guidePath}`);

  return guide;
}

async function main() {
  console.clear();
  
  logHeader('🧪 Presi5 Comprehensive Test Suite');
  logInfo('Testing all system components and integrations...');

  // Check prerequisites
  const prerequisitesOk = await checkPrerequisites();
  if (!prerequisitesOk) {
    logError('Prerequisites check failed. Please fix the issues above.');
    process.exit(1);
  }

  // Run all test suites
  const results = [];
  
  for (const testSuite of TEST_SUITES) {
    const result = await runTestSuite(testSuite);
    results.push(result);
    
    // If a critical test fails, we might want to continue but note it
    if (!result.success && result.critical) {
      logWarning(`Critical test ${testSuite.name} failed, but continuing with remaining tests...`);
    }
  }

  // Generate comprehensive report
  const report = await generateComprehensiveReport(results);
  
  // Create setup guide if needed
  if (report.summary.failed > 0) {
    await createSetupGuide(report);
  }

  // Determine overall success
  const criticalFailed = results.filter(r => !r.success && r.critical).length;
  const overallSuccess = criticalFailed === 0 && report.summary.passRate >= 80;

  if (overallSuccess) {
    logHeader('🎉 All Tests Completed Successfully!');
    logSuccess('Your Presi5 system is ready for use.');
    process.exit(0);
  } else {
    logHeader('⚠️  Tests Completed with Issues');
    logError('Some tests failed. Please review the report and follow the setup guide.');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n🛑 Test run interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n🛑 Test run terminated', 'yellow');
  process.exit(143);
});

// Run main function
if (require.main === module) {
  main().catch(error => {
    logError(`\n💥 Test runner error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  runTestSuite,
  checkPrerequisites,
  generateComprehensiveReport,
  createSetupGuide
}; 