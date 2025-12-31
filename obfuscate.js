const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// Read the source file
const sourceFile = path.join(__dirname, 'src', 'v.js');
const sourceCode = fs.readFileSync(sourceFile, 'utf8');

// Medium obfuscation settings
const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
  // Compact output
  compact: true,
  
  // Control flow flattening (makes code harder to follow)
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  
  // Dead code injection (adds fake code)
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  
  // String encoding
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  shuffleStringArray: true,
  
  // Split strings into chunks
  splitStrings: true,
  splitStringsChunkLength: 10,
  
  // Rename variables and functions
  renameGlobals: false, // Keep globals for compatibility
  identifierNamesGenerator: 'hexadecimal',
  
  // Transform object keys
  transformObjectKeys: true,
  
  // Disable console (optional extra protection)
  disableConsoleOutput: true,
  
  // Self defending (breaks if formatted)
  selfDefending: false, // Disabled to avoid issues
  
  // Target
  target: 'browser',
  
  // Source map (disabled for production)
  sourceMap: false
});

// Get obfuscated code
const obfuscatedCode = obfuscationResult.getObfuscatedCode();

// Write to public folder
const outputFile = path.join(__dirname, 'public', 'v.js');
fs.writeFileSync(outputFile, obfuscatedCode);

// Also write to root for local testing
const rootOutputFile = path.join(__dirname, 'v.js');
fs.writeFileSync(rootOutputFile, obfuscatedCode);

console.log('✅ Obfuscation complete!');
console.log(`   Source: ${sourceFile}`);
console.log(`   Output: ${outputFile}`);
console.log(`   Size: ${(obfuscatedCode.length / 1024).toFixed(2)} KB`);
