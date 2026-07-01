#!/bin/bash
set -e  # exit immediately if any command fails

# --- CONFIG ---
# Path to your local repo. Assumes you've cd'd into the repo before running.
REPO_DIR="$(pwd)"
SITE_URL="https://ktaing.framer.website/"

# --- SANITY CHECK ---
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Error: $REPO_DIR doesn't look like a git repo (no .git folder found)."
  echo "cd into your repo directory first, then re-run this script."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "master" ]; then
  echo "Error: you're on branch '$CURRENT_BRANCH', not 'master'."
  echo "GitHub Pages only deploys from pushes to 'master'. Run: git checkout master"
  exit 1
fi

echo "Mirroring $SITE_URL into $REPO_DIR ..."

# -*                          reject everything by default
# +ktaing.framer.website/*    only mirror your own site (not external linked domains)
# -N100                       flatten output: no hostname subfolder, files land in repo root
# -I0                         suppress HTTrack's own "Local index" boilerplate page
# -update -q                  update existing mirror in place, no interactive prompts
httrack "$SITE_URL" -O "$REPO_DIR" "-*" "+ktaing.framer.website/*" -N100 -I0 -update -q

# Because -I0 disables HTTrack's auto-redirect stub, the real homepage content
# lands in index-2.html instead of index.html. Copy it over so index.html
# (the actual file GitHub Pages serves at your root URL) always has the
# correct, current content and metadata for browsers, search engines, and
# social link previews.
if [ -f "$REPO_DIR/index-2.html" ]; then
  cp "$REPO_DIR/index-2.html" "$REPO_DIR/index.html"
fi

# HTTrack stamps a timestamped comment into every HTML file on every run
# (e.g. "<!-- Mirrored from ktaing.framer.website/ by HTTrack ... Wed, 01 Jul 2026 ... -->").
# That timestamp changes every run even when the actual page content hasn't,
# which would otherwise create a noisy commit every time. Strip it out since
# it's just HTTrack's own bookkeeping and has no effect on the live site.
find "$REPO_DIR" -name "*.html" -exec sed -i '' '/Mirrored from ktaing.framer.website/d' {} +

echo "Mirror complete. Checking for changes..."
cd "$REPO_DIR"

if [ -z "$(git status --porcelain)" ]; then
  echo "No changes detected. Nothing to commit."
  exit 0
fi

git add .
git commit -m "Update site mirror: $(date '+%Y-%m-%d %H:%M:%S')"
git push

echo "Done! Site updated and pushed to GitHub Pages."