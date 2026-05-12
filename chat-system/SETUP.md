# Chat System — Setup Guide

The AI chat for tmjcalifornia.expertaisys.com is two pieces:

1. **A Cloudflare Worker** (`worker.deploy.js`) — proxies questions to Anthropic, holds the API key, streams responses
2. **A chat widget** (`chat-widget.js`) — drops onto every page, opens the chat panel, talks to the Worker

The Worker holds the API key as a Cloudflare secret. The browser never sees it.

---

## Prerequisites

- An Anthropic API key from <https://console.anthropic.com>
  - Sonnet 4.5 is the default model — typical cost is **5–20 cents per chat conversation** with prompt caching enabled
- `wrangler` installed locally (Cloudflare's CLI):

  ```bash
  npm install -g wrangler
  wrangler login
  ```

- The same Cloudflare account that hosts the Pages site

---

## Step 1 — Build the Worker bundle

Every time you edit `knowledge-base.md`, regenerate the deployable file:

```bash
cd chat-system
python3 build.py
```

This produces `worker.deploy.js` with the knowledge base inlined.

---

## Step 2 — Add your API key as a secret

```bash
cd chat-system
wrangler secret put ANTHROPIC_API_KEY
```

Wrangler will prompt for the key — paste it. It's stored encrypted on Cloudflare's side; the browser never sees it.

---

## Step 3 — (Optional) Create a KV namespace for rate limiting

Without this, the Worker still works but doesn't rate-limit. With it, each IP is capped at 10 requests/minute (configurable).

```bash
cd chat-system
wrangler kv namespace create chat_rate_limit
```

It'll print a namespace `id`. Uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and paste the id there.

---

## Step 4 — Deploy the Worker

```bash
cd chat-system
wrangler deploy
```

Wrangler will print a URL like:

```
https://tmjcalifornia-chat.<your-subdomain>.workers.dev
```

Note that URL. The next step wires it into the website.

Sanity-check the deploy:

```bash
curl https://tmjcalifornia-chat.<your-subdomain>.workers.dev/healthz
```

You should see `{"ok":true,"kb_chars":32586}` (number will vary based on the KB size).

---

## Step 5 — Point the website chat widget at the Worker

Edit `Mockup-v1/index.html` near the bottom and replace `YOUR-SUBDOMAIN` with your actual Workers subdomain:

```html
<script
  src="chat-widget.js"
  data-endpoint="https://tmjcalifornia-chat.YOUR-SUBDOMAIN.workers.dev/chat"
  defer></script>
```

Make sure `chat-widget.js` is in the same folder as `index.html` — when you deploy the Pages site, it ships along with everything else.

---

## Step 6 — Lock down CORS once you have a real domain

While testing, the Worker accepts requests from any origin (`ALLOWED_ORIGIN = "*"`). Once the site is live at `https://tmjcalifornia.expertaisys.com`, change the `[vars]` block in `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://tmjcalifornia.expertaisys.com"
```

Then re-deploy:

```bash
wrangler deploy
```

Now only the production site can call the Worker — important because every call costs API credits.

---

## Step 7 — (Optional) Custom domain for the Worker

By default the Worker is at `tmjcalifornia-chat.<subdomain>.workers.dev`. If you'd rather it be at e.g. `chat.tmjcalifornia.expertaisys.com`, uncomment the `[[routes]]` block in `wrangler.toml`, then re-deploy.

---

## How to update the knowledge base later

The chat answers are only as good as the knowledge base. To improve:

1. Edit `knowledge-base.md` — add new case histories, citations, FAQs, etc.
2. Run `python3 build.py` to regenerate `worker.deploy.js`
3. Run `wrangler deploy`

The cache automatically invalidates when the Worker redeploys, so you don't pay for stale cache. The next conversation starts paying for the new system prompt; subsequent conversations within 5 min reuse it.

---

## Cost-watching

- Anthropic charges in two parts: input tokens (your system prompt + question) and output tokens (the answer).
- With prompt caching enabled (which this Worker does), the system prompt is cached for ~5 minutes after each use. Reads from cache cost ~10% of normal input cost.
- Realistic numbers:
  - First conversation in a 5-min window: pays full ~$0.10 for the system prompt + ~$0.01 per question/answer
  - Subsequent conversations in the same 5-min window: ~$0.01–0.02 each
- A practice with ~100 chat conversations a month should pay $2–10/month at Sonnet 4.5 prices.

Monitor usage at: <https://console.anthropic.com/usage>

If costs get out of hand, switch the model to Haiku 4.5 by editing `wrangler.toml`:

```toml
[vars]
MODEL = "claude-haiku-4-5-20251001"
```

Then re-deploy. Haiku is 5–7× cheaper and still very capable for this kind of Q&A.

---

## Troubleshooting

**Chat panel doesn't open / launcher doesn't appear**
Check browser dev console for errors. Most likely cause: `data-endpoint` is wrong or missing, or `chat-widget.js` couldn't load.

**Chat opens but says "Network error" on send**
Check the Worker is deployed: `curl https://tmjcalifornia-chat.<subdomain>.workers.dev/healthz`
Check CORS: the `ALLOWED_ORIGIN` in `wrangler.toml` must match the site's exact origin (including `https://`).

**Chat says "Server misconfigured: missing ANTHROPIC_API_KEY"**
Run `wrangler secret put ANTHROPIC_API_KEY` and paste your key.

**Chat says "Rate limit exceeded"**
Wait a minute, or raise `RATE_LIMIT_PER_MIN` in `wrangler.toml`.

**Hallucinated answers**
The knowledge base is the source of truth. If the model is making things up, the knowledge base is missing that information — add it to `knowledge-base.md` and re-deploy. Hard rules at the top of the KB tell the model to refuse questions it doesn't have source material for, but the rules are advisory; if a section seems thin, beef it up.

---

## Files in this folder

| File | Purpose |
| --- | --- |
| `knowledge-base.md` | The corpus the AI is grounded on. Edit this to teach it new things. |
| `worker.js` | Worker source code. Edit only if you want to change behavior (rate limit, model, etc.) |
| `wrangler.toml` | Cloudflare deployment config |
| `build.py` | Bundles knowledge-base.md into worker.deploy.js |
| `worker.deploy.js` | The compiled deployable file (generated, do not edit) |
| `chat-widget.js` | The browser-side widget. Copy this to the Pages site folder. |
| `SETUP.md` | This file. |
