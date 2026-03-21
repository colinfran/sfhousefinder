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
   | `SCRAPER_PROXY_SERVER` | No | Shared Evomi proxy for all scrapers. Format: `http://host:port:username:password` |
  | `SCRAPER_DISCORD_WEBHOOK_URL_ERROR` | No | Discord webhook URL for scraper error alerts (fatal errors and bot-protection/captcha warnings) |
  | `SCRAPER_DISCORD_WEBHOOK_URL_SUCCESS` | No | Discord webhook URL for scraper success alerts with scrape and persistence stats |

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
  npm run start:scraper:apartments.com
  ```

- Scraper — all sources (all cities):

  ```bash
  npm run start:scraper:all
  ```

To run a single source + single city:

```bash
npm --workspace services/scraper run start -- --source craigslist --city san-francisco
# source: zillow | craigslist | apartments
# city: san-francisco | daly-city | south-san-francisco | pacifica | san-bruno | brisbane
```

Results are written to separate MongoDB collections (`zillow`, `craigslist`, and `apartments.com`) and also exported as JSON to `services/scraper/output/`.

## Scraper tuning

The scraper uses `puppeteer-extra` with the stealth plugin and randomised browser fingerprints to reduce Zillow bot-protection challenges. Behaviour can be tuned via env vars:

| Variable | Default | Description |
|---|---|---|
| `ZILLOW_MAX_ATTEMPTS` | `3` | Retry attempts if a challenge page is detected |
| `ZILLOW_RETRY_BASE_DELAY_MS` | `20000` | Base delay between retries (ms) |
| `ZILLOW_PRE_NAV_MIN_DELAY_MS` | `10000` | Min random delay before each navigation (ms) |
| `ZILLOW_PRE_NAV_MAX_DELAY_MS` | `30000` | Max random delay before each navigation (ms) |
| `ZILLOW_NAV_TIMEOUT_MS` | `90000` | Page navigation timeout (ms) |
| `ZILLOW_NEXT_DATA_TIMEOUT_MS` | `20000` | Timeout waiting for `__NEXT_DATA__` script (ms) |
| `ZILLOW_CITY_COOLDOWN_MIN_MS` | `180000` | Min delay between cities in `--all-cities` mode (ms) |
| `ZILLOW_CITY_COOLDOWN_MAX_MS` | `600000` | Max delay between cities in `--all-cities` mode (ms) |

Craigslist scraper timing can be tuned with:

| Variable | Default | Description |
|---|---|---|
| `CRAIGSLIST_NAV_TIMEOUT_MS` | `60000` | Page navigation timeout (ms) |
| `CRAIGSLIST_LISTINGS_TIMEOUT_MS` | `15000` | Timeout waiting for search result rows (ms) |
| `CRAIGSLIST_MAX_ATTEMPTS` | `3` | Retry attempts using a fresh browser/proxy connection each time |
| `CRAIGSLIST_RETRY_BASE_DELAY_MS` | `20000` | Base delay between retries (ms) |
| `CRAIGSLIST_PRE_NAV_MIN_DELAY_MS` | `10000` | Min random delay before each navigation (ms) |
| `CRAIGSLIST_PRE_NAV_MAX_DELAY_MS` | `30000` | Max random delay before each navigation (ms) |
| `CRAIGSLIST_CITY_COOLDOWN_MIN_MS` | `120000` | Min delay between cities in `--all-cities` mode (ms) |
| `CRAIGSLIST_CITY_COOLDOWN_MAX_MS` | `300000` | Max delay between cities in `--all-cities` mode (ms) |

Apartments.com scraper timing can be tuned with:

| Variable | Default | Description |
|---|---|---|
| `APARTMENTS_NAV_TIMEOUT_MS` | `90000` | Page navigation timeout (ms) |
| `APARTMENTS_LISTINGS_TIMEOUT_MS` | `45000` | Timeout waiting for search result rows (ms) |
| `APARTMENTS_CITY_COOLDOWN_MIN_MS` | `180000` | Min delay between cities in `--all-cities` mode (ms) |
| `APARTMENTS_CITY_COOLDOWN_MAX_MS` | `600000` | Max delay between cities in `--all-cities` mode (ms) |

## Default scrape filters

Across all three scrapers:

- **Cities**: San Francisco, Daly City, South San Francisco, Pacifica, San Bruno, Brisbane
- **Price range**: $3,000–$4,500/month
- **Minimum bedrooms**: 2
- **Target inventory**: single-family, entire-place rentals

Source-specific behavior:

- **Zillow**
  - Parses Zillow list payload data (`__NEXT_DATA__`) for rentals.

- **Craigslist**
  - Uses housing search pages plus text/category filtering.
  - Excludes shared-room/sublet-style listings and unsupported categories.

- **Apartments.com**
  - Scrapes only the primary listing container (above the expanded listing separator).
  - Excludes room-for-rent and apartment/community-style listings.
