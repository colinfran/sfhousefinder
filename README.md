# housefinder

Monorepo with two TypeScript apps:

- `dashboard-app`: Next.js 16 app (App Router) — displays rental listings from MongoDB
- `services/scraper`: Node.js Puppeteer scraper — scrapes Zillow and persists results to MongoDB

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

## Run

- Dashboard app:

  ```bash
  npm run dev:dashboard
  ```

- Scraper:

  ```bash
  npm run dev:scraper
  ```

   (Runs all configured cities by default using isolated per-city sessions + cooldown.)

   Single city:

   ```bash
   npm run dev:scraper -- --city daly-city
   ```

  Results are written directly to the `zillow` collection in MongoDB. Active/inactive listing state is maintained automatically — listings no longer visible on Zillow are marked `isActive: false`.

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

## Scraper filters

Hard-coded in `services/scraper/src/zillow/config.ts`:

- **Cities**: San Francisco, Daly City, San Mateo, South San Francisco, Pacifica
- **Price range**: $3,000 – $4,500/mo
- **Min beds**: 2
- **Home type**: single-family homes, entire place only
