// Runs API server (port 5001) and Vite frontend (port 5174) concurrently: `npm run dev`.
// Ctrl+C stops both. If either exits, the other is stopped cleanly.
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const procs = [
  { name: 'server  ', color: '\x1b[33m', script: 'dev:server' },
  { name: 'frontend', color: '\x1b[36m', script: 'dev:frontend' },
].map(({ name, color, script }) => {
  const child = spawn(npm, ['run', script], { cwd: root, shell: process.platform === 'win32', env: process.env });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) => buf.toString().split(/\r?\n/).filter(Boolean).forEach((l) => out.write(prefix + l + '\n')));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}stopped (exit ${code}). Stopping everything...`);
    shutdown(code || 1);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) {
    if (p.exitCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']);
    else p.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
