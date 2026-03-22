#!/usr/bin/env node

/**
 * Test Nginx configuration generation
 */

const NginxService = require('./src/services/nginxService');

function testNginxConfig() {
  console.log('🧪 Testing Nginx Configuration Generation...');
  console.log('=' .repeat(50));
  
  try {
    const nginxService = new NginxService();
    
    // Test configuration generation
    const config = nginxService.generateNginxConfig('test-project.aitoyz.in', 3001);
    
    console.log('✅ Nginx configuration generated successfully');
    console.log('\n📄 Generated Configuration:');
    console.log('-' .repeat(30));
    console.log(config);
    console.log('-' .repeat(30));
    
    // Check for problematic directives
    const lines = config.split('\n');
    let hasIssues = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for the problematic gzip_proxied directive
      if (trimmedLine.includes('gzip_proxied')) {
        if (trimmedLine.includes('must-revalidate')) {
          console.log(`❌ Line ${index + 1}: Found problematic "must-revalidate" in gzip_proxied`);
          hasIssues = true;
        } else {
          console.log(`✅ Line ${index + 1}: gzip_proxied directive looks good`);
        }
      }
    });
    
    if (!hasIssues) {
      console.log('\n🎉 Configuration appears to be valid!');
      console.log('✅ No problematic directives found');
    } else {
      console.log('\n❌ Configuration has issues that need to be fixed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testNginxConfig();
}

module.exports = testNginxConfig;