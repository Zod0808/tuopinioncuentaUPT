#!/usr/bin/env bash
#
# purge-xlsx-history.sh
#
# Removes data/tu_opinion_cuenta_2025-II.xlsx and data/tu_opinion_cuenta_2026-I.xlsx
# from the ENTIRE git history of this repository using git filter-repo.
#
# Motivation: those files were committed in b3e3b24 (2.1.5.0, 2026-05-29) with real
# UPT docente names. Even after replacing them in the working tree, the historical
# versions remain reachable (git checkout b3e3b24 -- data/). Only rewriting history
# removes them.
#
# ⚠️  DESTRUCTIVE. This rewrites every commit from b3e3b24 onward. Consequences:
#     - Every SHA from that point forward changes.
#     - Anyone with a clone or fork must re-clone.
#     - Open PRs against this repo will break.
#     - Tags keep their names but point to the new commits (git filter-repo rewrites refs).
#     - GitHub caches old commits for a while; open a support ticket if you need
#       the old SHAs to become truly unreachable on their side.
#
# Requirements:
#   - Python 3.6+
#   - git-filter-repo (https://github.com/newren/git-filter-repo)
#       pip install git-filter-repo
#
# HOW TO RUN (read every step first):
#   1. Commit or stash any pending work.
#   2. Push a mirror backup somewhere safe (see BACKUP step below).
#   3. Run this script from the repo root:
#        bash scripts/purge-xlsx-history.sh
#   4. Verify locally (see VERIFY step at the bottom of this file).
#   5. Force-push (this is the point of no return):
#        git push origin --force --all
#        git push origin --force --tags
#   6. Tell any collaborator to re-clone. Delete their old clones.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

# ---------- Preflight ----------
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "ERROR: git-filter-repo not installed."
  echo "Install with: pip install git-filter-repo"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree not clean. Commit or stash first."
  git status --short
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: $CURRENT_BRANCH"

# ---------- Backup ----------
BACKUP_DIR="$REPO_ROOT/../tuopinioncuentaUPT-backup-$(date +%Y%m%d-%H%M%S).git"
echo
echo "Creating mirror backup at: $BACKUP_DIR"
git clone --mirror "$REPO_ROOT" "$BACKUP_DIR"
echo "Backup created. If anything goes wrong, restore with:"
echo "  cd $REPO_ROOT && git remote set-url origin $BACKUP_DIR && git fetch origin"
echo

# ---------- Confirm ----------
read -r -p "About to REWRITE HISTORY. Type 'PURGE' to continue: " CONFIRM
if [[ "$CONFIRM" != "PURGE" ]]; then
  echo "Aborted."
  exit 1
fi

# ---------- Purge ----------
# --invert-paths keeps everything EXCEPT the listed paths.
# --force is required because filter-repo refuses on a non-fresh clone by default.
git filter-repo \
  --path 'data/tu_opinion_cuenta_2025-II.xlsx' \
  --path 'data/tu_opinion_cuenta_2026-I.xlsx' \
  --invert-paths \
  --force

echo
echo "History rewritten. filter-repo removed 'origin' as a safety measure."
echo "Re-adding origin: https://github.com/Zod0808/tuopinioncuentaUPT.git"
git remote add origin https://github.com/Zod0808/tuopinioncuentaUPT.git

# ---------- Verify ----------
echo
echo "VERIFY: the following two commands MUST return empty output."
echo
echo "1) No commit references the purged files anymore:"
git log --all --oneline -- data/tu_opinion_cuenta_2025-II.xlsx data/tu_opinion_cuenta_2026-I.xlsx || true
echo
echo "2) Real names are gone from the whole history."
echo "   Replace <SAMPLE_NAME> below with any real docente surname you know was in the sheets,"
echo "   then run:  git grep -I -n '<SAMPLE_NAME>' \$(git rev-list --all)"
echo

echo "If both were empty, run these to publish:"
echo "  git push origin --force --all"
echo "  git push origin --force --tags"
echo
echo "After pushing, open a GitHub support ticket if you want the old commit SHAs"
echo "(which may remain accessible via direct URL for a while) purged from GitHub caches."
