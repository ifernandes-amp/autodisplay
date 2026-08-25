#!/bin/bash
cd /home/ifernandes/dev/autodisplay || exit 1
LOG=/home/ifernandes/dev/autodisplay/push-result.log
: > "$LOG"
exec >>"$LOG" 2>&1
echo "=== FAST PUBLISH $(date -Iseconds) ==="

echo "=== STEP 1: git status ==="
git -c safe.directory=/home/ifernandes/dev/autodisplay status

echo "=== STEP 2: git log --oneline -5 ==="
git -c safe.directory=/home/ifernandes/dev/autodisplay log --oneline -5 2>/dev/null || echo NO_COMMITS

UNCOMMITTED_BEFORE=$(git status --porcelain | wc -l)
echo "UNCOMMITTED_FILES_BEFORE_STAGE=$UNCOMMITTED_BEFORE"

echo "=== STEP 3: stage exclude env ==="
git -c safe.directory=/home/ifernandes/dev/autodisplay add -A
git -c safe.directory=/home/ifernandes/dev/autodisplay restore --staged appofc/.env appofc/backend/.env .env 2>/dev/null || true

STAGED=$(git diff --cached --name-only | wc -l)
echo "STAGED_FILE_COUNT=$STAGED"
git diff --cached --name-only

echo "=== STEP 4: commit if staged ==="
COMMIT_STATUS=skipped
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo none)
if ! git diff --cached --quiet; then
  if git -c safe.directory=/home/ifernandes/dev/autodisplay commit -m "feat: week 1 delivery (audit, auth, roadmaps)" -m "Deliver week 1 scope including audit flows, authentication setup, and roadmap artifacts."; then
    COMMIT_STATUS=success
    COMMIT_HASH=$(git rev-parse HEAD)
  else
    COMMIT_STATUS=failed
  fi
else
  echo "No staged changes to commit"
fi
echo "COMMIT_STATUS=$COMMIT_STATUS"
echo "COMMIT_HASH=$COMMIT_HASH"

echo "=== STEP 5a: gh switch and repo create ==="
gh auth switch -u igor-autodisplay 2>/dev/null || true
GH_USER=$(gh api user -q .login 2>/dev/null || echo none)
echo "GH_ACTIVE_USER=$GH_USER"

PUSH_STATUS=failed
REPO_URL=none
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo none)
BRANCH=$(git branch --show-current)
echo "BRANCH=$BRANCH"
echo "REMOTE_BEFORE=$REMOTE_URL"

if gh repo create autodisplay --public --source=. --remote=origin --push -y; then
  PUSH_STATUS=success_5a
  REPO_URL=$(gh repo view --json url -q .url 2>/dev/null || echo https://github.com/igor-autodisplay/autodisplay)
else
  echo "STEP 5a FAILED"
  echo "=== STEP 5b: IgorFernandesSantos remote ==="
  TARGET=https://github.com/IgorFernandesSantos/autodisplay.git
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$TARGET"
  else
    git remote add origin "$TARGET"
  fi
  REMOTE_URL=$(git remote get-url origin)
  if git -c safe.directory=/home/ifernandes/dev/autodisplay push -u origin HEAD; then
    PUSH_STATUS=success_5b
    REPO_URL=https://github.com/IgorFernandesSantos/autodisplay
  else
    echo "STEP 5b failed"
    echo "=== STEP 5c: push branches ==="
    if gh api repos/IgorFernandesSantos/autodisplay --jq .name >/dev/null 2>&1; then
      echo "Repo exists"
      OK=0
      git push -u origin feat/semana-1-delivery && OK=1 || true
      if git show-ref --verify --quiet refs/heads/main; then
        git push -u origin main || true
      fi
      if [ "$OK" = 1 ]; then PUSH_STATUS=success_5c; fi
      REPO_URL=https://github.com/IgorFernandesSantos/autodisplay
    else
      echo "IgorFernandesSantos/autodisplay not found"
    fi
  fi
fi

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo none)
echo "=== REPORT ==="
echo "GH_ACTIVE_USER=$GH_USER"
echo "REMOTE_URL=$REMOTE_URL"
echo "COMMIT_HASH=$COMMIT_HASH"
echo "PUSH_STATUS=$PUSH_STATUS"
echo "REPO_URL=$REPO_URL"
echo "UNCOMMITTED_FILES_BEFORE_STAGE=$UNCOMMITTED_BEFORE"

echo "=== git log -3 ==="
git -c safe.directory=/home/ifernandes/dev/autodisplay log --oneline -3 2>/dev/null || echo NO_COMMITS

echo "=== DONE $(date -Iseconds) ==="
