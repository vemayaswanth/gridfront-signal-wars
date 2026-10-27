# GRIDFRONT: Signal Wars

A browser-based, real-time multiplayer strategy game prototype built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge.

## Current gameplay
- Two-player WebSocket matchmaking.
- Each commander starts with an energy reserve and a core with 300 integrity.
- Deploy Pulse Scouts (35 energy) and Siege Tanks (70 energy).
- Move your units by clicking a unit, then clicking a destination on the battlefield.
- Units automatically engage nearby enemies.
- Capture signal relays to generate energy.
- Push units toward the opposing base to damage its core.
- A match ends when a core reaches zero.

## Requirements
- Node.js 18 or newer
- Internet connection for the first dependency install

## Run locally
1. Extract the ZIP.
2. Open a terminal in the extracted `gridfront_signal_wars` folder.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000 in a browser.
6. Open the same URL in a second browser, private window, or another device on the same network to test matchmaking.

For another device on the same Wi-Fi, use the host computer's LAN IP address, for example `http://192.168.1.20:3000` (the actual IP depends on your network and firewall settings).

## Deploy for a shareable URL
Deploy the project to a Node.js hosting provider that supports long-lived WebSocket connections. Set the start command to `npm start`; the host supplies `PORT`. Deploy the whole folder/repository, including `public/index.html` and `package.json`. Once deployed, share the HTTPS URL with the second player and judges. Confirm the hosting plan permits WebSockets and that the server process stays running.

## Controls
- Click your own unit to select it.
- Click a destination tile to order the selected unit to move.
- Use Deploy Units to produce scouts or tanks.
- Recall all units to pull your army back toward your core.

## Important prototype notes
This is a functional starter prototype, not a finished tournament submission. It currently uses in-memory matchmaking, one active two-player room at a time per waiting queue, simple automatic combat, and a basic authoritative game loop. It does not yet include reconnect recovery, persistent player profiles, anti-cheat hardening, matchmaking regions, sound, accessibility settings, or extensive balance testing. The game server should be tested under real deployment conditions before submitting.

## Suggested competition polish checklist
- Playtest with multiple browser/device combinations and fix any synchronization bugs.
- Add a short tutorial and clearer move-order feedback.
- Add sound, effects, match timer, and post-match statistics.
- Improve unit pathing and add terrain/obstacles.
- Test disconnect handling, edge cases, and mobile layout.
- Capture a high-quality cover image and prepare a concise project description and live URL.
