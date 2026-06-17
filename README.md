# Trading-AI Frontend (React + Vite)

A single-page UI for the Trading-AI API. Type a question → it calls
`POST /query` on your backend → renders the answer + key cards + full JSON.

API base is set in `src/App.jsx` (`const API = ...`) or via the
`VITE_API_URL` build env. Default: `https://ketan-trading.duckdns.org`.

---

## Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```

## Build
```bash
npm run build        # outputs static site to ./dist
npm run preview      # preview the production build
```

---

## Deploy via GitHub (Cloudflare Pages / Vercel / Netlify)

1. Push this folder to a **new GitHub repo**:
   ```bash
   git init
   git add .
   git commit -m "Trading-AI frontend"
   git branch -M main
   git remote add origin https://github.com/<you>/trading-ai-frontend.git
   git push -u origin main
   ```

2. Connect the repo on your host (auto-detected as Vite):

   | Host | Build command | Output dir |
   |------|---------------|------------|
   | **Cloudflare Pages** | `npm run build` | `dist` |
   | **Vercel** | `npm run build` (auto) | `dist` (auto) |
   | **Netlify** | `npm run build` | `dist` |

   Optionally set env var **`VITE_API_URL`** to your API URL.

3. You get a URL like `https://trading-ai-frontend.pages.dev`.

---

## Lock CORS (after deploy)
On the API server, allow only your frontend origin:
```bash
echo "ALLOWED_ORIGINS=https://<your-frontend>.pages.dev" > .env
sudo docker compose -f docker-compose.micro.yml up -d
```

> Paper-trading tool. Not financial advice.
