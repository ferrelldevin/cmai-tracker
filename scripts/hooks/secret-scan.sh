#!/bin/sh
# Pre-commit secret scan, run by lefthook.yml. Kept in its own file because lefthook on
# Windows splits an inline multi-line `run:` at its quotes and breaks the if/else.
# gitleaks is optional on a laptop (Windows: winget install Gitleaks.Gitleaks).
# GitHub push protection checks every push either way.
if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks git --pre-commit --staged --redact --no-banner
fi
echo "gitleaks not installed: skipped the local secret scan"
