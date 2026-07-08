const crypto = require('crypto');

// In-memory store: fine for a single Node process (Render single instance).
// Entries auto-expire after 5 minutes.
const store = new Map();
const TTL_MS = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(id);
  }
}

function generateCaptcha() {
  cleanup();
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const answer = op === '+' ? a + b : a - b;
  const id = crypto.randomBytes(12).toString('hex');
  store.set(id, { answer, expiresAt: Date.now() + TTL_MS });
  return { captchaId: id, question: `${a} ${op} ${b} = ?` };
}

function verifyCaptcha(captchaId, answer) {
  const entry = store.get(captchaId);
  if (!entry) return false;
  store.delete(captchaId); // one-time use
  if (entry.expiresAt < Date.now()) return false;
  return Number(answer) === entry.answer;
}

module.exports = { generateCaptcha, verifyCaptcha };
