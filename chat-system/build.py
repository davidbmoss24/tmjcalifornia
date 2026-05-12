#!/usr/bin/env python3
"""
Build the deployable Cloudflare Worker by inlining the knowledge base
into worker.js. Produces worker.deploy.js, which is what wrangler ships.

Usage:
  python3 build.py

Then:
  wrangler deploy worker.deploy.js --name tmjcalifornia-chat

To update the knowledge base, edit knowledge-base.md and re-run this script.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_WORKER = os.path.join(HERE, "worker.js")
KB_FILE = os.path.join(HERE, "knowledge-base.md")
OUT_WORKER = os.path.join(HERE, "worker.deploy.js")

def main():
    with open(SRC_WORKER, "r", encoding="utf-8") as f:
        worker_src = f.read()
    with open(KB_FILE, "r", encoding="utf-8") as f:
        kb = f.read()

    # JSON-encode the KB to produce a safe JS string literal
    kb_literal = json.dumps(kb, ensure_ascii=False)

    placeholder = "`KNOWLEDGE_BASE_PLACEHOLDER`"
    if placeholder not in worker_src:
        print("ERROR: placeholder not found in worker.js — did you change the variable name?", file=sys.stderr)
        sys.exit(1)

    out = worker_src.replace(placeholder, kb_literal)

    with open(OUT_WORKER, "w", encoding="utf-8") as f:
        f.write(out)

    src_lines = len(worker_src.splitlines())
    out_size_kb = len(out) / 1024
    kb_size_kb = len(kb) / 1024
    print(f"✓ Wrote {OUT_WORKER}")
    print(f"  Source worker: {src_lines} lines")
    print(f"  Knowledge base: {kb_size_kb:.1f} KB")
    print(f"  Total bundle:   {out_size_kb:.1f} KB")
    print()
    print("Deploy with:")
    print("  wrangler deploy worker.deploy.js --name tmjcalifornia-chat")

if __name__ == "__main__":
    main()
