const { exec } = require('child_process');

// Test if we can start the server
const serverProcess = exec('cd /home/runner/workspace && timeout 10 npx tsx server/index.ts', 
  { timeout: 12000 }, 
  (error, stdout, stderr) => {
    if (error) {
      console.log('Server error:', error.message);
    }
    if (stderr) {
      console.log('Server stderr:', stderr);
    }
    console.log('Server stdout:', stdout);
  }
);

// Wait a bit then test the API
setTimeout(() => {
  const testAPI = exec('curl -X GET http://localhost:5000/api/subscription/plans', 
    (error, stdout, stderr) => {
      if (error) {
        console.log('API error:', error.message);
      } else {
        console.log('API response:', stdout);
      }
      process.exit(0);
    }
  );
}, 5000);

setTimeout(() => {
  console.log('Test timeout reached');
  process.exit(1);
}, 15000);