const { getStore, connectLambda } = require('@netlify/blobs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

  let update;
  try {
    update = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const msg = update.message || update.edited_message;
  if (!msg) return { statusCode: 200, body: 'ok' };

  const store = getStore('telegram-messages');

  // Build the record
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
    raw: msg,
  };

  // Save to Netlify Blobs as JSON (key: chatId/messageId)
  const key = `${msg.chat.id}/${msg.message_id}`;
  await store.setJSON(key, record);

  // Also maintain a running log per chat
  const logKey = `logs/${msg.chat.id}`;
  let log = [];
  try {
    log = await store.get(logKey, { type: 'json' }) || [];
  } catch {}
  log.push(record);
  // Keep last 1000 messages per chat
  if (log.length > 1000) log = log.slice(-1000);
  await store.setJSON(logKey, log);

  // Acknowledge in Telegram
  await sendMessage(msg.chat.id, `✅ تم حفظ رسالتك:\n"${msg.text || '(no text)'}"\n🕐 ${record.date}`);

  return { statusCode: 200, body: 'ok' };
};
