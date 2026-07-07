const fs = require('fs');
const path = require('path');

// Mock localStorage
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

try {
  console.log("Analyzing web/src/App.tsx for structural or JavaScript errors...");
  const content = fs.readFileSync(path.join(__dirname, 'web/src/App.tsx'), 'utf8');
  
  // Let's do a basic check on imports and variables
  console.log("File read successfully, size:", content.length);
  
  // Check for unclosed structures or weird JSX
  if (content.includes("className master-table")) {
    console.log("⚠️ Found typo 'className master-table' inside the file!");
  } else {
    console.log("No obvious 'className master-table' typos found.");
  }
} catch (e) {
  console.error("Test failed:", e);
}
