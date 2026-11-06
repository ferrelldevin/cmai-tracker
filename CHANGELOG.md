# Changelog

What changed in each release of CMAI Tracker. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

A scoring change is always called out here with its new `RULE_VERSION`. Day-by-day decisions, and who approved them, are in the decision log in [docs/review-register.md](docs/review-register.md).

## [Unreleased]

### Added
- Editor and Git settings shared through the repo: `.editorconfig`, `.gitattributes` (LF line endings on every machine), recommended VS Code extensions and settings.
- Node 22 pinned in `.nvmrc` and `package.json` `engines`.
- `npm run lint` (ESLint with TypeScript and React hooks rules) and `npm run typecheck`.
- Pre-commit hook (Lefthook): formats and lints staged files, and scans them for secrets when gitleaks is installed.
- `SECURITY.md`, `CITATION.cff` and this changelog.
- CI runs every browser check and the axe audit (4 display modes) on each pull request, plus lint, type check, coverage floors on `src/scoring/` and `src/data/`, and `npm audit` for the app's dependencies. Deploy waits for all of them.
- Content-Security-Policy meta tag in the built app: scripts only from the app's own files plus the inline theme script, allowed by a hash worked out at build time.
- Dependabot: one grouped update PR a month for npm and for GitHub Actions.
- Playwright 1.63.0 and axe-core 4.14.0 pinned as dev dependencies, so the browser checks run the same versions everywhere.
- `npm run check:docs`, run in CI: every rule in the scoring spec names the check that tests it, and the run fails if that check is renamed or removed; relative links, `file:line` references and register IDs must all resolve.
- Screenshot comparison (`e2e/screenshots.cjs`): Log, Scores, Data and Display at phone size, light and dark, compared with saved baselines; differences fail the check and save a diff image.
- Database upgrade test from version 2, and a test that fails when a new schema version has no upgrade test.
- Test that a phone restored from a backup shows the same ratings as the phone that made it.
- Backups name the app version and build commit next to the rule version; the "How ratings are worked out" page shows the build too.
- A version bump in `package.json` merged to main is tagged `v<version>` automatically.
- `CODEOWNERS` requests Devin's review on the scoring rule, its test cases, the spec, the register and CI.

### Security
- Only the deploy job can publish the site. Before, the `pages: write` and `id-token: write` permissions applied to the build job too, including on pull requests.

### Removed
- `itemById` in `src/scoring/items.ts`: nothing called it and it had no tests.

### Fixed
- The scoring spec said the Total card lists the behaviors marked as changed; since F-20 each behavior row says how it moved instead. The spec now says so, and F-20 has its own register row.
- A sheet reopened straight after Cancel could close itself: the browser's late "close" event from the first closing shut the new one. Found as an intermittent CI timeout in the `flows` check.
- `NOTICE` said "[requested on DATE / granted on DATE]"; it now says permission has not been requested yet (register P-01).

No change to what a caregiver sees, the scoring rule (`cmai-count-rule-2`) or stored data.

## [0.2.0]

The version in `package.json` before this changelog started. Its changes are in the register's decision log and the git history.
