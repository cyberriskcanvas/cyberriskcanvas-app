#!/bin/sh
# CyberRisk Canvas CI uploader: sends SBOM / scan results and then checks the release gate.
#
#   CRC_URL=https://canvas.example.com CRC_TOKEN=crci_... \
#     sh crc.sh sbom=sbom.cdx.json secrets=secrets.sarif vulnscan=vuln.sarif sast=sast.sarif
#
# Env:  CRC_URL (required)   CRC_TOKEN (required, project CI token)
#       CRC_PART             part name for multi-part products (frontend, backend, image)
#       CRC_VERSION          project version number (default: active version)
#       CRC_GATE=false       skip the gate check
#       CRC_REQUIRE          sources that must exist, comma separated (default: the ones given as arguments)
#       CRC_FAIL_ON          critical | high | medium | low (default: the project's setting in Canvas, high unless changed)
#       CRC_RELEASE=v1.2.0   freeze the active version with this label once the gate passes (no-op if already released)
#       CRC_GATE_OUT=file    write the gate answer (JSON) to this file
#       CRC_JUNIT=file       write the gate answer as JUnit XML (GitLab artifacts:reports:junit, Jenkins, Azure DevOps)
#       CRC_MR_COMMENT=true  GitLab merge request pipelines: post the gate result as a merge request comment and
#                            update it on later runs (needs GITLAB_TOKEN with api scope, and jq)
# Exit code is non-zero when an upload fails or the gate does not pass.
set -eu

: "${CRC_URL:?CRC_URL is required}"
: "${CRC_TOKEN:?CRC_TOKEN is required}"
base="${CRC_URL%/}"

# Metadata from the CI system (GitHub Actions, GitLab CI, else git)
commit="${GITHUB_SHA:-${CI_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}}"
ref="${GITHUB_REF:-${CI_COMMIT_REF_NAME:-}}"
run_url="${CI_PIPELINE_URL:-}"
if [ -z "$run_url" ] && [ -n "${GITHUB_RUN_ID:-}" ]; then
  run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID}"
fi
safe() { printf '%s' "$1" | tr -c 'A-Za-z0-9._/:-' '_'; }

[ "$#" -gt 0 ] || { echo "usage: crc.sh source=file [source=file ...]  (sources: sbom sast secrets vulnscan dast tls ports)" >&2; exit 2; }

sources=""
for arg in "$@"; do
  source="${arg%%=*}"
  file="${arg#*=}"
  [ -f "$file" ] || { echo "crc: file not found: $file" >&2; exit 2; }
  query="source=$source"
  [ -n "${CRC_PART:-}" ]    && query="$query&part=$(safe "$CRC_PART")"
  [ -n "${CRC_VERSION:-}" ] && query="$query&version=$(safe "$CRC_VERSION")"
  [ -n "$commit" ]          && query="$query&commit=$(safe "$commit")"
  [ -n "$ref" ]             && query="$query&ref=$(safe "$ref")"
  [ -n "$run_url" ]         && query="$query&url=$(safe "$run_url")"
  echo "crc: uploading $source ($file)"
  curl --fail-with-body -sS -X POST -H "Authorization: Bearer $CRC_TOKEN" -F "file=@$file" "$base/api/ci/ingest?$query"
  echo
  sources="${sources:+$sources,}$source"
done

require="${CRC_REQUIRE:-$sources}"
if [ "${CRC_GATE:-true}" != "false" ]; then
  gate="$base/api/ci/gate?require=$require"
  [ -n "${CRC_FAIL_ON:-}" ] && gate="$gate&failOn=$(safe "$CRC_FAIL_ON")"
  [ -n "${CRC_VERSION:-}" ] && gate="$gate&version=$(safe "$CRC_VERSION")"
  echo "crc: checking release gate"
  out="${CRC_GATE_OUT:-$(mktemp)}"
  passed=true
  curl --fail-with-body -sS -o "$out" -H "Authorization: Bearer $CRC_TOKEN" "$gate" || passed=false
  cat "$out"; echo
  # Reports are written whatever the result, so a failed gate still shows up in the merge request
  if [ -n "${CRC_JUNIT:-}" ]; then
    curl -sS -o "$CRC_JUNIT" -H "Authorization: Bearer $CRC_TOKEN" "$gate&format=junit" || echo "crc: could not write $CRC_JUNIT" >&2
  fi
  if [ "${CRC_MR_COMMENT:-false}" = "true" ] && [ -n "${CI_MERGE_REQUEST_IID:-}" ]; then
    if [ -z "${GITLAB_TOKEN:-}" ] || ! command -v jq >/dev/null; then
      echo "crc: merge request comment needs GITLAB_TOKEN and jq, skipped" >&2
    else
      marker='<!-- crc-gate -->'
      notes="${CI_API_V4_URL:-https://gitlab.com/api/v4}/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
      body=$(jq -r --arg m "$marker" '$m + "\n**CyberRisk Canvas release gate" + (if .version then " (version " + (.version|tostring) + ")" else "" end) + ": " + (if .pass then "passed" else "failed" end) + "**" + ([.reasons[]? | "\n- " + .message] | join(""))' "$out") || body=""
      if [ -n "$body" ]; then
        id=$(curl -fsS -H "PRIVATE-TOKEN: $GITLAB_TOKEN" "$notes?per_page=100&sort=asc" | jq -r --arg m "$marker" '[.[] | select(.body | startswith($m))][0].id // empty') || id=""
        if [ -n "$id" ]; then
          curl -fsS -X PUT -H "PRIVATE-TOKEN: $GITLAB_TOKEN" --data-urlencode "body=$body" "$notes/$id" >/dev/null || echo "crc: could not update the merge request comment" >&2
        else
          curl -fsS -X POST -H "PRIVATE-TOKEN: $GITLAB_TOKEN" --data-urlencode "body=$body" "$notes" >/dev/null || echo "crc: could not post the merge request comment" >&2
        fi
      fi
    fi
  fi
  if [ "$passed" = true ]; then echo "crc: gate passed"; else echo "crc: gate FAILED" >&2; exit 1; fi
fi

if [ -n "${CRC_RELEASE:-}" ]; then
  echo "crc: releasing $CRC_RELEASE"
  release="$base/api/ci/release?label=$(safe "$CRC_RELEASE")&require=$require"
  [ -n "${CRC_FAIL_ON:-}" ] && release="$release&failOn=$(safe "$CRC_FAIL_ON")"
  curl --fail-with-body -sS -X POST -H "Authorization: Bearer $CRC_TOKEN" "$release" || { echo; echo "crc: release FAILED" >&2; exit 1; }
  echo
fi
