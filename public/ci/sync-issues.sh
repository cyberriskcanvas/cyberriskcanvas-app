#!/bin/sh
# Creates and closes issues for open measures and failed security tests of a CyberRisk Canvas project.
# Canvas stores nothing about your tracker: issues carry a hidden key and are found again by it.
#
#   CRC_URL=... CRC_TOKEN=crci_... GITHUB_TOKEN=... GITHUB_REPOSITORY=org/repo sh sync-issues.sh
#   CRC_URL=... CRC_TOKEN=crci_... GITLAB_TOKEN=... CI_PROJECT_ID=123 CI_API_V4_URL=... sh sync-issues.sh
#
# GitHub needs `issues: write` on the token. Requires curl and jq.
set -eu
: "${CRC_URL:?CRC_URL is required}"
: "${CRC_TOKEN:?CRC_TOKEN is required}"
command -v jq >/dev/null || { echo "sync-issues: jq is required" >&2; exit 2; }
label="cyberrisk-canvas"

items=$(curl --fail-with-body -sS -H "Authorization: Bearer $CRC_TOKEN" "${CRC_URL%/}/api/ci/issues")
want=$(printf '%s' "$items" | jq -r '.items[].key')

if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  api="${GITHUB_API_URL:-https://api.github.com}/repos/$GITHUB_REPOSITORY"
  gh() { curl --fail-with-body -sS -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }
  existing=$(gh "$api/issues?state=open&labels=$label&per_page=100" | jq -c '[.[] | select(.pull_request | not) | {id: .number, key: ((.body // "") | capture("crc-key:(?<k>[^ ]+) -->").k? // "")}]')
  create() { gh -X POST -H "Content-Type: application/json" -d "$1" "$api/issues" >/dev/null; }
  close() { gh -X PATCH -H "Content-Type: application/json" -d '{"state":"closed","state_reason":"completed"}' "$api/issues/$1" >/dev/null; }
  mk() { jq -n --argjson i "$1" --arg l "$label" '{title: $i.title, body: ($i.body + "\n\n<!-- crc-key:" + $i.key + " -->"), labels: [$l]}'; }
elif [ -n "${GITLAB_TOKEN:-}" ] && [ -n "${CI_PROJECT_ID:-}" ]; then
  api="${CI_API_V4_URL:-https://gitlab.com/api/v4}/projects/$CI_PROJECT_ID"
  gl() { curl --fail-with-body -sS -H "PRIVATE-TOKEN: $GITLAB_TOKEN" "$@"; }
  existing=$(gl "$api/issues?state=opened&labels=$label&per_page=100" | jq -c '[.[] | {id: .iid, key: ((.description // "") | capture("crc-key:(?<k>[^ ]+) -->").k? // "")}]')
  create() { gl -X POST -H "Content-Type: application/json" -d "$1" "$api/issues" >/dev/null; }
  close() { gl -X PUT -d "state_event=close" "$api/issues/$1" >/dev/null; }
  mk() { jq -n --argjson i "$1" --arg l "$label" '{title: $i.title, description: ($i.body + "\n\n<!-- crc-key:" + $i.key + " -->"), labels: $l}'; }
else
  echo "sync-issues: set GITHUB_TOKEN + GITHUB_REPOSITORY, or GITLAB_TOKEN + CI_PROJECT_ID" >&2; exit 2
fi

# open an issue for every item that has none yet
printf '%s' "$items" | jq -c '.items[]' | while IFS= read -r item; do
  key=$(printf '%s' "$item" | jq -r .key)
  if ! printf '%s' "$existing" | jq -e --arg k "$key" 'any(.[]; .key == $k)' >/dev/null; then
    create "$(mk "$item")"; echo "sync-issues: opened $key"
  fi
done
# close issues whose item is done
printf '%s' "$existing" | jq -c '.[] | select(.key != "")' | while IFS= read -r ex; do
  key=$(printf '%s' "$ex" | jq -r .key)
  if ! printf '%s\n' "$want" | grep -Fxq -- "$key"; then
    close "$(printf '%s' "$ex" | jq -r .id)"; echo "sync-issues: closed $key"
  fi
done
