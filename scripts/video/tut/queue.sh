#!/bin/bash
# renders the given slugs one after another in 4K
cd "$(dirname "$0")"
for s in "$@"; do python3 render.py "$s" > "videos/$s/render.log" 2>&1; done
