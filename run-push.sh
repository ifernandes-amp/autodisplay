#!/usr/bin/env bash
set -uo pipefail
LOG="/home/ifernandes/dev/autodisplay/push-result.log"
exec > >(tee "$LOG") 2>&1

echo "=== PUSH RAPIDO $(date -Iseconds) ==="
cd /home/ifernandes/dev/autodisplay || exit 1
export PATH="$HOME/.bun/bin:$PATH"

# 0. git init if needed
if [ ! -d .git ]; then
  git init
  git branch -M main
  echo "GIT_INIT=done"
else
  echo "GIT_INIT=already"
fi

# 1. env check
ENV_OK=true
for f in appofc/.env appofc/backend/.env; do
  if git check-ignore -q "$f" 2>/dev/null; then
    echo "ENV_IGNORED $f"
  else
    echo "ENV_NOT_IGNORED $f"
    ENV_OK=false
  fi
done
echo "ENV_OK=$ENV_OK"

# 2. format (best effort, 60s max)
if command -v bun >/dev/null && [ -f appofc/package.json ]; then
  (cd appofc && timeout 60 bun run format) || echo "FORMAT_SKIPPED_OR_FAILED"
fi

# 3. gh auth
GH_AUTH="unknown"
GH_USER=""
if command -v gh >/dev/null; then
  if gh auth status 2>&1; then
    GH_AUTH="ok"
    GH_USER=$(gh api user -q .login 2>/dev/null || echo "")
  else
    GH_AUTH="needs_login"
  fi
fi
echo "GH_AUTH=$GH_AUTH GH_USER=$GH_USER"

# 4. remote / transfer
TARGET="igor-autodisplay/autodisplay"
REMOTE_URL="https://github.com/$TARGET.git"
if gh repo view "$TARGET" >/dev/null 2>&1; then
  echo "REPO_EXISTS=$TARGET"
else
  echo "REPO_MISSING=$TARGET trying transfer..."
  if gh api "repos/IgorFernandesSantos/autodisplay/transfer" -f new_owner=igor-autodisplay 2>&1; then
    echo "TRANSFER_STATUS=transfer_api_success_pending_accept"
  else
    echo "TRANSFER_STATUS=transfer_failed_or_no_access"
  fi
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
echo "REMOTE_URL=$REMOTE_URL"

# 5. branch
BRANCH="feat/semana-1-delivery"
git checkout -B "$BRANCH" 2>&1 || true
echo "BRANCH=$BRANCH"

# 6. stage (exclude env)
git add -A
git restore --staged appofc/.env appofc/backend/.env .env 2>/dev/null || true
git status --short | head -80

# 7. commit
if git diff --cached --quiet; then
  echo "COMMIT_STATUS=nothing_to_commit"
  COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
else
  git commit -m "$(cat <<'EOF'
feat: week 1 delivery (audit, auth, roadmaps)

Deliver week 1 scope including audit flows, authentication module,
Prisma model updates, frontend auth gate, CI setup, and roadmap docs.
EOF
)" && COMMIT_STATUS=success || COMMIT_STATUS=failed
  COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
fi
echo "COMMIT_STATUS=${COMMIT_STATUS:-unknown} COMMIT_HASH=$COMMIT_HASH"

# 8. push
if git push -u origin HEAD 2>&1; then
  echo "PUSH_STATUS=success"
else
  echo "PUSH_STATUS=failed"
fi

# 9. PR
BASE=$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}' || echo main)
if gh pr view --json url -q .url 2>/dev/null; then
  gh pr view --json url -q .url | xargs -I{} echo "PR_URL={}"
else
  if gh pr create --base "$BASE" --title "feat: Week 1 delivery (audit, auth, roadmaps)" --body "$(cat <<'EOF'
## Summary
- Audit and Prisma modeling (Semana 1 etapas 01-02)
- Auth module with sessions, CSRF, guards (etapa 03)
- Frontend login flow and roadmaps

## Test plan
- [ ] CI green on PR
- [ ] Neon migrate deploy + seed
- [ ] Render deploy + login Gislaine/Cláudia
EOF
)" 2>&1; then
    echo "PR_STATUS=created"
  else
    echo "PR_STATUS=failed_or_exists"
  fi
fi

echo "=== BLOCKERS ==="
[ "$ENV_OK" = false ] && echo "- Fix .gitignore before pushing secrets"
[ "$GH_AUTH" != "ok" ] && echo "- Run: gh auth login (igor-autodisplay) in WSL"
echo "=== DONE ==="
