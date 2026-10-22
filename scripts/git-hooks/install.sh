#!/bin/sh
# Point this clone (and all of its worktrees) at the versioned hooks in scripts/git-hooks.
set -e
root=$(git rev-parse --show-toplevel)
cd "$root"
git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/commit-msg
echo "core.hooksPath -> scripts/git-hooks (commit-msg blocks AI co-author trailers)"
