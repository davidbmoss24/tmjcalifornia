# TMJ California — Archived Site Capture

Source: `https://web.archive.org/web/20240914152439/https://tmjcalifornia.com/`
Captured: May 8, 2026

This folder contains everything that was preserved in the Internet Archive's
Wayback Machine for **tmjcalifornia.com** — Dr. Dwight Jennings' practice
website — captured around the September 2024 snapshot. It's the working
foundation for rebuilding the site.

## What's here

| Folder | Purpose |
| --- | --- |
| `markdown/` | **Use this.** Clean Markdown extracted from each archived page — strip-out of WordPress chrome, ready to read, edit, or feed into a new site. 16 pages total. |
| `images_flat/` | **Use this.** All captured images flattened into one folder with their original filenames. Markdown references point here. |
| `documents_flat/` | **Use this.** All captured PDFs/documents flattened. |
| `images/` | As-archived images, preserved with the original WordPress nested path (`wp-content/uploads/...`). For reference only. |
| `documents/` | As-archived documents with original nested path. For reference only. |
| `raw_html/` | The original HTML files exactly as the archive served them, including the WordPress theme markup. Useful if Markdown lost something you need to recover. |
| `.state/` | Tooling, CDX listings, URL→file index, and the conversion scripts. Safe to ignore. |

> Note: We tried to delete the as-archived nested folders (`images/wp-content/...`)
> after flattening, but the workspace mount only allows additive writes from the
> sandbox. They're harmless duplicates — treat the `_flat` versions as canonical.

## Pages captured

These are the 16 unique HTML pages that the Wayback Machine had snapshots for.

### Core site pages

- [`home.md`](markdown/home.md) — _Dental Orthopedics in Alameda, CA_ — landing page with practice intro and featured articles
- [`about-us.md`](markdown/about-us.md) — _A Team of Reliable Dental Orthopedic Specialists_ — practice overview, Dr. Jennings bio, location info
- [`services-provided.md`](markdown/services-provided.md) — _Effective Dental Orthopedic Treatments_ — services list, dental orthopedics explanation, Dr. Jennings background
- [`what-is-tmj.md`](markdown/what-is-tmj.md) — _What is TMJ?_ — patient-education page
- [`what-are-headaches.md`](markdown/what-are-headaches.md) — _What are Headaches?_ — patient-education page on headache causes and TMJ link
- [`tmj-associated-medical-disorders.md`](markdown/tmj-associated-medical-disorders.md) — list of medical conditions linked to TMJ dysfunction
- [`case-histories.md`](markdown/case-histories.md) — patient case studies / testimonials
- [`articles-presentations-blog.md`](markdown/articles-presentations-blog.md) — index of articles, presentations, and blog posts
- [`contact.md`](markdown/contact.md) — practice contact info, hours, address, phone
- [`author/pwsadmin.md`](markdown/author/pwsadmin.md) — author archive (mostly auto-generated)

### Blog posts (all dated March 2021 in URL but content predates)

- [`2021/03/most-all-modern-humans-have-substantial-craniomandibular-dysfunction.md`](markdown/2021/03/most-all-modern-humans-have-substantial-craniomandibular-dysfunction.md)
- [`2021/03/multiple-articles.md`](markdown/2021/03/multiple-articles.md)
- [`2021/03/other-articles.md`](markdown/2021/03/other-articles.md)
- [`2021/03/the-connection.md`](markdown/2021/03/the-connection.md)
- [`2021/03/tmj-and-systemic-healththe-missing-link.md`](markdown/2021/03/tmj-and-systemic-healththe-missing-link.md)
- [`2021/03/tourettes-and-othermovement-disorders.md`](markdown/2021/03/tourettes-and-othermovement-disorders.md)

## Images captured (17 source + 3 thumbnails)

All in `images_flat/`. Brief notes on each:

| File | Notes |
| --- | --- |
| `tmjcalifornia.png`, `tmjcalifornia-2.png`, `tmjcalifornia-6.png`, `tmjcalifornia-7.png` | Logo / brand mark variations |
| `cropped-favicon-2-1-32x32.png`, `cropped-favicon-2-1-192x192.png` | Favicons |
| `dental-xray-with-hand-pointing-scaled.jpg`, `dental-xray-with-hand-pointing-1-scaled.jpg` | Clinical x-ray imagery |
| `dj_headshots_101-200x300-1.jpg` | Dr. Jennings headshot (small) |
| `fmf88951.png`, `fmf_121794.jpg`, `fmf_33541-scaled.jpg`, `fmf_4920-scaled.jpg`, `fmf_Pg0akR.jpg` | Hero / feature photography (vendor stock, "fmf" prefix) |
| `sea-sunset-3.jpg` | Background landscape image |
| `blu-stripes.png` | Decorative pattern (1KB) |
| `bb-plugin-thumbnails/dental-xray-of-jaw-custom_crop.jpg` | Article thumbnail used on home page |
| `bb-plugin-thumbnails/dental-xray-scaled-custom_crop.jpg` | Article thumbnail |
| `bb-plugin-thumbnails/fmf99779-1024x650-1-custom_crop.jpg` | Article thumbnail |

## Documents captured

- [`documents_flat/New-model-of-Occlusion.pdf`](documents_flat/New-model-of-Occlusion.pdf) — PDF (~800 KB), Dr. Jennings' paper on a new model of dental occlusion. Linked from the services page.

## Notes for the rebuild

A few things worth knowing as you plan the new site:

- The original site ran on WordPress with the GoDaddy Website Builder / Beaver Builder theme. A lot of what we stripped from the HTML was layout markup duplicated for desktop/mobile rendering — the actual prose is the asset.
- Contact info on the captured snapshot: **(510) 522-6828**, fax **(510) 522-0877**, email **dejdds@aol.com**, address **2187 Harbor Bay Pkwy., Alameda, CA 94502**, hours **Monday–Thursday 7 AM – 4 PM**. Verify these are still current before they go on the new site.
- The "blog posts" all share a date of March 2021 in their URLs, but the prose inside several of them references events from 2012–2016 — they're a republished archive of older writing, not original 2021 posts. Keep that in mind for editorial framing.
- Several pages reference an external paper PDF (`Biochemical-Principles.pdf`) hosted on the GoDaddy CDN. It was NOT in the Wayback snapshot — only `New-model-of-Occlusion.pdf` survived. If you need that other paper, ask Dr. Jennings for a fresh copy.
- The live site (tmjcalifornia.com) is still up as of capture date and uses a similar but slightly different WordPress build. If you want, we can also pull the live site for comparison.
