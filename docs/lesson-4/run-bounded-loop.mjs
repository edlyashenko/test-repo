// Local control only: no model calls, network, writes or subprocesses.
const mode = process.argv[2];
if (!['already-ready', 'never-ready', 'error'].includes(mode)) {
  console.error('usage: node run-bounded-loop.mjs already-ready|never-ready|error');
  process.exitCode = 64;
} else {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`attempt ${attempt}/${maxAttempts}`);
    if (mode === 'error') {
      console.error('CHECK_ERROR: stop without retry');
      process.exitCode = 1;
      break;
    }
    if (mode === 'already-ready') {
      console.log('READY');
      break;
    }
    if (attempt === maxAttempts) {
      console.error('LIMIT_REACHED: return to the task owner');
      process.exitCode = 2;
    }
  }
}
