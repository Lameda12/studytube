#!/bin/sh
# Probes YouTube once per 30 min; when the bot check clears, runs the slow heatmap fetch. No cookies. Stop with: pkill -f heat-watch
cd "$(dirname "$0")/.." || exit 1
while true; do
  if yt-dlp --skip-download --dump-single-json --no-warnings --no-playlist "https://www.youtube.com/watch?v=aircAruvnKk" >/dev/null 2>&1; then
    echo "$(date) probe OK, fetching"
    out=$(node scripts/heat.mjs 2>&1); echo "$out" | tail -3
    echo "$out" | grep -q "to fetch 0," && { echo "$(date) all done"; exit 0; }
  else
    echo "$(date) still blocked"
  fi
  sleep 1800
done
