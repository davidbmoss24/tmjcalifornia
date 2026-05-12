/**
 * TMJ California — Chat Widget
 *
 * A self-contained chat widget. Drop this script tag at the end of <body>:
 *
 *   <script
 *     src="chat-widget.js"
 *     data-endpoint="https://tmjcalifornia-chat.<your-subdomain>.workers.dev/chat"
 *     defer></script>
 *
 * Configuration via data-* attributes on the script tag:
 *   data-endpoint       — required, Worker /chat URL
 *   data-accent         — optional, accent color (default: #0E8987 to match v1)
 *   data-greeting       — optional, opening message text
 */
(function () {
  'use strict';

  // ----- Configuration -----
  const scriptTag = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  const ENDPOINT = scriptTag.dataset.endpoint;
  const ACCENT = scriptTag.dataset.accent || '#0E8987';
  const ACCENT_DEEP = '#1F4E4D';
  const GREETING = scriptTag.dataset.greeting ||
    "Hi — I'm an AI assistant trained on Dr. Jennings' published work and 40 years of clinical material. Ask me anything about TMJ, the conditions he treats, or how his approach works.";
  const SUGGESTED_QUESTIONS = [
    'How can Dr. Jennings help with Parkinson’s disease?',
    'Will this help with snoring?',
    'What is substance P and why does it matter?',
    'How long does treatment take and what does it cost?',
    'Why is your approach different from regular dentistry?',
  ];

  if (!ENDPOINT) {
    console.warn('[Chat widget] Missing data-endpoint attribute on script tag. Not initializing.');
    return;
  }

  // ----- Styles -----
  const CSS = `
    .tmj-chat-launcher {
      position: fixed; bottom: 20px; right: 20px; z-index: 9998;
      display: flex; align-items: center; gap: 0.6rem;
      background: ${ACCENT}; color: #fff;
      padding: 0.85rem 1.3rem; border-radius: 999px;
      font: 600 0.95rem/1 'Inter', system-ui, sans-serif;
      border: none; cursor: pointer;
      box-shadow: 0 8px 24px rgba(14,137,135,0.35);
      transition: transform .15s, box-shadow .15s, background .15s;
    }
    .tmj-chat-launcher:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(14,137,135,0.4); }
    .tmj-chat-launcher.is-hidden { display: none; }
    .tmj-chat-launcher svg { width: 18px; height: 18px; flex-shrink: 0; }
    @keyframes tmj-pulse {
      0%, 100% { box-shadow: 0 8px 24px rgba(14,137,135,0.35), 0 0 0 0 rgba(14,137,135,0.35); }
      50%      { box-shadow: 0 8px 24px rgba(14,137,135,0.35), 0 0 0 12px rgba(14,137,135,0); }
    }
    .tmj-chat-launcher.is-hint { animation: tmj-pulse 2s ease-in-out infinite; }

    .tmj-chat-panel {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      width: min(420px, calc(100vw - 40px));
      height: min(640px, calc(100vh - 40px));
      background: #fff; border-radius: 16px;
      box-shadow: 0 24px 64px rgba(10,14,19,0.22);
      display: none; flex-direction: column; overflow: hidden;
      font: 400 15px/1.55 'Inter', system-ui, sans-serif; color: #1A2233;
    }
    .tmj-chat-panel.is-open { display: flex; }

    .tmj-chat-header {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.1rem;
      background: ${ACCENT_DEEP}; color: #fff;
      flex-shrink: 0;
    }
    .tmj-chat-header-mark {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP});
      display: flex; align-items: center; justify-content: center;
      font: 600 0.9rem 'Cormorant Garamond', Georgia, serif;
      flex-shrink: 0;
    }
    .tmj-chat-header-meta { flex: 1; min-width: 0; }
    .tmj-chat-header-title { font: 600 1rem 'Cormorant Garamond', Georgia, serif; letter-spacing: -.01em; }
    .tmj-chat-header-sub { font-size: 0.78rem; opacity: 0.85; margin-top: 1px; }
    .tmj-chat-close, .tmj-chat-new {
      background: none; border: none; color: #fff; cursor: pointer;
      opacity: 0.85; padding: 6px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
    }
    .tmj-chat-close:hover, .tmj-chat-new:hover {
      opacity: 1; background: rgba(255,255,255,0.08);
    }
    .tmj-chat-close svg, .tmj-chat-new svg { width: 18px; height: 18px; }

    .tmj-chat-body {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 1rem 1.1rem 0.6rem;
      background: #FAFAF7;
    }
    .tmj-chat-msg { margin-bottom: 0.85rem; max-width: 92%; }
    .tmj-chat-msg-user {
      margin-left: auto;
      background: ${ACCENT}; color: #fff;
      padding: 0.65rem 0.9rem; border-radius: 14px 14px 4px 14px;
      font-size: 0.93rem; line-height: 1.45;
    }
    .tmj-chat-msg-assistant {
      background: #fff; color: #1A2233;
      padding: 0.7rem 0.95rem; border-radius: 14px 14px 14px 4px;
      font-size: 0.95rem; line-height: 1.55;
      border: 1px solid #E8E4DC;
    }
    .tmj-chat-msg-assistant p { margin: 0 0 0.55rem; }
    .tmj-chat-msg-assistant p:last-child { margin-bottom: 0; }
    .tmj-chat-msg-assistant ul, .tmj-chat-msg-assistant ol { margin: 0 0 0.55rem; padding-left: 1.3rem; }
    .tmj-chat-msg-assistant li { margin-bottom: 0.25rem; }
    .tmj-chat-msg-assistant strong { font-weight: 600; }
    .tmj-chat-msg-assistant em { font-style: italic; }
    .tmj-chat-msg-assistant a { color: ${ACCENT_DEEP}; text-decoration: underline; }

    .tmj-chat-typing {
      display: inline-flex; gap: 4px; padding: 0.25rem 0;
    }
    .tmj-chat-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: #8A8F9C;
      animation: tmj-bounce 1.4s infinite ease-in-out both;
    }
    .tmj-chat-typing span:nth-child(1) { animation-delay: -0.32s; }
    .tmj-chat-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes tmj-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    .tmj-chat-suggestions {
      display: flex; flex-direction: column; gap: 0.4rem;
      margin: 0.5rem 0 0.6rem;
    }
    .tmj-chat-suggestion {
      text-align: left; background: #fff; border: 1px solid #E8E4DC;
      padding: 0.55rem 0.8rem; border-radius: 8px; cursor: pointer;
      font: 400 0.88rem 'Inter', sans-serif; color: #1A2233;
      transition: border-color .15s, background .15s, transform .15s;
    }
    .tmj-chat-suggestion:hover {
      border-color: ${ACCENT}; background: #F2F9F8;
    }

    .tmj-chat-input-area {
      flex-shrink: 0;
      border-top: 1px solid #E8E4DC;
      padding: 0.75rem 0.85rem;
      background: #fff;
    }
    .tmj-chat-form { display: flex; gap: 0.5rem; align-items: flex-end; }
    .tmj-chat-input {
      flex: 1; min-height: 38px; max-height: 110px;
      border: 1px solid #E8E4DC; border-radius: 10px;
      padding: 0.55rem 0.8rem;
      font: 400 0.92rem/1.4 'Inter', system-ui, sans-serif;
      color: #1A2233; background: #FAFAF7;
      resize: none; transition: border-color .15s, background .15s;
    }
    .tmj-chat-input:focus { outline: none; border-color: ${ACCENT}; background: #fff; }
    .tmj-chat-send {
      flex-shrink: 0; width: 38px; height: 38px;
      background: ${ACCENT}; color: #fff; border: none; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .15s, opacity .15s;
    }
    .tmj-chat-send:hover:not(:disabled) { background: ${ACCENT_DEEP}; }
    .tmj-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .tmj-chat-send svg { width: 18px; height: 18px; }

    .tmj-chat-disclaimer {
      font-size: 0.72rem; color: #8A8F9C;
      text-align: center; padding: 0.45rem 0 0; line-height: 1.4;
    }
    .tmj-chat-disclaimer a { color: ${ACCENT_DEEP}; }

    .tmj-chat-error {
      background: #FEE; color: #8B1A1A;
      padding: 0.6rem 0.85rem; border-radius: 8px;
      font-size: 0.85rem; margin-bottom: 0.7rem;
    }
  `;

  // ----- Inject styles -----
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ----- Build DOM -----
  const launcher = document.createElement('button');
  launcher.className = 'tmj-chat-launcher is-hint';
  launcher.setAttribute('aria-label', 'Open chat with Dr. Jennings assistant');
  launcher.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
    Ask a question
  `;
  document.body.appendChild(launcher);

  const panel = document.createElement('div');
  panel.className = 'tmj-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with the Dr. Jennings assistant');
  panel.innerHTML = `
    <div class="tmj-chat-header">
      <div class="tmj-chat-header-mark">TC</div>
      <div class="tmj-chat-header-meta">
        <div class="tmj-chat-header-title">TMJ California assistant</div>
        <div class="tmj-chat-header-sub">AI-powered · informational only</div>
      </div>
      <button class="tmj-chat-new" aria-label="Start new conversation" title="New conversation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/>
        </svg>
      </button>
      <button class="tmj-chat-close" aria-label="Close chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="tmj-chat-body" id="tmj-chat-body"></div>
    <div class="tmj-chat-input-area">
      <form class="tmj-chat-form">
        <textarea class="tmj-chat-input" placeholder="Ask a question…" rows="1" aria-label="Type your question"></textarea>
        <button type="submit" class="tmj-chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
      <div class="tmj-chat-disclaimer">
        <div>Informational only — not a substitute for a consultation.</div>
        <div>Call (510) 522-6828 or use the <a href="#contact" data-page="contact">contact form</a> to talk to Dr. Jennings.</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const bodyEl = panel.querySelector('.tmj-chat-body');
  const formEl = panel.querySelector('.tmj-chat-form');
  const inputEl = panel.querySelector('.tmj-chat-input');
  const sendEl = panel.querySelector('.tmj-chat-send');
  const closeEl = panel.querySelector('.tmj-chat-close');
  const newEl = panel.querySelector('.tmj-chat-new');

  // ----- Conversation state -----
  const messages = []; // {role: 'user'|'assistant', content: string}

  function scrollToBottom() {
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function renderGreeting() {
    bodyEl.innerHTML = '';
    const greetEl = document.createElement('div');
    greetEl.className = 'tmj-chat-msg tmj-chat-msg-assistant';
    greetEl.innerHTML = `<p>${escapeHtml(GREETING)}</p>`;
    bodyEl.appendChild(greetEl);

    const suggBox = document.createElement('div');
    suggBox.className = 'tmj-chat-suggestions';
    SUGGESTED_QUESTIONS.forEach(function (q) {
      const btn = document.createElement('button');
      btn.className = 'tmj-chat-suggestion';
      btn.type = 'button';
      btn.textContent = q;
      btn.addEventListener('click', function () { send(q); });
      suggBox.appendChild(btn);
    });
    bodyEl.appendChild(suggBox);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'tmj-chat-msg tmj-chat-msg-user';
    el.textContent = text;
    bodyEl.appendChild(el);
    scrollToBottom();
  }

  function addAssistantMessageContainer() {
    const el = document.createElement('div');
    el.className = 'tmj-chat-msg tmj-chat-msg-assistant';
    const typing = document.createElement('div');
    typing.className = 'tmj-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(typing);
    bodyEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showError(text) {
    const el = document.createElement('div');
    el.className = 'tmj-chat-error';
    el.textContent = text;
    bodyEl.appendChild(el);
    scrollToBottom();
  }

  // Minimal Markdown → HTML for assistant messages. Handles bold, italic, links, paragraphs, lists.
  function renderMarkdown(text) {
    // Escape, then convert minimal Markdown.
    let html = escapeHtml(text);
    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* (but not part of bold)
    html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Markdown links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Convert paragraphs (split by blank lines)
    const paras = html.split(/\n{2,}/);
    return paras.map(function (p) {
      // Bulleted list?
      if (/^\s*[-•]\s/.test(p)) {
        const items = p.split(/\n/).map(function (line) {
          return '<li>' + line.replace(/^\s*[-•]\s/, '') + '</li>';
        }).join('');
        return '<ul>' + items + '</ul>';
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ----- Send message + stream response -----
  let sending = false;
  async function send(text) {
    if (sending) return;
    text = (text || '').trim();
    if (!text) return;

    sending = true;
    sendEl.disabled = true;
    inputEl.disabled = true;

    // Hide any open suggestion buttons after first send
    const sugg = bodyEl.querySelector('.tmj-chat-suggestions');
    if (sugg) sugg.remove();

    addUserMessage(text);
    messages.push({ role: 'user', content: text });
    inputEl.value = '';
    autosize(inputEl);

    const containerEl = addAssistantMessageContainer();

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!resp.ok) {
        let errText = '';
        try { errText = (await resp.json()).error; } catch (_) { errText = 'Server error: ' + resp.status; }
        containerEl.remove();
        showError(errText || 'Sorry, something went wrong. Please try again.');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let firstDelta = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: split by double-newline
        const events = buffer.split('\n\n');
        buffer = events.pop(); // keep incomplete final event

        for (const evt of events) {
          const lines = evt.split('\n');
          let eventType = '';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) data += line.slice(6);
          }
          if (!data) continue;
          let parsed;
          try { parsed = JSON.parse(data); } catch (_) { continue; }

          if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.type === 'text_delta') {
            if (firstDelta) {
              containerEl.innerHTML = '';
              firstDelta = false;
            }
            assistantText += parsed.delta.text;
            containerEl.innerHTML = renderMarkdown(assistantText);
            scrollToBottom();
          } else if (parsed.type === 'message_stop') {
            // done
          } else if (parsed.type === 'error') {
            containerEl.remove();
            showError((parsed.error && parsed.error.message) || 'Stream error.');
            return;
          }
        }
      }

      if (assistantText) {
        messages.push({ role: 'assistant', content: assistantText });
      } else {
        containerEl.remove();
        showError('Sorry, I didn\'t get a response. Please try again.');
      }
    } catch (e) {
      containerEl.remove();
      showError('Network error: ' + e.message);
    } finally {
      sending = false;
      sendEl.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  // ----- Wire events -----
  function openPanel() {
    panel.classList.add('is-open');
    launcher.classList.add('is-hidden');
    launcher.classList.remove('is-hint');
    if (messages.length === 0) renderGreeting();
    inputEl.focus();
  }
  function closePanel() {
    panel.classList.remove('is-open');
    launcher.classList.remove('is-hidden');
  }

  launcher.addEventListener('click', openPanel);
  closeEl.addEventListener('click', closePanel);

  newEl.addEventListener('click', function () {
    // If there's an active conversation, confirm before wiping.
    if (messages.length > 0) {
      if (!confirm('Start a new conversation? Your current chat will be cleared.')) return;
    }
    messages.length = 0;
    renderGreeting();
    inputEl.focus();
  });

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    send(inputEl.value);
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputEl.value);
    }
  });
  inputEl.addEventListener('input', function () { autosize(inputEl); });

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(110, el.scrollHeight) + 'px';
  }

  // Stop the pulsing animation after 8 seconds — don't annoy people.
  setTimeout(function () { launcher.classList.remove('is-hint'); }, 8000);
})();
