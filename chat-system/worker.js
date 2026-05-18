/**
 * TMJ California — Chat API Worker
 *
 * A thin proxy between the website chat widget and Anthropic's Messages API.
 * Holds the API key as a secret. Loads the knowledge base. Caches the system
 * prompt. Streams responses back to the browser.
 *
 * Endpoints:
 *   POST /chat         — main chat endpoint. Body: { messages: [...] }
 *   POST /contact      — contact form submission. Sends an email to the practice.
 *   GET  /healthz      — quick liveness check
 *
 * Required secrets (set with `wrangler secret put`):
 *   ANTHROPIC_API_KEY  — the practice's Anthropic API key
 *   RESEND_API_KEY     — Resend.com API key, for sending contact-form emails
 *
 * Optional bindings (configured in wrangler.toml):
 *   RATE_LIMIT_KV      — KV namespace for rate limiting (10 req/min/IP)
 *
 * Optional env vars:
 *   ALLOWED_ORIGIN     — CORS origin to allow. Default '*'. Set to your domain in prod.
 *   MODEL              — model to use. Default 'claude-sonnet-4-5-20250929'.
 *   MAX_OUTPUT_TOKENS  — cap on response length. Default 1024.
 *   RATE_LIMIT_PER_MIN — requests per minute per IP. Default 10.
 *   CONTACT_TO         — recipient email for the contact form. Default 'dejdds@gmail.com'.
 *   CONTACT_FROM       — sender for contact emails. Default 'TMJ California <onboarding@resend.dev>'.
 *
 * Deploy:
 *   wrangler deploy
 */

const KNOWLEDGE_BASE = `KNOWLEDGE_BASE_PLACEHOLDER`;

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_RATE_LIMIT = 10;
const MAX_MESSAGES_IN_CONVERSATION = 30;
const MAX_MESSAGE_CONTENT_LENGTH = 12000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    // ----- CORS preflight -----
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin),
      });
    }

    // ----- Health check -----
    if (url.pathname === '/healthz' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true, kb_chars: KNOWLEDGE_BASE.length }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders(allowedOrigin) },
      });
    }

    // ----- Chat endpoint -----
    if (url.pathname === '/chat' && request.method === 'POST') {
      return handleChat(request, env, allowedOrigin);
    }

    // ----- Contact form endpoint -----
    if (url.pathname === '/contact' && request.method === 'POST') {
      return handleContact(request, env, allowedOrigin);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(allowedOrigin) });
  },
};

async function handleChat(request, env, allowedOrigin) {
  // ----- Validate API key is present -----
  if (!env.ANTHROPIC_API_KEY) {
    return jsonError('Server misconfigured: missing ANTHROPIC_API_KEY', 500, allowedOrigin);
  }

  // ----- Rate limit by IP -----
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateLimitPerMin = parseInt(env.RATE_LIMIT_PER_MIN || DEFAULT_RATE_LIMIT, 10);
  if (env.RATE_LIMIT_KV) {
    const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
    const count = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10);
    if (count >= rateLimitPerMin) {
      return jsonError('Rate limit exceeded. Please wait a minute and try again.', 429, allowedOrigin);
    }
    await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 70 });
  }

  // ----- Parse + validate request body -----
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Invalid JSON in request body', 400, allowedOrigin);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('messages must be a non-empty array', 400, allowedOrigin);
  }
  if (messages.length > MAX_MESSAGES_IN_CONVERSATION) {
    return jsonError(
      `Conversation too long. Max ${MAX_MESSAGES_IN_CONVERSATION} messages.`,
      400,
      allowedOrigin
    );
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !m.role || !m.content) {
      return jsonError('Each message must have role and content', 400, allowedOrigin);
    }
    if (m.role !== 'user' && m.role !== 'assistant') {
      return jsonError("Message role must be 'user' or 'assistant'", 400, allowedOrigin);
    }
    if (typeof m.content !== 'string') {
      return jsonError('Message content must be a string', 400, allowedOrigin);
    }
    if (m.content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      return jsonError(
        `Message too long. Max ${MAX_MESSAGE_CONTENT_LENGTH} characters.`,
        400,
        allowedOrigin
      );
    }
  }

  // ----- Call Anthropic Messages API -----
  const model = env.MODEL || DEFAULT_MODEL;
  const maxTokens = parseInt(env.MAX_OUTPUT_TOKENS || DEFAULT_MAX_TOKENS, 10);

  const anthropicPayload = {
    model,
    max_tokens: maxTokens,
    // System prompt with prompt caching enabled — repeated calls within ~5 min
    // reuse the cached system prompt at ~10% of normal input cost.
    system: [
      {
        type: 'text',
        text: KNOWLEDGE_BASE,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
    stream: true,
  };

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicPayload),
    });
  } catch (e) {
    return jsonError('Upstream API error: ' + e.message, 502, allowedOrigin);
  }

  if (!upstream.ok) {
    let errText = '';
    try { errText = await upstream.text(); } catch (_) {}
    return jsonError(
      `Anthropic API returned ${upstream.status}: ${errText.slice(0, 500)}`,
      upstream.status,
      allowedOrigin
    );
  }

  // ----- Stream the response back to the browser -----
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      ...corsHeaders(allowedOrigin),
    },
  });
}

async function handleContact(request, env, allowedOrigin) {
  if (!env.RESEND_API_KEY) {
    return jsonError('Email service not configured: missing RESEND_API_KEY', 500, allowedOrigin);
  }

  // ----- Rate limit by IP (lower than chat — 5/min) -----
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (env.RATE_LIMIT_KV) {
    const key = `rl-contact:${ip}:${Math.floor(Date.now() / 60000)}`;
    const count = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10);
    if (count >= 5) {
      return jsonError('Too many submissions. Please wait a minute and try again.', 429, allowedOrigin);
    }
    await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 70 });
  }

  // ----- Parse + validate body -----
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonError('Invalid JSON in request body', 400, allowedOrigin);
  }

  const required = ['name', 'email', 'symptoms'];
  for (const k of required) {
    const v = (data[k] || '').toString().trim();
    if (!v) return jsonError(`Missing required field: ${k}`, 400, allowedOrigin);
    if (v.length > 5000) return jsonError(`Field too long: ${k}`, 400, allowedOrigin);
  }

  // Basic email sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return jsonError('Please enter a valid email address.', 400, allowedOrigin);
  }

  // ----- Build email body -----
  const cleanLine = (s) => (s || '').toString().replace(/[\r\n]+/g, ' ').trim();
  const cleanBlock = (s) => (s || '').toString().trim();
  const name = cleanLine(data.name);
  const email = cleanLine(data.email);
  const phone = cleanLine(data.phone) || '(not provided)';
  const type = cleanLine(data.type) || '(not specified)';
  const symptoms = cleanBlock(data.symptoms);
  const tried = cleanBlock(data.tried) || '(not provided)';

  const subject = `New patient inquiry — ${name}`;
  const text = [
    `New inquiry from the TMJ California website.`,
    ``,
    `Name:               ${name}`,
    `Email:              ${email}`,
    `Phone:              ${phone}`,
    `Reaching out as:    ${type}`,
    ``,
    `Symptoms / situation:`,
    symptoms,
    ``,
    `Treatments already tried:`,
    tried,
    ``,
    `— Reply directly to this email to contact the patient.`,
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1A2233;line-height:1.55;max-width:640px;">
      <p style="margin:0 0 1rem;color:#5A6273;">New inquiry from the TMJ California website.</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 1.25rem;">
        <tr><td style="padding:4px 12px 4px 0;color:#5A6273;">Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#5A6273;">Email:</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#5A6273;">Phone:</td><td style="padding:4px 0;">${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#5A6273;">As:</td><td style="padding:4px 0;">${escapeHtml(type)}</td></tr>
      </table>
      <h4 style="margin:1.25rem 0 0.5rem;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:#5A6273;">Symptoms / situation</h4>
      <p style="white-space:pre-wrap;margin:0 0 1.25rem;">${escapeHtml(symptoms)}</p>
      <h4 style="margin:1.25rem 0 0.5rem;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:#5A6273;">Treatments already tried</h4>
      <p style="white-space:pre-wrap;margin:0 0 1.25rem;">${escapeHtml(tried)}</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;"/>
      <p style="font-size:13px;color:#5A6273;margin:0;">Reply to this email to contact the patient directly.</p>
    </div>
  `;

  const to = env.CONTACT_TO || 'dejdds@gmail.com';
  const from = env.CONTACT_FROM || 'TMJ California <onboarding@resend.dev>';

  // ----- Send via Resend -----
  let resp;
  try {
    resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
        html,
      }),
    });
  } catch (e) {
    return jsonError('Could not reach email service: ' + e.message, 502, allowedOrigin);
  }

  if (!resp.ok) {
    let errBody = '';
    try { errBody = await resp.text(); } catch (_) {}
    return jsonError(
      `Email service returned ${resp.status}: ${errBody.slice(0, 300)}`,
      502,
      allowedOrigin
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', ...corsHeaders(allowedOrigin) },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
