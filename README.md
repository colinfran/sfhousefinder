# sfhousefinder

Monorepo with two TypeScript apps:

- `dashboard-app`: Next.js 16 app (App Router) — displays rental listings from MongoDB
- `services/scraper`: Node.js Puppeteer scraper — scrapes Zillow, Craigslist, and Apartments.com, persists results to MongoDB

## Requirements

- Node.js 20+
- npm 10+
- MongoDB running locally or remotely

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an env file at the repo root:

   ```bash
   cp .env.example .env
   ```

3. Set the following variables in `.env`:

   | Variable | Required | Description |
   |---|---|---|
   | `MONGODB_URI` | Yes | MongoDB connection string (database name is inferred from the URI path) |
   | `ZILLOW_PROXY_SERVER` | No | Proxy URL to reduce bot-protection hits (e.g. `http://host:port`) |
  | `SCRAPER_DISCORD_WEBHOOK_URL` | No | Discord webhook URL for scraper alerts (fatal errors and bot-protection/captcha warnings) |

## Run

- Dashboard app:

  ```bash
  npm run dev:dashboard
  ```

- Scraper — Zillow (all cities):

  ```bash
  npm run start:scraper:zillow
  ```

- Scraper — Craigslist (all cities):

  ```bash
  npm run start:scraper:craigslist
  ```

- Scraper — Apartments.com (all cities):

  ```bash
  npm run start:scraper:apartments
  ```

  To run a single city directly from the scraper package:

  ```bash
  npm --workspace services/scraper run start:craigslist:all-cities
  # or for zillow:
  npm --workspace services/scraper run start:zillow:all-cities
  # or for apartments.com:
  npm --workspace services/scraper run start:apartments.com:all-cities
  ```

  Results are written to separate MongoDB collections (`zillow`, `craigslist`, and `apartments.com`) and also exported as JSON to `services/scraper/output/`.

## Scraper tuning

The scraper uses `puppeteer-extra` with the stealth plugin and randomised browser fingerprints to reduce Zillow bot-protection challenges. Behaviour can be tuned via env vars:

| Variable | Default | Description |
|---|---|---|
| `ZILLOW_MAX_ATTEMPTS` | `3` | Retry attempts if a challenge page is detected |
| `ZILLOW_RETRY_BASE_DELAY_MS` | `7000` | Base delay between retries (ms) |
| `ZILLOW_PRE_NAV_MIN_DELAY_MS` | `2000` | Min random delay before each navigation (ms) |
| `ZILLOW_PRE_NAV_MAX_DELAY_MS` | `5000` | Max random delay before each navigation (ms) |
| `ZILLOW_NAV_TIMEOUT_MS` | `90000` | Page navigation timeout (ms) |
| `ZILLOW_NEXT_DATA_TIMEOUT_MS` | `20000` | Timeout waiting for `__NEXT_DATA__` script (ms) |
| `ZILLOW_CITY_COOLDOWN_MIN_MS` | `60000` | Min delay between cities in `--all-cities` mode (ms) |
| `ZILLOW_CITY_COOLDOWN_MAX_MS` | `180000` | Max delay between cities in `--all-cities` mode (ms) |

Craigslist scraper timing can be tuned with:

| Variable | Default | Description |
|---|---|---|
| `CRAIGSLIST_NAV_TIMEOUT_MS` | `60000` | Page navigation timeout (ms) |
| `CRAIGSLIST_LISTINGS_TIMEOUT_MS` | `15000` | Timeout waiting for search result rows (ms) |
| `CRAIGSLIST_CITY_COOLDOWN_MIN_MS` | `30000` | Min delay between cities in `--all-cities` mode (ms) |
| `CRAIGSLIST_CITY_COOLDOWN_MAX_MS` | `90000` | Max delay between cities in `--all-cities` mode (ms) |

Apartments.com scraper timing can be tuned with:

| Variable | Default | Description |
|---|---|---|
| `APARTMENTS_NAV_TIMEOUT_MS` | `90000` | Page navigation timeout (ms) |
| `APARTMENTS_LISTINGS_TIMEOUT_MS` | `20000` | Timeout waiting for search result rows (ms) |
| `APARTMENTS_CITY_COOLDOWN_MIN_MS` | `30000` | Min delay between cities in `--all-cities` mode (ms) |
| `APARTMENTS_CITY_COOLDOWN_MAX_MS` | `90000` | Max delay between cities in `--all-cities` mode (ms) |

## Scraper filters

Hard-coded in `services/scraper/src/zillow/config.ts`:

- **Cities**: San Francisco, Daly City, San Mateo, South San Francisco, Pacifica
- **Price range**: $3,000 – $4,500/mo
- **Min beds**: 2
- **Home type**: single-family homes, entire place only

Craigslist uses the same city list and price/bedroom thresholds, plus text-based filtering to exclude apartment/shared-room style listings.

Apartments.com uses the same city list and thresholds, ignores everything below the `expendedListingWrapper` separator, and filters out room-for-rent or non-single-family style listings.
