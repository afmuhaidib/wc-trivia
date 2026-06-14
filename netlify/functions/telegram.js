const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Max body size: 64 KB
const MAX_BODY_BYTES = 64 * 1024;

// Telegram chat IDs are signed 64-bit ints; message IDs are positive ints.
// Both fit safely in JS numbers within this range.
function isTelegramId(v) {
  return Number.isInteger(v) && Math.abs(v) <= 2 ** 53;
}

async function sendMessage(chatId, text) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

exports.handler = async (event, context) => {
  connectLambda(event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Reject oversized payloads before parsing
  const bodyBytes = Buffer.byteLength(event.body || '', 'utf8');
  if (bodyBytes > MAX_BODY_BYTES) {
    return { statusCode: 413, body: 'Payload Too Large' };
  }

  // Verify Telegram webhook secret (constant-time compare to prevent timing attacks)
  if (WEBHOOK_SECRET) {
    const got = event.headers['x-telegram-bot-api-secret-token'] || '';
    let valid = false;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(got), Buffer.from(WEBHOOK_SECRET));
    } catch {
      // timingSafeEqual throws if buffers differ in length
      valid = false;
    }
    if (!valid) return { statusCode: 401, body: 'Unauthorized' };
  }

  let update;
  try {
    update = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const msg = update.message || update.edited_message;
  if (!msg) return { statusCode: 200, body: 'ok' };

  // Validate IDs before using them as blob key segments
  if (!isTelegramId(msg.chat?.id) || !isTelegramId(msg.message_id)) {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const store = getStore('telegram-messages');

  // Whitelist only the fields we actually need (drop raw msg)
  const record = {
    id: msg.message_id,
    chat_id: msg.chat.id,
    chat_type: msg.chat.type,
    from: msg.from
      ? {
          id: msg.from.id,
          username: msg.from.username || null,
          first_name: msg.from.first_name || null,
          last_name: msg.from.last_name || null,
        }
      : null,
    text: msg.text || null,
    date: new Date(msg.date * 1000).toISOString(),
  };

  const key = `${msg.chat.id}/${msg.message_id}`;
  await store.setJSON(key, record);

  // Maintain a running log per chat (capped at 1000 entries)
  const logKey = `logs/${msg.chat.id}`;
  let log = [];
  try {
    log = await store.get(logKey, { type: 'json' }) || [];
  } catch {}
  log.push(record);
  if (log.length > 1000) log = log.slice(-1000);
  await store.setJSON(logKey, log);

  await sendMessage(msg.chat.id, `✅ تم حفظ رسالتك:\n"${msg.text || '(no text)'}"\n🕐 ${record.date}`);

  return { statusCode: 200, body: 'ok' };
};
