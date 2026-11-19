# Contributing

Thanks for helping. The most useful contributions are **data fixes**, not code.

## Easiest ways to help

- **A clip starts in the wrong place.** Open a "Bad clip" issue with the video id and the better timecode. (If several people agree, it can be pinned.)
- **A video doesn't belong** (off-topic, entertainment, wrong topic): add its id to `data/block.json` in a PR, or open an issue.
- **A channel is missing.** Add its `@handle` to the right topic in `data/seed-channels.json`.
- **A Learn track has a bad or missing step.** Tracks live in `scripts/tracks.mjs` (`match` keywords, optional `pin` regexes for must-watch series).

## Code changes

```bash
npm install
npm run dev
npm run check     # typecheck + tests + build: must pass before a PR
```

- Keep changes small and focused; match the existing style.
- Add or update a test when you change ranking, clip-start logic, tracks, or time parsing (`scripts/*.test.mjs`).
- `scripts/data.test.mjs` validates the committed catalog and tracks; if you regenerate data, run it.
- Don't commit secrets. `.env.local` and `data/yt-cache.json` are git-ignored.

## Rebuilding data

See "Rebuild the catalog" in the [README](README.md). Please don't speed up `npm run heat`: YouTube rate-limits it, and we never use browser cookies to bypass that.

## Conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
