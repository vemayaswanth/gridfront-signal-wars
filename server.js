const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  if (pathname === "/") pathname = "/index.html";
  const file = path.join(ROOT, pathname.replace(/^\/+/, ""));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(file);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
let waiting = null;
let nextRoom = 1;
const rooms = new Map();
const customRoomWaiters = new Map(); // roomCode -> ws
const W = 18, H = 12;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function unitStats(type) {
  return type === "tank"
    ? { cost: 70, hp: 130, speed: 0.055, range: 1.5, damage: 13, rate: 8 }
    : { cost: 35, hp: 65, speed: 0.085, range: 1.15, damage: 7, rate: 6 };
}

function newRoom(a, b, customId = null) {
  const roomId = customId || ("GF-" + String(nextRoom++).padStart(3, "0"));
  const isAi = !b || b.isAi;
  const bName = isAi ? "AI Aegis-9" : b.name;

  const room = {
    id: roomId,
    clients: [a, b],
    isAi: !!isAi,
    startTime: Date.now(),
    players: [
      { id: 0, name: a.name, color: "#52d7ff", x: 1, y: 5, energy: 120, core: 300, score: 0 },
      { id: 1, name: bName, color: "#ff668f", x: 16, y: 6, energy: 120, core: 300, score: 0 }
    ],
    nodes: [
      { id: 0, x: 5, y: 2, owner: -1, energy: 0 },
      { id: 1, x: 9, y: 5, owner: -1, energy: 0 },
      { id: 2, x: 12, y: 9, owner: -1, energy: 0 }
    ],
    units: [],
    nextUnit: 1,
    tick: 0,
    started: true,
    winner: null,
    events: [],
    stats: {
      unitsBuilt: [0, 0],
      unitsKilled: [0, 0],
      relaysCaptured: [0, 0],
      damageDealt: [0, 0]
    },
    feed: [{ text: `Match initialized in ${roomId}. Capture signal relays!`, time: Date.now() }]
  };

  rooms.set(room.id, room);

  a.roomId = room.id;
  a.playerId = 0;
  send(a, { type: "joined", roomId: room.id, playerId: 0, isAi: room.isAi, opponentName: bName });

  if (b && !b.isAi) {
    b.roomId = room.id;
    b.playerId = 1;
    send(b, { type: "joined", roomId: room.id, playerId: 1, isAi: false, opponentName: a.name });
  }

  broadcast(room, { type: "state", state: publicState(room) });
  return room;
}

function publicState(r) {
  return {
    roomId: r.id,
    isAi: r.isAi,
    players: r.players,
    nodes: r.nodes,
    units: r.units,
    tick: r.tick,
    winner: r.winner,
    events: r.events,
    stats: r.stats,
    feed: r.feed.slice(-6),
    waiting: false
  };
}

function send(c, data) {
  if (c && c.readyState === WebSocket.OPEN) {
    c.send(JSON.stringify(data));
  }
}

function broadcast(r, data) {
  r.clients.forEach(c => {
    if (c && !c.isAi) send(c, data);
  });
}

function log(r, text) {
  r.feed.push({ text, time: Date.now() });
  r.feed = r.feed.slice(-15);
}

function addUnit(r, pid, type) {
  const p = r.players[pid];
  const s = unitStats(type);
  if (p.energy < s.cost) {
    return send(r.clients[pid], { type: "notice", message: "Not enough energy for that unit." });
  }
  p.energy -= s.cost;
  r.stats.unitsBuilt[pid]++;

  // Default target positions toward central relay / enemy core
  const tx = pid === 0 ? 9 : 9;
  const ty = pid === 0 ? 5 : 5;

  const u = {
    id: r.nextUnit++,
    owner: pid,
    type,
    x: p.x,
    y: p.y,
    tx,
    ty,
    hp: s.hp,
    maxHp: s.hp,
    cooldown: 0,
    kills: 0
  };
  r.units.push(u);
  r.events.push({ type: "spawn", unitId: u.id, owner: pid, x: p.x, y: p.y, unitType: type });
  log(r, `${p.name} deployed a ${type.toUpperCase()}.`);
}

function command(r, pid, msg) {
  if (r.winner !== null) return;
  if (msg.action === "build" && ["scout", "tank"].includes(msg.unit)) {
    return addUnit(r, pid, msg.unit);
  }
  if (msg.action === "move") {
    const u = r.units.find(unit => unit.id === Number(msg.unitId) && unit.owner === pid);
    if (!u) return;
    u.tx = Math.max(0, Math.min(W - 1, Number(msg.x) || 0));
    u.ty = Math.max(0, Math.min(H - 1, Number(msg.y) || 0));
  }
  if (msg.action === "retreat") {
    r.units
      .filter(u => u.owner === pid)
      .forEach(u => {
        u.tx = r.players[pid].x;
        u.ty = r.players[pid].y;
      });
    log(r, `${r.players[pid].name} recalled all units.`);
  }
}

function aiTick(r) {
  if (r.winner !== null || !r.isAi) return;
  const aiPid = 1;
  const p = r.players[aiPid];

  // AI Decision logic every ~2.5 seconds
  if (r.tick % 25 === 0) {
    // Determine build
    if (p.energy >= 70 && Math.random() < 0.45) {
      addUnit(r, aiPid, "tank");
    } else if (p.energy >= 35) {
      addUnit(r, aiPid, "scout");
    }

    // Command idle/active AI units
    const myUnits = r.units.filter(u => u.owner === aiPid);
    const unownedRelays = r.nodes.filter(n => n.owner !== aiPid);

    myUnits.forEach((u, idx) => {
      // If there are unowned relays, send units to capture them
      if (unownedRelays.length > 0 && idx % 2 === 0) {
        const targetRelay = unownedRelays[idx % unownedRelays.length];
        u.tx = targetRelay.x;
        u.ty = targetRelay.y;
      } else {
        // Attack enemy core or escort
        u.tx = r.players[0].x;
        u.ty = r.players[0].y;
      }
    });
  }
}

function tickRoom(r) {
  if (r.winner !== null) return;
  r.tick++;
  r.events = []; // Clear previous tick events

  // AI processing
  if (r.isAi) aiTick(r);

  // Relays capture & energy generation
  for (const n of r.nodes) {
    const nearby = r.units.filter(u => dist(u, n) < 1.35);
    const counts = [0, 0];
    nearby.forEach(u => counts[u.owner]++);
    if (counts[0] && !counts[1] && n.owner !== 0) {
      n.owner = 0;
      r.stats.relaysCaptured[0]++;
      r.events.push({ type: "capture", relayId: n.id, owner: 0, x: n.x, y: n.y });
      log(r, `${r.players[0].name} captured Relay #${n.id + 1}.`);
    }
    if (counts[1] && !counts[0] && n.owner !== 1) {
      n.owner = 1;
      r.stats.relaysCaptured[1]++;
      r.events.push({ type: "capture", relayId: n.id, owner: 1, x: n.x, y: n.y });
      log(r, `${r.players[1].name} captured Relay #${n.id + 1}.`);
    }
    if (n.owner >= 0 && r.tick % 10 === 0) {
      r.players[n.owner].energy = Math.min(300, r.players[n.owner].energy + 6);
    }
  }

  // Base passive energy income
  if (r.tick % 15 === 0) {
    r.players[0].energy = Math.min(300, r.players[0].energy + 2);
    r.players[1].energy = Math.min(300, r.players[1].energy + 2);
  }

  // Move units & engage enemies
  for (const u of r.units) {
    if (u.cooldown > 0) u.cooldown--;
    const s = unitStats(u.type);

    // Target nearest opposing unit
    const enemies = r.units.filter(v => v.owner !== u.owner).sort((a, b) => dist(u, a) - dist(u, b));
    const target = enemies[0];

    if (target && dist(u, target) < s.range) {
      if (u.cooldown === 0) {
        target.hp -= s.damage;
        r.stats.damageDealt[u.owner] += s.damage;
        u.cooldown = s.rate;
        r.events.push({
          type: "attack",
          from: { x: u.x, y: u.y },
          to: { x: target.x, y: target.y },
          owner: u.owner,
          targetType: "unit"
        });

        if (target.hp <= 0) {
          u.kills++;
          r.stats.unitsKilled[u.owner]++;
          r.players[u.owner].score += 10;
          r.events.push({ type: "destroy", x: target.x, y: target.y, unitType: target.type });
          log(r, `${r.players[u.owner].name} eliminated an enemy ${target.type.toUpperCase()}.`);
        }
      }
    } else {
      // Movement toward destination
      const dx = u.tx - u.x;
      const dy = u.ty - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.08) {
        u.x += (dx / d) * s.speed;
        u.y += (dy / d) * s.speed;
      }
    }

    // Check attack on opposing Core
    const enemyPlayer = r.players[1 - u.owner];
    if (dist(u, enemyPlayer) < 1.35 && u.cooldown === 0) {
      const dmg = u.type === "tank" ? 8 : 3;
      enemyPlayer.core -= dmg;
      r.stats.damageDealt[u.owner] += dmg;
      u.cooldown = s.rate;
      r.events.push({
        type: "attack",
        from: { x: u.x, y: u.y },
        to: { x: enemyPlayer.x, y: enemyPlayer.y },
        owner: u.owner,
        targetType: "core"
      });

      if (enemyPlayer.core <= 0) {
        enemyPlayer.core = 0;
        r.winner = u.owner;
        log(r, `${r.players[u.owner].name} neutralized the enemy core! VICTORY.`);
      }
    }
  }

  // Cleanup destroyed units
  r.units = r.units.filter(u => u.hp > 0);

  // Broadcast state every 2 ticks (5 times per second)
  if (r.tick % 2 === 0) {
    broadcast(r, { type: "state", state: publicState(r) });
  }
}

wss.on("connection", ws => {
  ws.name = "Commander";
  send(ws, { type: "hello", message: "Gridfront Tactical Uplink Active." });

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      ws.name = String(msg.name || "Commander").trim().slice(0, 18) || "Commander";
      if (ws.roomId) return;

      const mode = msg.mode || "quick"; // "quick", "custom", "ai"
      const roomCode = msg.roomCode ? String(msg.roomCode).trim().toUpperCase() : null;

      if (mode === "ai") {
        // Start instant single-player AI game
        const virtualAi = { isAi: true, name: "AI Aegis-9" };
        newRoom(ws, virtualAi, "AI-" + Math.floor(100 + Math.random() * 900));
        return;
      }

      if (roomCode) {
        // Custom room matchmaking
        const waitingWs = customRoomWaiters.get(roomCode);
        if (waitingWs && waitingWs.readyState === WebSocket.OPEN && waitingWs !== ws) {
          customRoomWaiters.delete(roomCode);
          newRoom(waitingWs, ws, roomCode);
        } else {
          customRoomWaiters.set(roomCode, ws);
          ws.customRoomCode = roomCode;
          send(ws, {
            type: "waiting",
            roomCode,
            message: `Waiting for opponent to join room "${roomCode}". Share this code or URL with them!`
          });
        }
        return;
      }

      // Default quick match
      if (waiting && waiting.readyState === WebSocket.OPEN && waiting !== ws) {
        const other = waiting;
        waiting = null;
        newRoom(other, ws);
      } else {
        waiting = ws;
        send(ws, {
          type: "waiting",
          message: "Searching for an online commander… Keep this tab open or share the link with a peer."
        });
      }
    } else if (msg.type === "action" && ws.roomId) {
      const r = rooms.get(ws.roomId);
      if (r) command(r, ws.playerId, msg);
    }
  });

  ws.on("close", () => {
    if (waiting === ws) waiting = null;
    if (ws.customRoomCode && customRoomWaiters.get(ws.customRoomCode) === ws) {
      customRoomWaiters.delete(ws.customRoomCode);
    }

    if (ws.roomId) {
      const r = rooms.get(ws.roomId);
      if (r) {
        log(r, `${ws.name} disconnected.`);
        if (r.winner === null) {
          const remainingId = 1 - ws.playerId;
          r.winner = remainingId;
          log(r, `${r.players[remainingId].name} won by opponent forfeit.`);
          broadcast(r, {
            type: "opponent_left",
            message: "Opponent disconnected. Tactical victory awarded!",
            state: publicState(r)
          });
        }
        setTimeout(() => rooms.delete(r.id), 5000);
      }
    }
  });
});

setInterval(() => {
  for (const r of rooms.values()) {
    tickRoom(r);
  }
}, 100);

server.listen(PORT, () => {
  console.log(`Gridfront server listening on port ${PORT}`);
});
