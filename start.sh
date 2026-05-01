#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
BASE_URL="http://${HOST}:${PORT}"

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  else
    printf 'Open manually: %s\n' "$url"
  fi
}

printf 'Starting AI Team Sharing Assistant demo at %s\n' "$BASE_URL"
printf 'Views:\n'
printf '  Admin:    %s/\n' "$BASE_URL"
printf '  Chats:    %s/chats.html\n' "$BASE_URL"
printf '  Feedback: %s/feedback.html\n' "$BASE_URL"

(sleep 2 && open_url "${BASE_URL}/" && open_url "${BASE_URL}/chats.html" && open_url "${BASE_URL}/feedback.html") &

HOST="$HOST" PORT="$PORT" npm start
