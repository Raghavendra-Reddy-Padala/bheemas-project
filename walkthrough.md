# WhatsApp Bot — Build Walkthrough

## What Was Built

### 1. Bot Backend (`bheemas-bot/`) — New Node.js/Express Server

A standalone server that handles all WhatsApp automation via Meta Cloud API.

| File | Purpose |
|------|---------|
| [package.json](file:///c:/agency/bheemas/bheemas-bot/package.json) | Dependencies: express, firebase, axios, node-cron, cors |
| [.env](file:///c:/agency/bheemas/bheemas-bot/.env) | Meta API credentials + Firebase config + frontend URL |
| [src/index.js](file:///c:/agency/bheemas/bheemas-bot/src/index.js) | Server entry — Express setup, CORS, error handling, graceful shutdown |
| [src/config/firebase.js](file:///c:/agency/bheemas/bheemas-bot/src/config/firebase.js) | Firebase client SDK init (same project: `bheemas-fitclub`) |
| [src/services/whatsapp.js](file:///c:/agency/bheemas/bheemas-bot/src/services/whatsapp.js) | Core messaging — invoice, reminder, campaign, and bulk send with rate limiting |
| [src/services/reminder.js](file:///c:/agency/bheemas/bheemas-bot/src/services/reminder.js) | Expiry check logic — dedup via `whatsapp_reminders` Firestore collection |
| [src/routes/api.js](file:///c:/agency/bheemas/bheemas-bot/src/routes/api.js) | API endpoints — send-invoice, send-campaign, campaigns, health |
| [src/cron/expiry-check.js](file:///c:/agency/bheemas/bheemas-bot/src/cron/expiry-check.js) | Daily cron at 9 AM IST — checks & sends expiry reminders |
| [ecosystem.config.cjs](file:///c:/agency/bheemas/bheemas-bot/ecosystem.config.cjs) | PM2 config for Hostinger VPS deployment |

#### API Endpoints

| Method | Endpoint | Called By | Purpose |
|--------|----------|-----------|---------|
| `POST` | `/api/send-invoice` | CRM (auto) | Send welcome + invoice WhatsApp on member creation |
| `POST` | `/api/send-campaign` | CRM campaign page | Bulk send campaign messages |
| `GET` | `/api/campaigns` | CRM campaign page | List campaign history |
| `GET` | `/api/campaign-status/:id` | CRM campaign page | Check campaign progress |
| `POST` | `/api/send-reminder-manual` | Manual trigger | Force run expiry check |
| `GET` | `/api/health` | Monitoring | Server health check |

#### WhatsApp Templates Needed (Create in Meta Business Manager)

| Template Name | Parameters | When Sent |
|---|---|---|
| `membership_invoice` | name, plan, joinDate, expiryDate, totalAmount, paidAmount, billLink | New member created |
| `expiry_reminder_week` | name, expiryDate, daysRemaining, plan | Membership expires in 2-7 days |
| `expiry_reminder_day` | name, expiryDate, daysRemaining, plan | Membership expires today/tomorrow |
| `campaign_message` | name, campaignTitle, campaignBody | Bulk campaign |

---

### 2. CRM Changes (`bheemas-crm/`)

| File | Change |
|------|--------|
| [members.new.tsx](file:///c:/agency/bheemas/bheemas-crm/src/routes/_authenticated/members.new.tsx) | **Modified** — Auto-sends WhatsApp invoice on member creation (replaced manual `wa.me` link) |
| [campaigns.tsx](file:///c:/agency/bheemas/bheemas-crm/src/routes/_authenticated/campaigns.tsx) | **New** — Full campaigns page with form, preview, and history |
| [route.tsx](file:///c:/agency/bheemas/bheemas-crm/src/routes/_authenticated/route.tsx) | **Modified** — Added "Campaigns" tab to top bar + bottom nav |
| [App.tsx](file:///c:/agency/bheemas/bheemas-crm/src/App.tsx) | **Modified** — Added `/campaigns` route |
| [whatsapp-api.ts](file:///c:/agency/bheemas/bheemas-crm/src/lib/whatsapp-api.ts) | **New** — Helper functions to call bot API |
| [.env](file:///c:/agency/bheemas/bheemas-crm/.env) | **New** — `VITE_BOT_API_URL` config |

---

### 3. New Firestore Collections (auto-created)

| Collection | Purpose |
|---|---|
| `whatsapp_reminders` | Dedup tracking — prevents sending same reminder twice on same day |
| `whatsapp_logs` | Log of all invoice notifications sent |
| `campaigns` | Campaign records with status, sent/failed counts |

---

## How to Run Locally

### Start the bot:
```bash
cd bheemas-bot
# Fill in your Meta credentials in .env first!
npm run dev
```

### Start the CRM:
```bash
cd bheemas-crm
npm run dev
```

---

## VPS Deployment (Hostinger)

```bash
# On VPS: clone/upload bheemas-bot folder
cd bheemas-bot
npm install

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 process list (survives reboot)
pm2 save
pm2 startup
```

> [!IMPORTANT]
> After deploying the bot to VPS, update two things:
> 1. **Bot `.env`** → Set `ALLOWED_ORIGINS` to your CRM's deployed URL
> 2. **CRM `.env`** → Set `VITE_BOT_API_URL` to `https://your-vps-domain/api`

---

## Flow Summary

```
Member Created → CRM calls /api/send-invoice → Bot sends WhatsApp template → Customer gets invoice + bill link

Daily 9 AM IST → Cron checks expiry → Sends reminders (7-day, 1-day) → Logged to prevent duplicates

Campaign Page → User fills form → Sends to /api/send-campaign → Bot sends bulk messages (200ms gap between each)
```
