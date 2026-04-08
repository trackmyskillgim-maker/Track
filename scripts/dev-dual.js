const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting dual dev servers...');
console.log('📍 Admin/Professor: http://localhost:3000');
console.log('📍 Student: http://localhost:3001');
console.log('');

// Start server on port 3000 (Admin/Professor)
const server3000 = spawn('next', ['dev', '-p', '3000'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'pipe',
  shell: true
});

// Start server on port 3001 (Student)
const server3001 = spawn('next', ['dev', '-p', '3001'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'pipe',
  shell: true
});

// Handle output from port 3000
server3000.stdout.on('data', (data) => {
  console.log(`[3000 Admin] ${data.toString().trim()}`);
});

server3000.stderr.on('data', (data) => {
  console.error(`[3000 Admin] ${data.toString().trim()}`);
});

// Handle output from port 3001
server3001.stdout.on('data', (data) => {
  console.log(`[3001 Student] ${data.toString().trim()}`);
});

server3001.stderr.on('data', (data) => {
  console.error(`[3001 Student] ${data.toString().trim()}`);
});

// Handle process exits
server3000.on('close', (code) => {
  console.log(`[3000 Admin] Process exited with code ${code}`);
  server3001.kill();
  process.exit(code);
});

server3001.on('close', (code) => {
  console.log(`[3001 Student] Process exited with code ${code}`);
  server3000.kill();
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down dev servers...');
  server3000.kill();
  server3001.kill();
  process.exit(0);
});
