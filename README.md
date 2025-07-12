SlotFlare
=========

SlotFlare is a Web UI for managing Cloudflare Workers that block online gambling content (especially "slot" related) — built to simplify the deployment of [gacor-cf-worker](https://github.com/mastomii/gacor-cf-worker).

This tool lets you manage everything via a simple interface:
- Set forbidden keywords (e.g. "slot", "judi", "gacor")
- Define whitelisted paths
- Deploy the Worker script to your Cloudflare account
- Manage route patterns and domains
- View deployment history and logs

-------------------------
✨ Features
-------------------------

- 🔐 User Authentication (NextAuth.js)
- 🌍 Cloudflare Domain Validation (Zone)
- ⚙️ Auto-Generated Worker Deployment
- 🛣️ Route Management via Cloudflare API
- 📊 Deploy History with Logs
- 🚨 Real-time Alert for Blocked Content

-------------------------
🧠 Architecture
-------------------------

- Frontend: Next.js App Router + Tailwind + shadcn/ui
- Backend: Next.js API Routes
- Database: MongoDB
- External API: Cloudflare API v4

-------------------------
📦 MongoDB Setup (Cloud)
-------------------------

1. Register at https://www.mongodb.com/atlas
2. Create a cluster and a database (e.g. `SlotFlareDB`)
3. Create a DB user and whitelist IPs
4. Copy the connection string
5. Paste into your `.env.local` file

-------------------------
🚀 Getting Started
-------------------------

1. Clone this repository:
   ```
   git clone https://github.com/mastomii/slotflare-manager.git
   cd slotflare-manager
   ```

2. Create `.env.local` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   MONGODB_DBNAME=CloudflareWorkerManager

   NEXTAUTH_SECRET=your-very-long-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ENABLE_REGISTRATION=true
   ```

3. Install dependencies and start development server:
   ```
   npm install
   npm run dev
   ```

Open in browser: http://localhost:3000

-------------------------
🔐 Authentication
-------------------------

- No default users are included.
- Make sure `ENABLE_REGISTRATION=true` so you can register your first account.

-------------------------
🌐 Cloudflare Setup
-------------------------

Step 1: Create API Token
- Go to: https://dash.cloudflare.com/profile/api-tokens
- Click "Create Token"
- Use "Custom Token"
- Required scopes:
    - Zone.Zone:Read
    - Zone.Workers Routes:Edit
    - Account.Workers Scripts:Edit
- Apply to "All zones" or specific accounts
- Save the generated token

Step 2: Get Account ID
- Go to Cloudflare Dashboard → Workers & Pages
- Copy your Account ID from the sidebar

Step 3: Configure in the App
- Login to the app
- Go to: Dashboard → Cloudflare Config
- Paste your API Token and Account ID
- Click Save

-------------------------
🐳 Docker Compose (optional)
-------------------------

Example `docker-compose.yml`:
```
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

-------------------------
📝 Environment Variables
-------------------------

Variable              | Required | Description
---------------------|----------|-----------------------------
MONGODB_URI           | Yes      | MongoDB connection string
MONGODB_DBNAME        | Yes      | Database name
NEXTAUTH_SECRET       | Yes      | Secret key (min 32 chars)
NEXTAUTH_URL          | Yes      | App URL (local or production)
ENABLE_REGISTRATION   | No       | Enable or disable registration