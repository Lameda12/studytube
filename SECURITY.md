# Security

StudyTube is a static site with no accounts, no server and no user data collected. Preferences are stored only in the visitor's browser.

## Reporting a vulnerability

Please use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Don't open a public issue for security problems. Expect a reply within a few days.

## Scope notes

- The YouTube API key is used only by build-time scripts and is never shipped to the browser (`.env.local` is git-ignored). If you find a key in the repo or in the built output, please report it.
- Videos load from YouTube's embedded player and thumbnails from `i.ytimg.com`.
