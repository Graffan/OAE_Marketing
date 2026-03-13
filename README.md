# OAE Marketing

Film distribution marketing platform for Other Animal Entertainment. Manage titles, campaigns, smart links, audience intelligence, and AI-powered content — all from one dashboard.

## Features

### Content Management
- **Titles** — Film catalog with OMDb auto-import, metadata, poster art, and budget/ROI tracking
- **Clip Library** — Dropbox-synced video clips with rotation engine for platform-specific distribution
- **Campaigns** — Multi-channel campaign builder with status tracking, assignments, and approvals
- **Schedule & Calendar** — Content scheduling with calendar view for campaign coordination

### Distribution
- **Smart Links** — Geo-routed short links (`/w/:slug`) that redirect viewers to region-specific destinations (Netflix, iTunes, etc.) based on IP geolocation
- **Click Tracking** — Fire-and-forget analytics on every smart link redirect (country, device, referrer, UTM)
- **Destinations** — Manage streaming platforms and regional availability per title
- **Brand Hub** — Brand assets, voice guide (do/don't rules), social profiles, and press kit items

### Intelligence
- **Morgan AI** — Autonomous AI assistant with multi-provider fallback (Claude, OpenAI, DeepSeek), daily briefings, task queue with auto-approve rules, and a dashboard quick-chat widget
- **AI Studio** — Prompt templates for generating marketing copy, social posts, and campaign content
- **Audience** — Persona builder, engagement templates, competitor tracking, and cross-promotion suggestions
- **Email** — Subscriber management (captured via smart link landing pages) and email campaign builder
- **Analytics** — Platform performance, campaign metrics, and link click statistics

### Administration
- **Role-based access** — admin, marketing_operator, reviewer, executive, freelancer
- **App settings** — Company branding, logo, accent color (drives entire UI palette), AI provider keys
- **Notification system** — In-app alerts for campaigns, deadlines, Morgan tasks, and system events

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express, TypeScript |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, wouter, Framer Motion |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Passport.js (local strategy, session-based) |
| Session store | connect-pg-simple |
| AI | Anthropic SDK, OpenAI SDK (Claude, GPT-4o, DeepSeek-V3) |
| Integrations | Dropbox API, OMDb API, ip-api.com (geolocation) |
| Theme | next-themes (light/dark/system) + CSS variable accent color |

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm

## Local Development

```bash
# Clone
git clone https://github.com/Graffan/OAE_Marketing.git
cd OAE_Marketing

# Environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SESSION_SECRET

# Database
createdb oae_marketing
npm install
npm run db:push
npm run db:seed    # Creates admin user + default settings (idempotent, safe to re-run)

# Run
npm run dev        # Starts on http://localhost:5003
```

### Default Admin Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `oaeadmin2024` | admin |

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/oae_marketing
SESSION_SECRET=<openssl rand -hex 32>

# Server
NODE_ENV=development          # or "production"
PORT=5003
TRUST_PROXY=1                 # Set to number of proxies (1 for Caddy)
SESSION_COOKIE_SECURE=false   # Set true in production behind HTTPS
SESSION_COOKIE_SAMESITE=lax

# Optional integrations
OMDB_API_KEY=                 # Auto-import film metadata on title creation
DROPBOX_APP_KEY=              # Clip library sync
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=
```

AI provider keys (Anthropic, OpenAI, DeepSeek) are configured in **Admin > Settings** within the app, not in `.env`.

## Production Build

```bash
npm run build    # Vite (frontend) + esbuild (server) -> dist/
npm start        # Runs dist/index.js
```

---

## Proxmox CT Deployment

Complete guide for running OAE Marketing on a Proxmox LXC container with Caddy as a reverse proxy.

### 1. Create the Container

In Proxmox, create a new LXC container:
- **Template:** Ubuntu 22.04 or Debian 12
- **CPU:** 2 cores
- **RAM:** 2 GB (4 GB recommended)
- **Disk:** 20 GB+
- **Network:** DHCP or static IP on your LAN

### 2. Install System Dependencies

```bash
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Git + build essentials
apt install -y git build-essential

# PM2 (process manager)
npm install -g pm2
```

### 3. Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 4. Set Up PostgreSQL

```bash
sudo -u postgres psql <<EOF
CREATE USER oae WITH PASSWORD 'your_secure_password';
CREATE DATABASE oae_marketing OWNER oae;
GRANT ALL PRIVILEGES ON DATABASE oae_marketing TO oae;
EOF
```

### 5. Clone and Build

```bash
mkdir -p /opt/oae-marketing
cd /opt/oae-marketing
git clone https://github.com/Graffan/OAE_Marketing.git .

# Create .env (edit the password to match step 4)
cat > .env <<'ENVEOF'
DATABASE_URL=postgresql://oae:your_secure_password@localhost:5432/oae_marketing
SESSION_SECRET=REPLACE_ME
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
TRUST_PROXY=1
NODE_ENV=production
PORT=5003
ENVEOF

# Generate a real session secret
sed -i "s/REPLACE_ME/$(openssl rand -hex 32)/" .env

# Install, migrate, seed, build
npm install
npm run db:push
npm run db:seed
npm run build
```

### 6. Configure PM2

```bash
pm2 start dist/index.js --name oae-marketing
pm2 save
pm2 startup
# Run the command PM2 outputs (e.g. pm2 startup systemd -u root ...)
```

### 7. Configure Caddy

Edit `/etc/caddy/Caddyfile`:

```caddyfile
marketing.otheranimal.app {
    reverse_proxy localhost:5003
}
```

Replace `marketing.otheranimal.app` with your domain. Caddy auto-provisions HTTPS via Let's Encrypt.

```bash
systemctl reload caddy
```

For internal/LAN-only access without a domain:

```caddyfile
:80 {
    reverse_proxy localhost:5003
}
```

### 8. Verify

```bash
pm2 status                    # Should show "online"
curl -s http://localhost:5003 # Should return HTML
```

---

## Updating the App

All user data lives in PostgreSQL. The `.env` file is in `.gitignore`. Schema migrations via `db:push` are additive only (adds columns/tables, never drops existing ones). Updates are safe and non-destructive.

```bash
cd /opt/oae-marketing
git pull origin main
npm install
npm run db:push
npm run build
pm2 restart oae-marketing
```

### What's Preserved on Update

| Data | Location | Safe? |
|------|----------|-------|
| All user data, titles, campaigns | PostgreSQL | Yes |
| App settings, AI keys, branding | PostgreSQL `app_settings` table | Yes |
| Morgan conversations and memory | PostgreSQL | Yes |
| `.env` configuration | `/opt/oae-marketing/.env` | Yes (gitignored) |
| Session data | PostgreSQL `session` table | Yes |

### Deploy Script

Save as `/opt/oae-marketing/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /opt/oae-marketing

echo "Pulling latest..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Applying schema changes..."
npm run db:push

echo "Building..."
npm run build

echo "Restarting..."
pm2 restart oae-marketing

echo "Done."
pm2 status
```

```bash
chmod +x /opt/oae-marketing/scripts/deploy.sh
```

---

## Project Structure

```
OAE_Marketing/
  client/src/
    App.tsx                # Router, sidebar, layout
    pages/                 # 21 page components
    hooks/                 # React Query hooks
    components/ui/         # shadcn/ui primitives
    lib/                   # Utilities, query client
  server/
    index.ts               # Express entry point
    routes.ts              # All API endpoints
    storage.ts             # Database access layer (Drizzle)
    seed.ts                # Idempotent seed data
    db.ts                  # PostgreSQL connection pool
    services/
      ai-orchestrator.ts   # Multi-provider AI fallback
      morgan-chat.ts       # Morgan AI conversation engine
      morgan-daily-cycle.ts    # Autonomous daily briefings
      smart-link-redirect.ts   # Geo-routed link redirect
      dropbox.ts           # Clip library sync
      geoip.ts             # IP geolocation
      signal-bridge.ts     # Real-time notification bridge
  shared/
    schema.ts              # Drizzle schema (all tables)
  .env.example             # Environment variable template
```

## License

Proprietary. Copyright Other Animal Entertainment.
