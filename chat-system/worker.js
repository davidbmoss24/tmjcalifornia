/**
 * TMJ California — Chat API Worker
 *
 * A thin proxy between the website chat widget and Anthropic's Messages API.
 * Holds the API key as a secret. Loads the knowledge base. Caches the system
 * prompt. Streams responses back to the browser.
 *
 * Endpoints:
 *   POST /chat         — main chat endpoint. Body: { messages: [...] }
 *   GET  /healthz      — quick liveness check
 *
 * Required secrets (set with `wrangler secret put`):
 *   ANTHROPIC_API_KEY  — the practice's Anthropic API key
 *
 * Optional bindings (configured in wrangler.toml):
 *   RATE_LIMIT_KV      — KV namespace for rate limiting (10 req/min/IP)
 *
 * Optional env vars:
 *   ALLOWED_ORIGIN     — CORS origin to allow. Default '*'. Set to your domain in prod.
 *   MODEL              — model to use. Default 'claude-sonnet-4-5-20250929'.
 *   MAX_OUTPUT_TOKENS  — cap on response length. Default 1024.
 *   RATE_LIMIT_PER_MIN — requests per minute per IP. Default 10.
 *
 * Deploy:
 *   wrangler deploy
 */

const KNOWLEDGE_BASE = `KNOWLEDGE_BASE_PLACEHOLDER`;

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_RATE_LIMIT = 10;
const MAX_MESSAGES_IN_CONVERSATION = 30;
const MAX_USER_INPUT_LENGTH = 2000;

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
    if (m.content.length > MAX_USER_INPUT_LENGTH) {
      return jsonError(
        `Message too long. Max ${MAX_USER_INPUT_LENGTH} characters.`,
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
