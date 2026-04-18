/* chatbot.js — AI assistant powered by Google Gemini
 * Manages the floating chat panel, message rendering, and API communication.
 * The assistant is available from the start (pre-upload) so it can guide the
 * user through data loading, and becomes data-aware once datasets are uploaded.
 */

// ── Chat state ────────────────────────────────────────────────────────────────
let chatOpen    = false;
let chatHistory = [];   // {role: "user"|"model", parts: "..."}
let chatBusy    = false;

/* ── Open / close ──────────────────────────────────────────────────────────── */
function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chat-panel');
    const fab   = document.getElementById('chat-fab');

    if (chatOpen) {
        panel.classList.add('open');
        fab.classList.add('open');
        // Focus the input field
        setTimeout(() => document.getElementById('chat-input').focus(), 350);
        // Show welcome message on first open
        if (chatHistory.length === 0) {
            _appendWelcome();
        }
    } else {
        panel.classList.remove('open');
        fab.classList.remove('open');
    }
}

function closeChat() {
    chatOpen = false;
    document.getElementById('chat-panel').classList.remove('open');
    document.getElementById('chat-fab').classList.remove('open');
}

/* ── Welcome message ───────────────────────────────────────────────────────── */
function _appendWelcome() {
    const msgs = document.getElementById('chat-messages');
    const t = T[LANG];
    const welcomeHtml = `
        <div class="chat-msg ai fade-in">
            <div class="chat-avatar">🧠</div>
            <div class="chat-bubble ai">
                <div class="chat-sender">${t.chat_ai_name || 'Brain AI'}</div>
                ${t.chat_welcome || 'Ciao! Sono <strong>Brain AI</strong>, il tuo assistente per l\'analisi delle reti cerebrali. Chiedimi qualsiasi cosa! 🧠'}
            </div>
        </div>
    `;
    msgs.innerHTML = welcomeHtml;
}

/* ── Send message ──────────────────────────────────────────────────────────── */
function sendChatMessage() {
    if (chatBusy) return;

    const input = document.getElementById('chat-input');
    const msg   = input.value.trim();
    if (!msg) return;

    // Render user message
    _appendMessage('user', msg);
    input.value = '';

    // Add to history
    chatHistory.push({ role: 'user', parts: msg });

    // Show typing indicator
    _showTyping();
    chatBusy = true;

    // Call backend
    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: msg,
            history: chatHistory.slice(0, -1) // exclude current msg (sent separately)
        })
    })
    .then(r => r.json())
    .then(data => {
        _hideTyping();
        chatBusy = false;

        if (data.error) {
            _appendMessage('ai', `⚠️ ${data.error}`);
            return;
        }

        const reply = data.reply || '';
        chatHistory.push({ role: 'model', parts: reply });
        _appendMessage('ai', _renderMarkdown(reply));
    })
    .catch(err => {
        _hideTyping();
        chatBusy = false;
        _appendMessage('ai', `⚠️ ${T[LANG].chat_error || 'Errore di connessione. Riprova.'}`);
        console.error('Chat error:', err);
    });
}

/* Handle Enter key */
function chatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

/* ── Message rendering ─────────────────────────────────────────────────────── */
function _appendMessage(role, content) {
    const msgs = document.getElementById('chat-messages');
    const isAi = role === 'ai';
    const div  = document.createElement('div');
    div.className = `chat-msg ${role} fade-in`;

    if (isAi) {
        div.innerHTML = `
            <div class="chat-avatar">🧠</div>
            <div class="chat-bubble ai">
                <div class="chat-sender">${T[LANG].chat_ai_name || 'Brain AI'}</div>
                ${content}
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="chat-bubble user">${_escapeHtml(content)}</div>
        `;
    }

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function _showTyping() {
    const msgs = document.getElementById('chat-messages');
    const div  = document.createElement('div');
    div.className = 'chat-msg ai fade-in';
    div.id = 'chat-typing';
    div.innerHTML = `
        <div class="chat-avatar">🧠</div>
        <div class="chat-bubble ai typing-bubble">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function _hideTyping() {
    const el = document.getElementById('chat-typing');
    if (el) el.remove();
}

/* ── Markdown-lite renderer ────────────────────────────────────────────────── */
function _renderMarkdown(text) {
    // Escape HTML first
    let html = _escapeHtml(text);

    // Code blocks (```...```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="chat-code">$1</pre>');

    // Inline code (`...`)
    html = html.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');

    // Bold (**...**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic (*...*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered list items (- ...)
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="chat-list">$&</ul>');

    // Ordered list items (1. ...)
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up extra <br> inside lists
    html = html.replace(/<\/li><br>/g, '</li>');
    html = html.replace(/<br><li>/g, '<li>');

    return html;
}

function _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ── Clear chat ────────────────────────────────────────────────────────────── */
function clearChat() {
    chatHistory = [];
    const msgs = document.getElementById('chat-messages');
    msgs.innerHTML = '';
    _appendWelcome();
}
