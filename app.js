"use strict";

const STORAGE_KEY = "board-game-tracker-state-v1";
const POSITION_META = [
  { position: 1, label: "1st", emoji: "🥇" },
  { position: 2, label: "2nd", emoji: "🥈" },
  { position: 3, label: "3rd", emoji: "🥉" },
  { position: 4, label: "4th", emoji: "4️⃣" },
  { position: 5, label: "5th", emoji: "5️⃣" },
];
const DEFAULT_SCORING = Object.freeze({ 1: 5, 2: 3, 3: 2, 4: 0, 5: 0 });
const DEFAULT_PLAYERS = Object.freeze([
  { name: "Daniel", emoji: "🎩", color: "#4f8cff" },
  { name: "Emily", emoji: "🌸", color: "#ff6b9d" },
  { name: "Hector", emoji: "🦜", color: "#2ecc71" },
  { name: "Ben", emoji: "🐻", color: "#f5a623" },
  { name: "Amy", emoji: "⭐", color: "#a55eea" },
]);
const DEFAULT_GAME_EMOJI = Object.freeze({
  "Monopoly Duel": "🏠",
  Uno: "🃏",
  "Exploding Kittens": "💥",
});
const DEMO_SESSIONS = Object.freeze([
  {
    id: "demo-2025-09-20-monopoly-duel",
    date: "2025-09-20",
    game: "Monopoly Duel",
    notes: "Daniel dominated the property game. Amy made a strong comeback in the second half.",
    results: [
      { player: "Daniel", position: 1, points: 5 },
      { player: "Amy", position: 2, points: 3 },
      { player: "Emily", position: 3, points: 2 },
      { player: "Hector", position: 4, points: 0 },
      { player: "Ben", position: 5, points: 0 },
    ],
  },
  {
    id: "demo-2025-09-22-uno",
    date: "2025-09-22",
    game: "Uno",
    notes: "Hector pulled off an insane reverse-uno card chain. Ben nearly had it.",
    results: [
      { player: "Hector", position: 1, points: 5 },
      { player: "Ben", position: 2, points: 3 },
      { player: "Daniel", position: 3, points: 2 },
      { player: "Emily", position: 4, points: 0 },
      { player: "Amy", position: 5, points: 0 },
    ],
  },
  {
    id: "demo-2025-09-24-exploding-kittens",
    date: "2025-09-24",
    game: "Exploding Kittens",
    notes: "Emily defused three exploding kittens in a row. Pure luck, pure skill.",
    results: [
      { player: "Emily", position: 1, points: 5 },
      { player: "Daniel", position: 2, points: 3 },
      { player: "Amy", position: 3, points: 2 },
      { player: "Hector", position: 4, points: 0 },
      { player: "Ben", position: 5, points: 0 },
    ],
  },
]);

let state;
let formRows = [];
let toastTimer;
let editingSessionId = null;

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  state = loadState();
  bindEvents();
  renderScoringInputs();
  renderRoster();
  renderGameEmojiList();
  renderDashboard();
  resetForm();
  updateStorageStatus();
}

function cacheDom() {
  dom.gameForm = document.querySelector("#gameForm");
  dom.gameSelect = document.querySelector("#gameSelect");
  dom.newGameInput = document.querySelector("#newGameInput");
  dom.gameDate = document.querySelector("#gameDate");
  dom.notesInput = document.querySelector("#notesInput");
  dom.resultsRows = document.querySelector("#resultsRows");
  dom.previewTitle = document.querySelector("#previewTitle");
  dom.previewList = document.querySelector("#previewList");
  dom.formMessage = document.querySelector("#formMessage");
  dom.logButton = document.querySelector("#logButton");
  dom.resetPointsButton = document.querySelector("#resetPointsButton");
  dom.gamePills = document.querySelector("#gamePills");
  dom.statsGrid = document.querySelector("#statsGrid");
  dom.leaderboardSummary = document.querySelector("#leaderboardSummary");
  dom.podium = document.querySelector("#podium");
  dom.leaderboardRows = document.querySelector("#leaderboardRows");
  dom.gamesGrid = document.querySelector("#gamesGrid");
  dom.historyList = document.querySelector("#historyList");
  dom.scoringInputs = document.querySelector("#scoringInputs");
  dom.exportButton = document.querySelector("#exportButton");
  dom.importButton = document.querySelector("#importButton");
  dom.dataExportButton = document.querySelector("#dataExportButton");
  dom.dataImportButton = document.querySelector("#dataImportButton");
  dom.importFile = document.querySelector("#importFile");
  dom.clearDataButton = document.querySelector("#clearDataButton");
  dom.resetScoringButton = document.querySelector("#resetScoringButton");
  dom.settingsMessage = document.querySelector("#settingsMessage");
  dom.storageStatus = document.querySelector("#storageStatus");
  dom.toast = document.querySelector("#toast");
  dom.editBanner = document.querySelector("#editBanner");
  dom.editBannerText = document.querySelector("#editBannerText");
  dom.cancelEditButton = document.querySelector("#cancelEditButton");
  dom.rosterList = document.querySelector("#rosterList");
  dom.rosterMessage = document.querySelector("#rosterMessage");
  dom.gameEmojiList = document.querySelector("#gameEmojiList");
  dom.gameEmojiMessage = document.querySelector("#gameEmojiMessage");
  dom.logSection = document.querySelector("#logSection");
}

function bindEvents() {
  dom.gameForm.addEventListener("submit", handleGameSubmit);
  dom.gameSelect.addEventListener("change", handleGameSelectChange);
  dom.resetPointsButton.addEventListener("click", resetPointFields);
  dom.historyList.addEventListener("click", handleHistoryClick);
  dom.exportButton.addEventListener("click", exportData);
  dom.dataExportButton.addEventListener("click", exportData);
  dom.importButton.addEventListener("click", openImportPicker);
  dom.dataImportButton.addEventListener("click", openImportPicker);
  dom.importFile.addEventListener("change", handleImportFile);
  dom.clearDataButton.addEventListener("click", clearAllData);
  dom.resetScoringButton.addEventListener("click", resetScoring);
  dom.cancelEditButton.addEventListener("click", cancelEdit);

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      state = normalizeState(JSON.parse(event.newValue));
      renderDashboard();
      resetForm();
      renderScoringInputs();
      showToast("Tracker updated in another tab.");
    } catch (error) {
      console.warn("Could not sync the tracker tab", error);
    }
  });
}

function createEmptyState() {
  return {
    version: 1,
    players: clone(DEFAULT_PLAYERS),
    scoring: clone(DEFAULT_SCORING),
    gameEmoji: clone(DEFAULT_GAME_EMOJI),
    sessions: [],
  };
}

function createDemoState() {
  const demo = createEmptyState();
  demo.sessions = clone(DEMO_SESSIONS);
  return demo;
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("Could not read local tracker data", error);
  }
  return createDemoState();
}

function normalizeState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const players = normalizePlayers(source.players);
  const scoring = normalizeScoring(source.scoring);
  const gameEmoji = normalizeGameEmoji(source.gameEmoji);
  const sessions = Array.isArray(source.sessions)
    ? source.sessions.map(normalizeSession).filter(Boolean)
    : [];

  sessions.sort(compareSessions);
  return {
    version: 1,
    players,
    scoring,
    gameEmoji,
    sessions,
  };
}

function normalizePlayers(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 5) return clone(DEFAULT_PLAYERS);

  return candidates.slice(0, 5).map((candidate, index) => {
    const fallback = DEFAULT_PLAYERS[index];
    const name = String(candidate && candidate.name ? candidate.name : fallback.name).trim() || fallback.name;
    const emoji = String(candidate && candidate.emoji ? candidate.emoji : fallback.emoji).slice(0, 4) || fallback.emoji;
    const color = isHexColor(candidate && candidate.color) ? candidate.color : fallback.color;
    return { name, emoji, color };
  });
}

function normalizeScoring(candidate) {
  const result = clone(DEFAULT_SCORING);
  if (!candidate || typeof candidate !== "object") return result;
  for (const position of POSITION_META) {
    const value = Number(candidate[position.position]);
    if (Number.isFinite(value) && value >= 0) result[position.position] = roundScore(value);
  }
  return result;
}

function normalizeGameEmoji(candidate) {
  const result = clone(DEFAULT_GAME_EMOJI);
  if (!candidate || typeof candidate !== "object") return result;
  for (const [game, emoji] of Object.entries(candidate)) {
    if (game && emoji) result[String(game).slice(0, 100)] = String(emoji).slice(0, 8);
  }
  return result;
}

function normalizeSession(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const date = String(candidate.date || "");
  const game = String(candidate.game || "").replace(/[\r\n]/g, " ").trim();
  if (!isDateString(date) || !game) return null;

  const results = Array.isArray(candidate.results)
    ? candidate.results
        .map((result) => {
          if (!result || typeof result !== "object") return null;
          const player = String(result.player || "").trim();
          const position = Number(result.position);
          const points = Number(result.points);
          if (!player || !Number.isInteger(position) || position < 1 || position > 5) return null;
          return {
            player: player.slice(0, 80),
            position,
            points: Number.isFinite(points) && points >= 0 ? roundScore(points) : 0,
          };
        })
        .filter(Boolean)
    : [];

  if (!results.length) return null;
  return {
    id: String(candidate.id || makeId()),
    date,
    game: game.slice(0, 100),
    notes: String(candidate.notes || "").trim().slice(0, 500),
    results,
  };
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function compareSessions(a, b) {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateStorageStatus();
  } catch (error) {
    console.warn("Could not save tracker data", error);
    dom.storageStatus.textContent = "Storage unavailable — export a backup before leaving";
  }
}

function updateStorageStatus() {
  if (!dom.storageStatus) return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}-healthcheck`, "ok");
    window.localStorage.removeItem(`${STORAGE_KEY}-healthcheck`);
    dom.storageStatus.textContent = "Saved locally in this browser";
  } catch (error) {
    dom.storageStatus.textContent = "Storage unavailable — export a backup";
  }
}

function renderDashboard() {
  const standings = calculateStandings();
  renderStats(standings);
  renderGamePills();
  renderLeaderboard(standings);
  renderPerGameStandings();
  renderHistory();
  syncPositionHints();
}

function calculateStandings() {
  const standings = new Map();
  for (const session of state.sessions) {
    for (const result of session.results) {
      if (!standings.has(result.player)) {
        standings.set(result.player, {
          name: result.player,
          points: 0,
          plays: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
        });
      }
      const standing = standings.get(result.player);
      standing.points += result.points;
      standing.plays += 1;
      if (result.position === 1) standing.wins += 1;
      if (result.position === 2) standing.seconds += 1;
      if (result.position === 3) standing.thirds += 1;
    }
  }

  return [...standings.values()]
    .map((standing) => ({
      ...standing,
      points: roundScore(standing.points),
      pointsPerPlay: standing.plays ? roundScore(standing.points / standing.plays) : 0,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
}

function renderStats(standings) {
  const totalPoints = roundScore(state.sessions.reduce((total, session) => total + session.results.reduce((sum, result) => sum + result.points, 0), 0));
  const gameCount = new Set(state.sessions.map((session) => session.game.toLowerCase())).size;
  const leader = standings[0];
  const cards = [
    { icon: "🎲", value: state.sessions.length, label: "Games logged", color: "#a78bfa" },
    { icon: "🎮", value: gameCount, label: "Game types", color: "#65e6bd" },
    { icon: "⭐", value: totalPoints, label: "Points awarded", color: "#ffd166" },
    { icon: "👑", value: leader ? leader.name : "—", label: "Current leader", color: "#ff8c8c", text: Boolean(leader) },
  ];

  dom.statsGrid.replaceChildren();
  for (const card of cards) {
    const element = make("article", "stat-card");
    element.style.setProperty("--stat-color", card.color);
    element.appendChild(make("span", "stat-icon", card.icon));
    element.appendChild(make("strong", `stat-value${card.text ? " text-value" : ""}`, String(card.value)));
    element.appendChild(make("span", "stat-label", card.label));
    dom.statsGrid.appendChild(element);
  }
}

function renderGamePills() {
  const playedGames = [...new Set(state.sessions.map((session) => session.game))].sort((a, b) => a.localeCompare(b));
  const games = playedGames.length ? playedGames : Object.keys(DEFAULT_GAME_EMOJI);
  dom.gamePills.replaceChildren();
  for (const game of games) {
    dom.gamePills.appendChild(make("span", "game-pill", `${getGameEmoji(game)} ${game}`));
  }
}

function renderLeaderboard(standings) {
  const totalGames = state.sessions.length;
  dom.leaderboardSummary.textContent = totalGames
    ? `${totalGames} game${totalGames === 1 ? "" : "s"} · 1st = ${state.scoring[1]} · 2nd = ${state.scoring[2]} · 3rd = ${state.scoring[3]}`
    : "No games logged yet — add the first result above.";

  dom.podium.replaceChildren();
  dom.leaderboardRows.replaceChildren();

  if (!standings.length) {
    const empty = make("div", "empty-state", "No games logged yet — use the form above to add the first one!");
    empty.style.gridColumn = "1 / -1";
    dom.podium.appendChild(empty);
    return;
  }

  const podiumOrder = [standings[1], standings[0], standings[2]];
  const podiumClasses = ["second", "first", "third"];
  const podiumLabels = ["2nd", "1st", "3rd"];
  podiumOrder.forEach((standing, index) => {
    dom.podium.appendChild(createPodiumCard(standing, podiumClasses[index], podiumLabels[index]));
  });

  const maxPoints = standings[0].points || 1;
  standings.forEach((standing, index) => {
    const row = make("article", "leader-row");
    row.style.setProperty("--player-color", getPlayer(standing.name).color);

    const rank = make("span", `leader-rank${index < 3 ? ` rank-${index + 1}` : ""}`, String(index + 1));
    const avatar = make("span", "leader-avatar", getPlayer(standing.name).emoji);
    const copy = make("div", "leader-copy");
    const nameLine = make("div", "leader-name-line");
    nameLine.appendChild(make("span", "leader-name", standing.name));
    if (index === 0) nameLine.appendChild(make("span", "leader-crown", "👑"));
    copy.appendChild(nameLine);

    const meta = make("div", "leader-meta");
    meta.appendChild(make("span", "leader-chip", `${standing.plays} play${standing.plays === 1 ? "" : "s"}`));
    meta.appendChild(make("span", "leader-chip", `🏆 ${standing.wins}`));
    meta.appendChild(make("span", "leader-chip", `🥈 ${standing.seconds}`));
    meta.appendChild(make("span", "leader-chip", `🥉 ${standing.thirds}`));
    meta.appendChild(make("span", "leader-chip", `${standing.pointsPerPlay} pts/play`));
    copy.appendChild(meta);

    const bar = make("div", "leader-bar");
    const barFill = document.createElement("span");
    barFill.style.width = `${Math.max(0, Math.min(100, (standing.points / maxPoints) * 100))}%`;
    bar.appendChild(barFill);
    copy.appendChild(bar);

    row.append(rank, avatar, copy, make("strong", "leader-points", String(standing.points)));
    dom.leaderboardRows.appendChild(row);
  });
}

function createPodiumCard(standing, className, label) {
  const card = make("article", `podium-card ${className}`);
  card.appendChild(make("span", "podium-rank", label));
  if (!standing) {
    card.appendChild(make("span", "podium-avatar", "—"));
    card.appendChild(make("span", "podium-name", "—"));
    card.appendChild(make("span", "podium-points", "—"));
    card.appendChild(make("span", "podium-meta", "No result"));
    return card;
  }

  const player = getPlayer(standing.name);
  card.style.setProperty("--player-color", player.color);
  if (className === "first") card.appendChild(make("span", "podium-crown", "👑"));
  card.appendChild(make("span", "podium-avatar", player.emoji));
  card.appendChild(make("span", "podium-name", standing.name));
  card.appendChild(make("span", "podium-points", String(standing.points)));
  card.appendChild(make("span", "podium-meta", `${standing.wins} win${standing.wins === 1 ? "" : "s"}`));
  return card;
}

function renderPerGameStandings() {
  const games = new Map();
  for (const session of state.sessions) {
    const key = session.game.toLowerCase();
    if (!games.has(key)) games.set(key, { game: session.game, sessions: [] });
    games.get(key).sessions.push(session);
  }

  dom.gamesGrid.replaceChildren();
  if (!games.size) {
    dom.gamesGrid.appendChild(make("div", "empty-state", "Nothing to break down yet. Log a game to see per-game bragging rights."));
    return;
  }

  for (const gameData of [...games.values()].sort((a, b) => a.game.localeCompare(b.game))) {
    const card = make("article", "game-card");
    const heading = make("div", "game-card-heading");
    heading.appendChild(make("span", "game-card-emoji", getGameEmoji(gameData.game)));
    heading.appendChild(make("h3", "", gameData.game));
    card.appendChild(heading);
    const totalPoints = roundScore(gameData.sessions.reduce((total, session) => total + session.results.reduce((sum, result) => sum + result.points, 0), 0));
    card.appendChild(make("p", "game-card-count", `${gameData.sessions.length} play${gameData.sessions.length === 1 ? "" : "s"} · ${totalPoints} pts handed out`));

    const playerTotals = new Map();
    for (const session of gameData.sessions) {
      for (const result of session.results) {
        if (!playerTotals.has(result.player)) playerTotals.set(result.player, { points: 0, wins: 0 });
        const total = playerTotals.get(result.player);
        total.points += result.points;
        if (result.position === 1) total.wins += 1;
      }
    }

    const ranked = [...playerTotals.entries()]
      .map(([name, totals]) => ({ name, points: roundScore(totals.points), wins: totals.wins }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
    const maxPoints = ranked[0] ? ranked[0].points : 1;

    for (const standing of ranked) {
      const row = make("div", "game-standing");
      row.style.setProperty("--player-color", getPlayer(standing.name).color);
      const name = make("div", "game-standing-name");
      name.appendChild(make("span", "", `${getPlayer(standing.name).emoji} ${standing.name}`));
      if (standing.wins) name.appendChild(make("span", "", `· 🏆 ${standing.wins}`));
      row.append(name, make("span", "game-standing-points", String(standing.points)));
      const bar = make("div", "game-standing-bar");
      const fill = document.createElement("span");
      fill.style.width = `${Math.max(0, Math.min(100, (standing.points / maxPoints) * 100))}%`;
      bar.appendChild(fill);
      row.appendChild(bar);
      card.appendChild(row);
    }
    dom.gamesGrid.appendChild(card);
  }
}

function renderHistory() {
  dom.historyList.replaceChildren();
  if (!state.sessions.length) {
    dom.historyList.appendChild(make("div", "empty-state", "No sessions recorded yet. Log the first game above and it'll appear here."));
    return;
  }

  for (const session of [...state.sessions].sort(compareSessions).reverse()) {
    const item = make("article", "history-item");
    const card = make("div", "history-card");
    const top = make("div", "history-card-top");
    top.appendChild(make("span", "history-game", `${getGameEmoji(session.game)} ${session.game}`));
    top.appendChild(make("time", "history-date", formatDate(session.date)));
    card.appendChild(top);

    const sortedResults = [...session.results].sort((a, b) => a.position - b.position);
    const winner = sortedResults[0];
    if (winner) {
      const winnerLine = make("div", "history-winner");
      winnerLine.appendChild(make("span", "winner-label", "👑"));
      winnerLine.appendChild(make("span", "", `${winner.player} takes the win`));
      winnerLine.appendChild(make("span", "winner-points", `${winner.points} pts`));
      card.appendChild(winnerLine);
    }

    const results = make("div", "history-results");
    for (const result of sortedResults) {
      const resultChip = make("span", `history-result${result.position === 1 ? " winner" : ""}`, `${POSITION_META[result.position - 1]?.emoji || `#${result.position}`} ${result.player} · ${result.points}pts`);
      resultChip.style.borderColor = `${getPlayer(result.player).color}66`;
      results.appendChild(resultChip);
    }
    card.appendChild(results);

    if (session.notes) card.appendChild(make("p", "history-notes", `“${session.notes}”`));

    const actions = make("div", "history-actions");
    const edit = make("button", "edit-button", "Edit");
    edit.type = "button";
    edit.dataset.editSessionId = session.id;
    const remove = make("button", "delete-button", "Remove session");
    remove.type = "button";
    remove.dataset.sessionId = session.id;
    actions.append(edit, remove);
    card.appendChild(actions);
    item.appendChild(card);
    dom.historyList.appendChild(item);
  }
}

function renderRoster() {
  dom.rosterList.replaceChildren();

  state.players.forEach((player, index) => {
    const row = make("div", "roster-row");
    row.style.setProperty("--player-color", player.color);

    const swatch = make("span", "roster-swatch", player.emoji || "🎲");
    swatch.setAttribute("aria-hidden", "true");
    row.appendChild(swatch);

    const nameWrap = make("div", "roster-field roster-field-name");
    const nameLabel = make("label", "", `Player ${index + 1}`);
    nameLabel.htmlFor = `roster-name-${index}`;
    const nameInput = make("input", "roster-input");
    nameInput.id = `roster-name-${index}`;
    nameInput.type = "text";
    nameInput.maxLength = 24;
    nameInput.value = player.name;
    nameInput.setAttribute("aria-label", `Name for player ${index + 1}`);
    // Names only commit on blur — applying them per keystroke would let a
    // half-typed name collide with a real player and split their history.
    nameInput.addEventListener("input", () => {
      nameInput.dataset.dirty = "true";
    });
    nameInput.addEventListener("blur", () => {
      const cleaned = nameInput.value.trim();
      const previousName = nameInput.dataset.previousName || player.name;
      delete nameInput.dataset.dirty;
      if (!cleaned) {
        nameInput.value = state.players[index].name;
        return;
      }
      if (cleaned !== previousName) {
        if (renamePlayerEverywhere(previousName, cleaned, index)) {
          if (dom.rosterMessage) dom.rosterMessage.style.color = "";
          if (dom.rosterMessage) {
            dom.rosterMessage.textContent = `Renamed "${previousName}" to "${cleaned}" across all sessions.`;
          }
          showToast(`Renamed to ${cleaned}.`);
          renderRoster();
          renderGameEmojiList();
          return;
        }
        renderRoster();
        return;
      }
      state.players[index].name = cleaned;
      nameInput.dataset.previousName = cleaned;
      saveState();
      renderDashboard();
    });
    nameInput.addEventListener("focus", () => {
      nameInput.dataset.previousName = state.players[index].name;
    });
    nameInput.dataset.previousName = player.name;
    nameWrap.append(nameLabel, nameInput);

    const emojiWrap = make("div", "roster-field roster-field-emoji");
    const emojiLabel = make("label", "", "Icon");
    emojiLabel.htmlFor = `roster-emoji-${index}`;
    const emojiInput = make("input", "roster-input roster-input-emoji");
    emojiInput.id = `roster-emoji-${index}`;
    emojiInput.type = "text";
    emojiInput.maxLength = 4;
    emojiInput.value = player.emoji;
    emojiInput.setAttribute("aria-label", `Icon for player ${index + 1}`);
    emojiInput.addEventListener("input", () => {
      state.players[index].emoji = emojiInput.value || "🎲";
      swatch.textContent = state.players[index].emoji;
      commitRosterChange("Player icon updated.");
    });
    emojiWrap.append(emojiLabel, emojiInput);

    const colorWrap = make("div", "roster-field roster-field-color");
    const colorLabel = make("label", "", "Colour");
    colorLabel.htmlFor = `roster-color-${index}`;
    const colorInput = make("input", "roster-color");
    colorInput.id = `roster-color-${index}`;
    colorInput.type = "color";
    colorInput.value = player.color;
    colorInput.setAttribute("aria-label", `Colour for player ${index + 1}`);
    colorInput.addEventListener("input", () => {
      state.players[index].color = colorInput.value;
      row.style.setProperty("--player-color", colorInput.value);
      commitRosterChange("Player colour updated.");
    });
    colorWrap.append(colorLabel, colorInput);

    row.append(nameWrap, emojiWrap, colorWrap);
    dom.rosterList.appendChild(row);
  });
}

function renamePlayerEverywhere(previousName, nextName, index) {
  const clash = state.players.some(
    (player, playerIndex) => playerIndex !== index && player.name === nextName
  );
  if (clash) {
    if (dom.rosterMessage) {
      dom.rosterMessage.style.color = "var(--danger)";
      dom.rosterMessage.textContent = `"${nextName}" is already taken. Pick a different name.`;
    }
    return false;
  }
  // Snapshot the form before mutating: once the roster changes, the old name is
  // no longer "valid" and would otherwise be filtered out of the draft.
  const draft = readFormDraft();
  state.players[index].name = nextName;
  for (const session of state.sessions) {
    for (const result of session.results) {
      if (result.player === previousName) result.player = nextName;
    }
  }
  saveState();
  // Remap anything the user has already picked in the form before re-rendering,
  // so a rename never silently clears a half-filled session.
  const remapped = draft
    ? {
        ...draft,
        results: draft.results.map((row) =>
          row.player === previousName ? { ...row, player: nextName } : row
        ),
      }
    : null;
  renderDashboard();
  resetForm({ draft: remapped });
  return true;
}

function commitRosterChange(message) {
  saveState();
  renderDashboard();
  resetForm({ preserveDraft: true });
  if (message && dom.rosterMessage) dom.rosterMessage.textContent = message;
}

function renderGameEmojiList() {
  dom.gameEmojiList.replaceChildren();
  const games = [...new Set(state.sessions.map((session) => session.game))].sort((a, b) => a.localeCompare(b));

  if (!games.length) {
    dom.gameEmojiList.appendChild(make("p", "muted-copy", "Log a game and it will appear here so you can give it an icon."));
    return;
  }

  for (const game of games) {
    const row = make("div", "game-emoji-row");
    const name = make("span", "game-emoji-name", game);
    const input = make("input", "roster-input roster-input-emoji");
    input.type = "text";
    input.maxLength = 4;
    input.value = getGameEmoji(game);
    input.setAttribute("aria-label", `Icon for ${game}`);
    input.addEventListener("input", () => {
      state.gameEmoji[game] = input.value || "🎮";
      saveState();
      renderGamePills();
      renderHistory();
      renderPerGameStandings();
    });
    input.addEventListener("blur", () => {
      const cleaned = input.value.trim() || "🎮";
      input.value = cleaned;
      state.gameEmoji[game] = cleaned;
      saveState();
      renderGamePills();
      renderHistory();
      renderPerGameStandings();
      if (dom.gameEmojiMessage) dom.gameEmojiMessage.textContent = `${game} icon updated.`;
    });
    row.append(name, input);
    dom.gameEmojiList.appendChild(row);
  }
}

function renderScoringInputs() {
  dom.scoringInputs.replaceChildren();
  for (const position of POSITION_META) {
    const wrapper = make("div", "scoring-field");
    const label = make("label", "", position.label);
    const id = `default-score-${position.position}`;
    label.htmlFor = id;
    const input = make("input");
    input.id = id;
    input.type = "number";
    input.min = "0";
    input.step = "0.5";
    input.value = String(state.scoring[position.position]);
    input.setAttribute("aria-label", `Default points for ${position.label}`);
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0) {
        input.value = String(state.scoring[position.position]);
        return;
      }
      state.scoring[position.position] = roundScore(value);
      saveState();
      syncPositionHints();
      showToast("Default scoring updated.");
    });
    wrapper.append(label, input);
    dom.scoringInputs.appendChild(wrapper);
  }
}

function resetForm(options) {
  if (!dom.gameForm) return;
  const preserveDraft = Boolean(options && options.preserveDraft);
  const draft = options && "draft" in options ? options.draft : preserveDraft ? readFormDraft() : null;

  const editing = editingSessionId
    ? state.sessions.find((item) => item.id === editingSessionId)
    : null;
  const latest = state.sessions.length ? state.sessions[state.sessions.length - 1] : null;
  const draftGame = draft ? draft.game : "";
  populateGameSelect(draftGame || (editing ? editing.game : latest ? latest.game : ""));

  if (draft && draft.newGameName) {
    dom.gameSelect.value = "__new";
    dom.newGameInput.hidden = false;
    dom.newGameInput.value = draft.newGameName;
  }

  dom.gameDate.value = draft && draft.date ? draft.date : editing ? editing.date : todayString();
  dom.notesInput.value = draft && draft.notes ? draft.notes : editing ? editing.notes || "" : "";
  dom.newGameInput.hidden = !draft || !draft.newGameName;
  if (!draft) dom.newGameInput.value = "";
  renderResultRows(draft ? draft.results : editing ? editing.results : latest ? latest.results : []);
  updatePreview();
}

// Captures what the user has typed so a settings change doesn't wipe a
// half-filled form. Only keeps entries whose player still exists.
function readFormDraft() {
  if (!formRows.length) return null;
  const validNames = state.players.map((player) => player.name);
  const results = readFormRows()
    .filter((row) => row.player && validNames.includes(row.player))
    .map((row) => ({
      player: row.player,
      position: row.position,
      points: Number.isFinite(row.points) && row.points >= 0 ? roundScore(row.points) : state.scoring[row.position],
    }));
  if (!results.length) return null;
  const newGameName = dom.gameSelect.value === "__new" ? dom.newGameInput.value.trim() : "";
  return {
    game: dom.gameSelect.value === "__new" ? newGameName : dom.gameSelect.value,
    newGameName,
    date: dom.gameDate.value,
    notes: dom.notesInput.value,
    results,
  };
}

function populateGameSelect(selectedGame) {
  const games = [...new Set(state.sessions.map((session) => session.game))].sort((a, b) => a.localeCompare(b));
  dom.gameSelect.replaceChildren();
  dom.gameSelect.appendChild(createOption("", "— choose a game —"));
  for (const game of games) dom.gameSelect.appendChild(createOption(game, `${getGameEmoji(game)} ${game}`));
  for (const game of Object.keys(DEFAULT_GAME_EMOJI)) {
    if (!games.includes(game)) dom.gameSelect.appendChild(createOption(game, `${DEFAULT_GAME_EMOJI[game]} ${game}`));
  }
  dom.gameSelect.appendChild(createOption("__new", "➕ Add a new game…"));
  dom.gameSelect.value = selectedGame && [...dom.gameSelect.options].some((option) => option.value === selectedGame) ? selectedGame : "";
}

function renderResultRows(previousResults) {
  dom.resultsRows.replaceChildren();
  formRows = [];
  const players = state.players.slice(0, 5);

  for (const positionMeta of POSITION_META) {
    const previous = previousResults.find((result) => result.position === positionMeta.position);
    const fallbackPlayer = players[positionMeta.position - 1];
    const playerName = previous && players.some((player) => player.name === previous.player)
      ? previous.player
      : fallbackPlayer ? fallbackPlayer.name : "";

    const row = make("div", "result-row");
    const position = make("div", "result-position");
    position.appendChild(make("span", "position-emoji", positionMeta.emoji));
    const positionCopy = make("span");
    positionCopy.appendChild(make("strong", "", positionMeta.label));
    positionCopy.appendChild(make("small", "", `${state.scoring[positionMeta.position]} pts default`));
    position.appendChild(positionCopy);

    const playerSelect = make("select", "field result-player");
    playerSelect.id = `player-${positionMeta.position}`;
    playerSelect.setAttribute("aria-label", `${positionMeta.label} place player`);
    playerSelect.appendChild(createOption("", "— choose player —"));
    for (const player of players) playerSelect.appendChild(createOption(player.name, `${player.emoji} ${player.name}`));
    playerSelect.value = playerName;

    const pointsInput = make("input", "field points-field");
    pointsInput.id = `points-${positionMeta.position}`;
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.step = "0.5";
    pointsInput.inputMode = "decimal";
    pointsInput.value = String(previous && Number.isFinite(previous.points) ? previous.points : state.scoring[positionMeta.position]);
    pointsInput.setAttribute("aria-label", `Points for ${positionMeta.label} place`);

    playerSelect.addEventListener("change", updatePreview);
    pointsInput.addEventListener("input", updatePreview);
    row.append(position, playerSelect, pointsInput);
    dom.resultsRows.appendChild(row);
    formRows.push({ position: positionMeta.position, select: playerSelect, points: pointsInput });
  }
}

function syncPositionHints() {
  const hints = dom.resultsRows.querySelectorAll(".result-position small");
  hints.forEach((hint, index) => {
    const position = index + 1;
    hint.textContent = `${state.scoring[position]} pts default`;
  });
}

function updatePreview() {
  if (!dom.previewList) return;
  const rows = readFormRows();
  const selected = rows.filter((row) => row.player);
  dom.previewList.replaceChildren();

  if (!selected.length) {
    dom.previewTitle.textContent = "Pick a player for 1st";
    dom.previewList.appendChild(make("p", "preview-empty", "Choose the finishing order on the left and this preview will update instantly."));
    return;
  }

  const leader = rows.find((row) => row.position === 1 && row.player) || selected[0];
  dom.previewTitle.textContent = `${leader.player} takes the lead`;
  for (const row of selected) {
    const chip = make("div", `preview-chip${row === leader ? " winner" : ""}`);
    chip.style.setProperty("--player-color", getPlayer(row.player).color);
    const name = make("span", "chip-name");
    name.textContent = `${POSITION_META[row.position - 1].emoji} ${row.player}`;
    chip.appendChild(name);
    chip.appendChild(make("span", "chip-points", `${row.points} pts`));
    dom.previewList.appendChild(chip);
  }
}

function readFormRows() {
  return formRows.map((row) => ({
    position: row.position,
    player: row.select.value,
    points: Number(row.points.value),
  }));
}

function handleGameSelectChange() {
  const addingNew = dom.gameSelect.value === "__new";
  dom.newGameInput.hidden = !addingNew;
  if (addingNew) dom.newGameInput.focus();
}

function resetPointFields() {
  for (const row of formRows) row.points.value = String(state.scoring[row.position]);
  updatePreview();
  showToast("Points reset to the current defaults.");
}

function handleGameSubmit(event) {
  event.preventDefault();
  clearFormMessage();

  const game = getSubmittedGameName();
  const date = dom.gameDate.value;
  const rows = readFormRows();

  if (!game) {
    setFormMessage("Choose a game or enter a new game name.", "error");
    return;
  }
  if (!isDateString(date)) {
    setFormMessage("Choose a valid date for the session.", "error");
    return;
  }

  for (const row of rows) {
    if (!row.player) {
      setFormMessage(`Choose a player for ${POSITION_META[row.position - 1].label} place.`, "error");
      return;
    }
    if (!Number.isFinite(row.points) || row.points < 0) {
      setFormMessage(`Points for ${POSITION_META[row.position - 1].label} must be zero or more.`, "error");
      return;
    }
  }

  if (new Set(rows.map((row) => row.player)).size !== rows.length) {
    setFormMessage("Each player can only take one position.", "error");
    return;
  }

  const duplicate = state.sessions.some(
    (session) =>
      session.id !== editingSessionId &&
      session.date === date &&
      session.game.toLowerCase() === game.toLowerCase()
  );
  if (duplicate) {
    setFormMessage(`${game} on ${formatDate(date)} is already logged.`, "error");
    return;
  }

  const session = {
    id: editingSessionId || makeId(),
    date,
    game,
    notes: dom.notesInput.value.trim(),
    results: rows.map((row) => ({
      player: row.player,
      position: row.position,
      points: roundScore(row.points),
    })),
  };

  if (editingSessionId) {
    const index = state.sessions.findIndex((item) => item.id === editingSessionId);
    if (index !== -1) state.sessions[index] = session;
  } else {
    state.sessions.push(session);
  }
  state.sessions.sort(compareSessions);
  if (!state.gameEmoji[game]) state.gameEmoji[game] = "🎮";

  const wasEditing = Boolean(editingSessionId);
  editingSessionId = null;
  dom.editBanner.hidden = true;
  dom.logButton.textContent = "Log game";

  saveState();
  renderDashboard();
  renderGameEmojiList();
  resetForm();
  setFormMessage(
    wasEditing ? `${game} updated successfully.` : `${game} logged successfully.`,
    "success"
  );
  showToast(wasEditing ? `${game} updated.` : `${game} added to the tracker.`);
}

function getSubmittedGameName() {
  if (dom.gameSelect.value === "__new") {
    return dom.newGameInput.value.replace(/[\r\n]/g, " ").trim();
  }
  return dom.gameSelect.value.replace(/[\r\n]/g, " ").trim();
}

function handleHistoryClick(event) {
  const editButton = event.target.closest("[data-edit-session-id]");
  if (editButton) {
    startEditing(editButton.dataset.editSessionId);
    return;
  }
  const button = event.target.closest("[data-session-id]");
  if (!button) return;
  const session = state.sessions.find((item) => item.id === button.dataset.sessionId);
  if (!session) return;
  const confirmed = window.confirm(`Remove the ${session.game} session from ${formatDate(session.date)}?`);
  if (!confirmed) return;
  if (editingSessionId === session.id) cancelEdit();
  state.sessions = state.sessions.filter((item) => item.id !== session.id);
  saveState();
  renderDashboard();
  resetForm();
  showToast("Session removed.");
}

function startEditing(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  editingSessionId = sessionId;
  dom.editBanner.hidden = false;
  dom.editBannerText.textContent = `Editing ${session.game} from ${formatDate(session.date)}`;
  dom.logButton.textContent = "Save changes";

  populateGameSelect(session.game);
  dom.gameDate.value = session.date;
  dom.notesInput.value = session.notes || "";
  dom.newGameInput.hidden = true;
  dom.newGameInput.value = "";
  renderResultRows(session.results);
  updatePreview();
  clearFormMessage();

  dom.logSection.scrollIntoView({ behavior: "smooth", block: "start" });
  dom.gameSelect.focus();
  showToast("Loaded session into the form. Save to apply, or cancel.");
}

function cancelEdit() {
  editingSessionId = null;
  dom.editBanner.hidden = true;
  dom.editBannerText.textContent = "Editing a saved session";
  dom.logButton.textContent = "Log game";
  clearFormMessage();
  resetForm();
}

function renderDataSettingsMessage(message, type = "success") {
  dom.settingsMessage.textContent = message;
  dom.settingsMessage.style.color = type === "error" ? "var(--danger)" : "var(--mint)";
}

function exportData() {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `board-game-tracker-${todayString()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  renderDataSettingsMessage("Backup downloaded.");
  showToast("JSON backup downloaded.");
}

function openImportPicker() {
  dom.importFile.value = "";
  dom.importFile.click();
}

function handleImportFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  file.text()
    .then((text) => {
      const imported = JSON.parse(text);
      if (!imported || typeof imported !== "object" || !Array.isArray(imported.sessions)) {
        throw new Error("This file does not look like a tracker backup.");
      }
      const nextState = normalizeState(imported);
      if (!window.confirm(`Import ${nextState.sessions.length} game session${nextState.sessions.length === 1 ? "" : "s"}? This will replace the current data.`)) return;
      state = nextState;
      editingSessionId = null;
      dom.editBanner.hidden = true;
      dom.logButton.textContent = "Log game";
      saveState();
      renderDashboard();
      renderScoringInputs();
      renderRoster();
      renderGameEmojiList();
      resetForm();
      renderDataSettingsMessage("Backup imported successfully.");
      showToast("Backup imported.");
    })
    .catch((error) => {
      renderDataSettingsMessage(`Could not import: ${error.message}`, "error");
    });
}

function clearAllData() {
  if (!window.confirm("Clear all logged games from this browser? Export a backup first if you want to keep them.")) return;
  state = createEmptyState();
  editingSessionId = null;
  dom.editBanner.hidden = true;
  dom.logButton.textContent = "Log game";
  saveState();
  renderDashboard();
  renderScoringInputs();
  renderRoster();
  renderGameEmojiList();
  resetForm();
  renderDataSettingsMessage("All logged games cleared.");
  showToast("All logged games cleared.");
}

function resetScoring() {
  state.scoring = clone(DEFAULT_SCORING);
  saveState();
  renderScoringInputs();
  syncPositionHints();
  renderDataSettingsMessage("Default scoring restored.");
  showToast("Default scoring restored.");
}

function setFormMessage(message, type) {
  dom.formMessage.textContent = message;
  dom.formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

function clearFormMessage() {
  setFormMessage("", "");
}

function getPlayer(name) {
  return state.players.find((player) => player.name === name) || { name, emoji: "🎲", color: "#8f93a7" };
}

function getGameEmoji(game) {
  return state.gameEmoji[game] || DEFAULT_GAME_EMOJI[game] || "🎮";
}

function createOption(value, text) {
  const option = make("option", "", text);
  option.value = value;
  return option;
}

function make(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!isDateString(value)) return value;
  const [year, month, day] = value.split("-");
  const date = new Date(`${value}T00:00:00`);
  return `${day} ${date.toLocaleString("en", { month: "short" })} ${year}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("visible"), 2800);
}
