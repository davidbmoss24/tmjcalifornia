# tmjcalifornia.com — site rebuild

A new website for **Dr. Dwight Jennings, DDS, MICCMO** — Northern California Cranio-Facial Diagnostic Center. Replaces the GoDaddy-WSB original at tmjcalifornia.com.

Hosted at `tmjcalifornia.expertaisys.com` via Cloudflare Pages. AI chat backed by a Cloudflare Worker proxying to the Anthropic API.

---

## What's in here

| Folder | Purpose |
| --- | --- |
| `Mockup-v1/` | **The site.** Calm clinical aesthetic — what gets deployed to Cloudflare Pages. |
| `Mockup-v2/` | Alternate modern-tech aesthetic — design exploration, not currently deployed. |
| `chat-system/` | Cloudflare Worker + knowledge base + chat widget. See `chat-system/SETUP.md`. |
| `archive_capture/` | Distilled content captured from the original Wayback site. `markdown/`, `images_flat/`, `documents_flat/` are the canonical references. |
| `references/` | Knowledge brief synthesizing the peer-reviewed science behind Dr. Jennings' framework. `references/KNOWLEDGE_BRIEF.md` is the source of truth on the "what's solid vs. what's framing" split. |
| `slide_extractions/CASE_STUDIES.md` | Writeups of the four imaging case studies from Dr. Jennings' slide deck. |
| `podcast_transcripts/` | Summaries of 14+ podcast appearances. Most useful for finding direct quotes by topic. |
| `Strategy-Memo.md` | The positioning, audience, and sitemap rationale for the rebuild. |
| `diagram-text-content.md` | Text-only export of the cascade diagram for use in other design tools. |

## Quick deploy

**Site (Cloudflare Pages):**
- Connect this repo on Cloudflare Pages. Build settings: no build command. Output directory: `Mockup-v1`.
- Set custom domain to `tmjcalifornia.expertaisys.com`.

**Chat (Cloudflare Worker):**
- See [`chat-system/SETUP.md`](chat-system/SETUP.md) for the wrangler-based deploy. ~5 minute setup.

## Working on this

To rebuild the chat knowledge base after editing `chat-system/knowledge-base.md`:

```bash
cd chat-system
python3 build.py
wrangler deploy
```

To preview the site locally — just open `Mockup-v1/index.html` in a browser. There's no build step; it's plain HTML/CSS/JS.

## What's *not* in this repo (intentionally)

- The original 12 MB PowerPoint and the source PDF (preserved locally outside git; content captured in `slide_extractions/CASE_STUDIES.md`)
- 25 third-party research papers Dr. Jennings cited (copyright belongs to the journal publishers; we keep them for his referral packets, not public hosting)
- Crawler state files, raw HTML mirror, bulk PDF page renders, embedded PPT media — derived assets that take up 100+ MB

See `.gitignore` for the full exclusion list.

---

© Dwight Jennings, DDS. The site code is custom for this practice; the medical content reflects Dr. Jennings' own published work and clinical experience.
