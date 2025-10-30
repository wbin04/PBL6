const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const form = document.getElementById('inputForm');
const storeSelect = document.getElementById('storeSelect');

function addMessage(role, text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'user' ? 'msg-user' : 'msg-bot');
  wrap.innerText = text;
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage(text) {
  if (!text || !text.trim()) return;
  addMessage('user', text);
  inputEl.value = '';
  inputEl.disabled = true;
  sendBtn.disabled = true;

    try {
    const payload = { message: text, session_id: SESSION_ID };
    const selectedStore = storeSelect && storeSelect.value ? parseInt(storeSelect.value) : null;
    if (selectedStore) payload.store_id = selectedStore;

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      addMessage('bot', 'Lỗi kết nối tới server: ' + res.status);
      return;
    }

    const data = await res.json();

    // If server returns an error wrapper
    if (data.error) {
      addMessage('bot', 'Server trả về lỗi: ' + (data.error || JSON.stringify(data)));
      return;
    }

    // The server returns different JSON shapes; prefer reply field
    if (data.reply) {
      addMessage('bot', data.reply);
    } else if (data.intent) {
      addMessage('bot', JSON.stringify(data, null, 2));
    } else {
      addMessage('bot', JSON.stringify(data));
    }

  } catch (err) {
    addMessage('bot', 'Lỗi: ' + err.message);
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(inputEl.value);
  }
});

// Greeting message
addMessage('bot', 'Xin chào! Tôi có thể giúp bạn đặt đồ ăn. Gõ tin nhắn để bắt đầu.');

// Load stores and populate select
async function loadStores() {
  try {
    const res = await fetch('/stores');
    if (!res.ok) return;
    const data = await res.json();
    const stores = data.stores || [];
    if (storeSelect) {
      storeSelect.innerHTML = '';
      const optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.text = '--- Chọn cửa hàng (mặc định) ---';
      storeSelect.appendChild(optDefault);
      stores.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id;
        o.text = s.store_name || `Store ${s.id}`;
        storeSelect.appendChild(o);
      });
    }
  } catch (e) {
    console.warn('Could not load stores', e);
  }
}

loadStores();
