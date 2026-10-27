# GRIDFRONT: Signal Wars

A real-time, browser-based tactical multiplayer strategy game built for the **Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge**.

![GRIDFRONT Cover Art](cover_image.png)

---

## ⚡ Game Overview
- **Authoritative Real-Time Architecture**: Built with Node.js and WebSocket (`ws`), ensuring perfectly synchronized state across all connected players.
- **Capture & Pressure Strategy**: Capture neutral Signal Relays to generate energy income over time.
- **Unit Production**:
  - **Pulse Scout** (⚡ 35): Fast capture specialist and skirmisher.
  - **Siege Tank** (⚡ 70): Armored front-line breaker with heavy cannon fire.
- **Win Condition**: Break through the opposing sector and neutralize the enemy Core (300 HP).
- **Match Modes**:
  - **Quick Match (PvP)**: Global matchmaking queue.
  - **Solo Practice vs AI**: Instant autonomous opponent (`AI Aegis-9`) so judges and solo players can play anytime with 0 wait time.
  - **Private Room Codes**: Direct room codes (e.g., `ROOM1`) and URL sharing (`?room=ROOM1`).
- **Tactical Polish**:
  - Web Audio API zero-dependency synthesized sound effects (lasers, captures, sirens, fanfares).
  - Particle explosions and dynamic laser combat trails.
  - End-of-match statistics dashboard (units built, kills, relays held, damage dealt).

---

## 🛠 Local Setup & Testing

### Prerequisites
- Node.js 18 or newer

### Run
1. Open a terminal in this directory:
   ```bash
   cd gridfront_signal_wars
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.
4. **Testing Multiplayer**: Open `http://localhost:3000` in a second incognito window or another browser.
5. **Testing Solo AI**: Click **"Practice vs AI Commander"** for an immediate single-player match against the bot.

---

## 🚀 How to Publish & Get a Live Submission URL

Because this game uses live WebSockets, deploy it to any free Node.js hosting service:

### Option 1: Render.com (Recommended — 100% Free & Fast)
1. Push this folder to a GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/gridfront-signal-wars.git
   git push -u origin master
   ```
2. Log into [Render.com](https://render.com) and click **New + > Web Service**.
3. Select your GitHub repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**. Within 1–2 minutes you will have a live HTTPS/WSS URL (e.g. `https://gridfront.onrender.com`).

### Option 2: Glitch.com (Instant 60-Second Deploy, No Git Needed)
1. Go to [Glitch.com](https://glitch.com) and click **New Project > Import from GitHub** or **glitch-hello-node**.
2. Copy over `server.js`, `package.json`, and `public/index.html`.
3. Glitch immediately runs it and gives you a shareable live URL (e.g. `https://gridfront.glitch.me`).

### Option 3: Railway.app / Koyeb
1. Connect your repository on Railway or Koyeb.
2. It auto-detects `npm start` and deploys your WebSocket server immediately.

---

## 📋 Handshake Challenge Submission Details
- **Project Title**: `GRIDFRONT: Signal Wars`
- **Project Cover Image**: `cover_image.png` (1500x1000, 3:2 ratio)
- **Project Description (under 500 characters)**:
  > GRIDFRONT: Signal Wars is a real-time multiplayer RTS built with Node.js & WebSockets. Commanders deploy Scouts & Tanks, capture relays for energy, and breach the enemy core. Features 1v1 PvP matchmaking, custom room codes, Web Audio SFX, particle combat, and an autonomous AI practice mode. Guiding ChatGPT to balance server authority, responsive controls, and edge cases made this an exciting challenge.
