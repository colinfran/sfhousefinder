#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

LOG_DIR="${REPO_ROOT}/logs"
LOG_FILE="${LOG_DIR}/scraper-cron.log"
LOCK_FILE="/tmp/sfhousefinder-scraper.lock"

mkdir -p "${LOG_DIR}"
cd "${REPO_ROOT}"

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

# Source nvm to make npm available
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
fi

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  source "${REPO_ROOT}/.env"
  set +a
else
  echo "[$(date -Iseconds)] ERROR: Missing ${REPO_ROOT}/.env" >> "${LOG_FILE}"
  exit 1
fi

run_scrapers() {
  echo "[$(date -Iseconds)] Starting scraper run" >> "${LOG_FILE}"
  npm run start:scraper:all >> "${LOG_FILE}" 2>&1
  echo "[$(date -Iseconds)] Scraper run complete" >> "${LOG_FILE}"
}

if command -v flock >/dev/null 2>&1; then
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    echo "[$(date -Iseconds)] Skipped: previous scraper run still active" >> "${LOG_FILE}"
    exit 0
  fi
fi

run_scrapers
