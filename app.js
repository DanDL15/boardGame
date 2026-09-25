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
  { name: "Daniel", emoji: "🎩", color: "#4a6fb5" },
  { name: "Emily", emoji: "🌸", color: "#b5546e" },
  { name: "Hector", emoji: "🦜", color: "#4a7c59" },
  { name: "Ben", emoji: "🐻", color: "#a8763a" },
  { name: "Amy", emoji: "⭐", color: "#6b5aa8" },
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
/* Which finishing place the next player tap lands in. null = "the next open place". */
let aimedPosition = null;
/* Last destructive action, so the toast can offer a real undo. */
let undoSnapshot = null;
/* Solo or team logging. */
let formMode = "solo";
/* Two-tap delete: first tap arms, second confirms. Nothing vanishes on one tap. */
let armedDeleteId = null;
let armedDeleteTimer = 0;
let armedClearAll = false;
let armedClearTimer = 0;
/* Chronicle filters (not persisted). */
const filters = { q: "", game: "", player: "" };

const TABS = ["tower", "log", "chronicle", "stats", "vault"];
let activeTab = "tower";

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  state = loadState();
  bindEvents();
  renderScoringInputs();
  renderRoster();
  renderGameEmojiList();
  initTabs();
  renderDashboard();
  resetForm();
  updateStorageStatus();
  initSync();
}

function cacheDom() {
  dom.gameForm = document.querySelector("#gameForm");
  dom.gameSelect = document.querySelector("#gameSelect");
  dom.newGameInput = document.querySelector("#newGameInput");
  dom.gameDate = document.querySelector("#gameDate");
  dom.notesInput = document.querySelector("#notesInput");
  dom.stoneList = document.querySelector("#stoneList");
  dom.playerPool = document.querySelector("#playerPool");
  dom.podiumHint = document.querySelector("#podiumHint");
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
  dom.toastText = document.querySelector("#toastText");
  dom.editBanner = document.querySelector("#editBanner");
  dom.editBannerText = document.querySelector("#editBannerText");
  dom.cancelEditButton = document.querySelector("#cancelEditButton");
  dom.logButton = document.querySelector("#logButton");
  dom.resetPointsButton = document.querySelector("#resetPointsButton");
  dom.formMessage = document.querySelector("#formMessage");
  dom.everyonePlayedButton = document.querySelector("#everyonePlayedButton");
  dom.repeatLastButton = document.querySelector("#repeatLastButton");
  dom.clearBoardButton = document.querySelector("#clearBoardButton");
  dom.ledgerStats = document.querySelector("#ledgerStats");
  dom.undoButton = document.querySelector("#undoButton");
  dom.rollBlock = document.querySelector("#rollBlock");
  dom.rollHeading = document.querySelector("#rollHeading");
  dom.teamBlock = document.querySelector("#teamBlock");
  dom.teamRows = document.querySelector("#teamRows");
  dom.rosterList = document.querySelector("#rosterList");
  dom.rosterMessage = document.querySelector("#rosterMessage");
  dom.gameEmojiList = document.querySelector("#gameEmojiList");
  dom.gameEmojiMessage = document.querySelector("#gameEmojiMessage");
  dom.logSection = document.querySelector("#logSection");
  dom.tabbar = document.querySelector("#tabbar");
  dom.syncStatus = document.querySelector("#syncStatus");
  dom.modeSoloButton = document.querySelector("#modeSoloButton");
  dom.modeTeamsButton = document.querySelector("#modeTeamsButton");
  dom.teamNames = document.querySelector("#teamNames");
  dom.teamAName = document.querySelector("#teamAName");
  dom.teamBName = document.querySelector("#teamBName");
  dom.historySearch = document.querySelector("#historySearch");
  dom.historyGameFilter = document.querySelector("#historyGameFilter");
  dom.historyPlayerFilter = document.querySelector("#historyPlayerFilter");
  dom.bestGrid = document.querySelector("#bestGrid");
  dom.streakRows = document.querySelector("#streakRows");
  dom.h2hTable = document.querySelector("#h2hTable");
  dom.formChart = document.querySelector("#formRows");
  dom.sbUrl = document.querySelector("#sbUrl");
  dom.sbKey = document.querySelector("#sbKey");
  dom.syncConnectButton = document.querySelector("#syncConnectButton");
  dom.syncDisconnectButton = document.querySelector("#syncDisconnectButton");
  dom.syncPushButton = document.querySelector("#syncPushButton");
  dom.syncMessage = document.querySelector("#syncMessage");
}

function bindEvents() {
  dom.gameForm.addEventListener("submit", handleGameSubmit);
  dom.gameSelect.addEventListener("change", handleGameSelectChange);
  dom.resetPointsButton.addEventListener("click", resetAllPoints);
  dom.historyList.addEventListener("click", handleHistoryClick);
  dom.stoneList.addEventListener("click", handleStoneClick);
  dom.playerPool.addEventListener("click", handlePoolClick);
  dom.exportButton.addEventListener("click", exportData);
  dom.dataExportButton.addEventListener("click", exportData);
  dom.importButton.addEventListener("click", openImportPicker);
  dom.dataImportButton.addEventListener("click", openImportPicker);
  dom.importFile.addEventListener("change", handleImportFile);
  dom.clearDataButton.addEventListener("click", clearAllData);
  dom.resetScoringButton.addEventListener("click", resetScoring);
  dom.cancelEditButton.addEventListener("click", cancelEdit);
  dom.everyonePlayedButton.addEventListener("click", fillEveryonePlayed);
  dom.repeatLastButton.addEventListener("click", repeatLastGame);
  dom.clearBoardButton.addEventListener("click", clearBoard);
  dom.undoButton.addEventListener("click", performUndo);
  dom.tabbar.addEventListener("click", handleTabClick);
  dom.modeSoloButton.addEventListener("click", () => setFormMode("solo"));
  dom.modeTeamsButton.addEventListener("click", () => setFormMode("teams"));
  dom.teamAName.addEventListener("input", syncTeamNames);
  dom.teamBName.addEventListener("input", syncTeamNames);
  dom.historySearch.addEventListener("input", () => {
    filters.q = dom.historySearch.value.trim().toLowerCase();
    renderHistory();
  });
  dom.historyGameFilter.addEventListener("change", () => {
    filters.game = dom.historyGameFilter.value;
    renderHistory();
  });
  dom.historyPlayerFilter.addEventListener("change", () => {
    filters.player = dom.historyPlayerFilter.value;
    renderHistory();
  });
  dom.syncConnectButton.addEventListener("click", connectSync);
  dom.syncDisconnectButton.addEventListener("click", disconnectSync);
  dom.syncPushButton.addEventListener("click", pushToRemoteNow);

  // Number keys aim at a place, Escape stands down — so the whole board is
  // reachable without touching a mouse.
  dom.gameForm.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "Escape") {
      if (aimedPosition === null) return;
      aimedPosition = null;
      renderBoard();
      return;
    }
    const digit = Number(event.key);
    if (!Number.isInteger(digit) || digit < 1 || digit > POSITION_META.length) return;
    // Don't hijack typing in a text field.
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (event.target.type !== "button") return;
    }
    const position = POSITION_META[digit - 1].position;
    aimAt(aimedPosition === position ? null : position);
  });

  window.addEventListener("hashchange", routeFromHash);

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

/* ═══════════════════════════════ TABS ═══════════════════════════════ */

function initTabs() {
  routeFromHash();
}

function routeFromHash() {
  const hash = typeof window.location === "undefined" ? "" : String(window.location.hash || "");
  const match = hash.match(/^#\/(\w+)/);
  switchTab(match && TABS.includes(match[1]) ? match[1] : "tower", { replace: true });
}

function handleTabClick(event) {
  const link = event.target.closest("[data-tab]");
  if (!link) return;
  event.preventDefault();
  switchTab(link.dataset.tab);
}

function switchTab(name, options) {
  if (!TABS.includes(name)) name = "tower";
  activeTab = name;
  const panels = document.querySelectorAll("[data-panel]");
  for (let i = 0; i < panels.length; i++) {
    panels[i].hidden = panels[i].dataset.panel !== name;
  }
  const links = dom.tabbar.querySelectorAll("[data-tab]");
  for (let j = 0; j < links.length; j++) {
    const on = links[j].dataset.tab === name;
    links[j].classList.toggle("is-active", on);
    if (on) links[j].setAttribute("aria-current", "page");
    else links[j].removeAttribute("aria-current");
  }
  const want = `#/${name}`;
  if (!(options && options.replace) && typeof window.location !== "undefined" && window.location.hash !== want) {
    window.location.hash = want;
  }
  const titles = { tower: "The Tower", log: "Log a Session", chronicle: "The Chronicle", stats: "Stats", vault: "The Vault" };
  const section = document.querySelector(`[data-panel="${name}"]`);
  if (section && !(options && options.replace)) section.scrollIntoView({ behavior: "smooth", block: "start" });
  document.title = `${titles[name]} · The Tower`;
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

  const mode = candidate.mode === "teams" ? "teams" : "solo";
  const teams = {
    A: String((candidate.teams && candidate.teams.A) || "Team A").trim().slice(0, 24) || "Team A",
    B: String((candidate.teams && candidate.teams.B) || "Team B").trim().slice(0, 24) || "Team B",
  };

  const results = Array.isArray(candidate.results)
    ? candidate.results
        .map((result) => {
          if (!result || typeof result !== "object") return null;
          const player = String(result.player || "").trim();
          const position = Number(result.position);
          const points = Number(result.points);
          if (!player || !Number.isInteger(position) || position < 1 || position > 5) return null;
          const team = mode === "teams" && (result.team === "A" || result.team === "B") ? result.team : null;
          return {
            player: player.slice(0, 80),
            position,
            points: Number.isFinite(points) && points >= 0 ? roundScore(points) : 0,
            team,
          };
        })
        .filter(Boolean)
    : [];

  if (!results.length) return null;
  return {
    id: String(candidate.id || makeId()),
    date,
    game: game.slice(0, 100),
    mode,
    teams,
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

// 5 stays "5", 2.5 stays "2.5" — no trailing ".00" leaking into the UI.
function trimNumber(value) {
  const rounded = roundScore(Number(value) || 0);
  return Object.is(rounded, -0) ? "0" : String(rounded);
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
  pushToRemote();
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
  renderLeaderboard(standings);
  renderTeamStandings();
  renderPerGameStandings();
  populateHistoryFilters();
  renderHistory();
  renderStats();
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

function renderLedgerStats(standings) {
  if (!dom.ledgerStats) return;
  dom.ledgerStats.replaceChildren();

  const totalGames = state.sessions.length;
  const gameTypes = new Set(state.sessions.map((s) => s.game.toLowerCase())).size;
  const totalPoints = roundScore(
    state.sessions.reduce(
      (total, session) => total + session.results.reduce((sum, r) => sum + r.points, 0),
      0
    )
  );
  const leader = standings[0];
  const leaderPlayer = leader ? getPlayer(leader.name) : null;

  const stats = [
    { label: "Sessions kept", value: String(totalGames) },
    { label: "Different games", value: String(gameTypes) },
    { label: "Points awarded", value: trimNumber(totalPoints) },
    {
      label: "Reigning champion",
      value: leader ? leader.name : "—",
      sub: leader ? `${trimNumber(leader.points)} pts` : "log the first game",
      color: leaderPlayer ? leaderPlayer.color : null,
    },
  ];

  for (const stat of stats) {
    const tile = make("div", "stat-tile");
    if (stat.color) tile.style.setProperty("--player-color", stat.color);
    tile.appendChild(make("span", "stat-value", stat.value));
    tile.appendChild(make("span", "stat-label", stat.label));
    if (stat.sub) tile.appendChild(make("span", "stat-sub", stat.sub));
    dom.ledgerStats.appendChild(tile);
  }
}

function renderLeaderboard(standings) {
  const totalGames = state.sessions.length;
  const leader = standings[0];
  const challenger = standings[1];

  renderLedgerStats(standings);

  dom.leaderboardSummary.textContent = !totalGames
    ? "The ledger lies empty — log a session and the crown finds a keeper."
    : leader && challenger
      ? `${leader.name} leads by ${trimNumber(roundScore(leader.points - challenger.points))} points over ${challenger.name}.`
      : leader
        ? `${leader.name} is the only name in the ledger so far.`
        : "";

  dom.podium.replaceChildren();
  dom.leaderboardRows.replaceChildren();
  if (dom.rollBlock) dom.rollBlock.hidden = false;

  if (!standings.length) {
    dom.podium.appendChild(
      make("div", "empty-state", "No score has been carved yet. Log a session below and the stones start filling.")
    );
    if (dom.rollBlock) dom.rollBlock.hidden = true;
    return;
  }

  // Top three as raised stones: 1st centre and tallest, flanked by 2nd and 3rd.
  const [first, second, third] = standings;
  dom.podium.appendChild(createStoneCard(first, "stone-first", "1st", true));
  dom.podium.appendChild(createStoneCard(second, "stone-second", "2nd", false));
  dom.podium.appendChild(createStoneCard(third, "stone-third", "3rd", false));

  // The podium already carries the top three, so the roll starts at fourth.
  // Listing them again made the page look like the household had six winners.
  const rest = standings.slice(3);
  if (!rest.length) {
    if (dom.rollBlock) dom.rollBlock.hidden = true;
    return;
  }

  if (dom.rollHeading) {
    dom.rollHeading.textContent =
      standings.length === 4 ? "The Only One Still Waiting" : "The Rest of the Household";
  }

  // Bars scale against the leader, so the champion's bar is always full width.
  const maxPoints = first.points || 1;
  for (const standing of rest) {
    const rank = standings.indexOf(standing) + 1;
    const row = make("article", "roll-row");
    row.style.setProperty("--player-color", getPlayer(standing.name).color);

    row.appendChild(make("span", "roll-rank", String(rank)));
    row.appendChild(make("span", "roll-avatar", getPlayer(standing.name).emoji));

    const copy = make("div", "roll-copy");
    const nameLine = make("div", "roll-name-line");
    nameLine.appendChild(make("span", "roll-name", standing.name));
    copy.appendChild(nameLine);

    const chips = make("div", "roll-chips");
    chips.appendChild(make("span", "roll-chip", `${standing.plays} play${standing.plays === 1 ? "" : "s"}`));
    chips.appendChild(make("span", "roll-chip is-wins", `🏆 ${standing.wins}`));
    chips.appendChild(make("span", "roll-chip", `2nd × ${standing.seconds}`));
    chips.appendChild(make("span", "roll-chip", `3rd × ${standing.thirds}`));
    chips.appendChild(make("span", "roll-chip", `${trimNumber(standing.pointsPerPlay)} / play`));
    copy.appendChild(chips);

    const bar = make("div", "roll-bar");
    const fill = make("span", "roll-bar-fill");
    fill.style.width = `${Math.max(0, Math.min(100, (standing.points / maxPoints) * 100))}%`;
    bar.appendChild(fill);
    copy.appendChild(bar);

    row.append(copy, make("strong", "roll-total", trimNumber(standing.points)));
    dom.leaderboardRows.appendChild(row);
  }
}

function createStoneCard(standing, className, label, crowned) {
  const card = make("article", `stone-card ${className}`);
  if (!standing) {
    card.appendChild(make("span", "stone-rank", label));
    card.appendChild(make("span", "stone-avatar", "—"));
    card.appendChild(make("span", "stone-name", "—"));
    card.appendChild(make("span", "stone-points", "0"));
    card.appendChild(make("span", "stone-points-label", "points"));
    return card;
  }

  const player = getPlayer(standing.name);
  card.style.setProperty("--player-color", player.color);
  card.appendChild(make("span", "stone-rank", label));
  if (crowned) card.appendChild(make("span", "stone-crown", "👑"));
  card.appendChild(make("span", "stone-avatar", player.emoji));
  card.appendChild(make("span", "stone-name", standing.name));
  card.appendChild(make("span", "stone-points", trimNumber(standing.points)));
  card.appendChild(make("span", "stone-points-label", "points"));
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
  const sessions = filteredSessions();
  if (!state.sessions.length) {
    dom.historyList.appendChild(make("div", "empty-state", "No sessions recorded yet. Log the first game and it'll appear here."));
    return;
  }
  if (!sessions.length) {
    dom.historyList.appendChild(make("div", "empty-state", "Nothing matches those filters. Loosen them and the stones reappear."));
    return;
  }

  for (const session of sessions) {
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
      if (session.mode === "teams" && winner.team) {
        winnerLine.appendChild(make("span", `team-chip ${winner.team === "A" ? "is-a" : "is-b"}`, teamLabel(session, winner.team)));
      }
      winnerLine.appendChild(make("span", "winner-points", `${winner.points} pts`));
      card.appendChild(winnerLine);
    }

    const results = make("div", "history-results");
    for (const result of sortedResults) {
      const label = session.mode === "teams" && result.team
        ? `${POSITION_META[result.position - 1]?.emoji || `#${result.position}`} ${result.player} · ${teamLabel(session, result.team)} · ${result.points}pts`
        : `${POSITION_META[result.position - 1]?.emoji || `#${result.position}`} ${result.player} · ${result.points}pts`;
      const resultChip = make("span", `history-result${result.position === 1 ? " winner" : ""}`, label);
      resultChip.style.borderColor = `${getPlayer(result.player).color}66`;
      results.appendChild(resultChip);
    }
    card.appendChild(results);

    if (session.notes) card.appendChild(make("p", "history-notes", `“${session.notes}”`));

    const actions = make("div", "history-actions");
    const edit = make("button", "edit-button", "Edit");
    edit.type = "button";
    edit.dataset.editSessionId = session.id;
    const armed = armedDeleteId === session.id;
    const remove = make("button", `delete-button${armed ? " is-armed" : ""}`, armed ? "Tap again to confirm" : "Remove session");
    remove.type = "button";
    remove.dataset.sessionId = session.id;
    actions.append(edit, remove);
    card.appendChild(actions);
    item.appendChild(card);
    dom.historyList.appendChild(item);
  }
}

function teamLabel(session, side) {
  if (!session || !session.teams) return side === "A" ? "Team A" : "Team B";
  return side === "A" ? session.teams.A : session.teams.B;
}

function filteredSessions() {
  const ordered = [...state.sessions].sort(compareSessions).reverse();
  return ordered.filter((session) => {
    if (filters.game && session.game !== filters.game) return false;
    if (filters.player && !session.results.some((r) => r.player === filters.player)) return false;
    if (filters.q) {
      const hay = `${session.game} ${session.notes} ${session.results.map((r) => r.player).join(" ")}`.toLowerCase();
      if (!hay.includes(filters.q)) return false;
    }
    return true;
  });
}

function populateHistoryFilters() {
  const games = [...new Set(state.sessions.map((s) => s.game))].sort((a, b) => a.localeCompare(b));
  const keepGame = filters.game;
  dom.historyGameFilter.replaceChildren();
  dom.historyGameFilter.appendChild(createOption("", "All games"));
  for (const game of games) dom.historyGameFilter.appendChild(createOption(game, `${getGameEmoji(game)} ${game}`));
  dom.historyGameFilter.value = games.includes(keepGame) ? keepGame : "";
  filters.game = dom.historyGameFilter.value;

  const keepPlayer = filters.player;
  dom.historyPlayerFilter.replaceChildren();
  dom.historyPlayerFilter.appendChild(createOption("", "Everyone"));
  for (const player of state.players) dom.historyPlayerFilter.appendChild(createOption(player.name, `${player.emoji} ${player.name}`));
  dom.historyPlayerFilter.value = state.players.some((p) => p.name === keepPlayer) ? keepPlayer : "";
  filters.player = dom.historyPlayerFilter.value;
}

function renderTeamStandings() {
  if (!dom.teamRows) return;
  dom.teamRows.replaceChildren();
  const totals = new Map();
  for (const session of state.sessions) {
    if (session.mode !== "teams") continue;
    for (const result of session.results) {
      if (!result.team) continue;
      const key = `${result.team}|||${teamLabel(session, result.team)}`;
      if (!totals.has(key)) totals.set(key, { name: teamLabel(session, result.team), side: result.team, points: 0, plays: 0, wins: 0 });
      const t = totals.get(key);
      t.points += result.points;
      t.plays += 1;
      if (result.position === 1) t.wins += 1;
    }
  }
  const ranked = [...totals.values()]
    .map((t) => ({ ...t, points: roundScore(t.points) }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
  dom.teamBlock.hidden = !ranked.length;
  if (!ranked.length) return;
  const maxPoints = ranked[0].points || 1;
  ranked.forEach((team, index) => {
    const row = make("article", "roll-row");
    row.appendChild(make("span", "roll-rank", String(index + 1)));
    row.appendChild(make("span", `team-chip ${team.side === "A" ? "is-a" : "is-b"}`, team.name));
    const copy = make("div", "roll-copy");
    const chips = make("div", "roll-chips");
    chips.appendChild(make("span", "roll-chip", `${team.plays} play${team.plays === 1 ? "" : "s"}`));
    chips.appendChild(make("span", "roll-chip is-wins", `🏆 ${team.wins}`));
    copy.appendChild(chips);
    const bar = make("div", "roll-bar");
    const fill = make("span", "roll-bar-fill");
    fill.style.width = `${Math.max(0, Math.min(100, (team.points / maxPoints) * 100))}%`;
    bar.appendChild(fill);
    copy.appendChild(bar);
    row.append(copy, make("strong", "roll-total", trimNumber(team.points)));
    dom.teamRows.appendChild(row);
  });
}

/* ═══════════════════════════════ STATS ═══════════════════════════════ */

function sessionsNewestFirst() {
  return [...state.sessions].sort(compareSessions).reverse();
}

function calculateStreaks() {
  return state.players.map((player) => {
    const lastFive = [];
    for (const session of sessionsNewestFirst()) {
      const result = session.results.find((r) => r.player === player.name);
      if (!result) continue;
      if (lastFive.length < 5) lastFive.push(result.position);
      else break;
    }
    // Current win streak: consecutive wins counting back from the latest play.
    let streak = 0;
    for (const session of sessionsNewestFirst()) {
      const result = session.results.find((r) => r.player === player.name);
      if (!result) continue;
      if (result.position === 1) streak += 1;
      else break;
    }
    return { name: player.name, streak, lastFive };
  });
}

function calculateHeadToHead() {
  const names = state.players.map((p) => p.name);
  const matrix = {};
  for (const a of names) {
    matrix[a] = {};
    for (const b of names) matrix[a][b] = 0;
  }
  for (const session of state.sessions) {
    const present = session.results.filter((r) => names.includes(r.player));
    for (let i = 0; i < present.length; i++) {
      for (let j = 0; j < present.length; j++) {
        if (i === j) continue;
        if (present[i].position < present[j].position) matrix[present[i].player][present[j].player] += 1;
      }
    }
  }
  return { names, matrix };
}

function perGameBest() {
  const best = new Map();
  for (const session of state.sessions) {
    const key = session.game.toLowerCase();
    if (!best.has(key)) best.set(key, { game: session.game, points: -1, holder: "", date: "" });
    const entry = best.get(key);
    for (const result of session.results) {
      if (result.points > entry.points) {
        entry.points = result.points;
        entry.holder = result.player;
        entry.date = session.date;
      }
    }
  }
  return [...best.values()].sort((a, b) => a.game.localeCompare(b.game));
}

function renderStats() {
  if (!dom.bestGrid) return;
  const bests = perGameBest();
  dom.bestGrid.replaceChildren();
  if (!bests.length) {
    dom.bestGrid.appendChild(make("div", "empty-state", "No records yet — the tower remembers everything from here on."));
  }
  for (const best of bests) {
    const card = make("article", "game-card");
    const heading = make("div", "game-card-heading");
    heading.appendChild(make("span", "game-card-emoji", getGameEmoji(best.game)));
    heading.appendChild(make("h3", "", best.game));
    card.appendChild(heading);
    const line = make("div", "best-line");
    line.appendChild(make("span", "", `${best.holder} · ${formatDate(best.date)}`));
    line.appendChild(make("strong", "", `${trimNumber(best.points)} pts`));
    card.appendChild(line);
    dom.bestGrid.appendChild(card);
  }

  const streaks = calculateStreaks();
  dom.streakRows.replaceChildren();
  const maxStreak = Math.max(1, ...streaks.map((s) => s.streak));
  streaks
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name))
    .forEach((row, index) => {
      const el = make("article", "roll-row");
      el.style.setProperty("--player-color", getPlayer(row.name).color);
      el.appendChild(make("span", "roll-rank", String(index + 1)));
      el.appendChild(make("span", "roll-avatar", getPlayer(row.name).emoji));
      const copy = make("div", "roll-copy");
      const nameLine = make("div", "roll-name-line");
      nameLine.appendChild(make("span", "roll-name", row.name));
      const dots = make("span", "streak-dots");
      for (const pos of row.lastFive) {
        dots.appendChild(make("span", `streak-dot${pos === 1 ? " is-win" : pos <= 3 ? " is-podium" : ""}`));
      }
      nameLine.appendChild(dots);
      copy.appendChild(nameLine);
      const chips = make("div", "roll-chips");
      chips.appendChild(make("span", `roll-chip${row.streak ? " is-wins" : ""}`,
        row.streak ? `🔥 ${row.streak}-win streak` : "no streak"));
      copy.appendChild(chips);
      const bar = make("div", "roll-bar");
      const fill = make("span", "roll-bar-fill");
      fill.style.width = `${Math.max(row.streak ? 8 : 0, Math.min(100, (row.streak / maxStreak) * 100))}%`;
      bar.appendChild(fill);
      copy.appendChild(bar);
      el.append(copy, make("strong", "roll-total", row.streak ? `×${row.streak}` : "—"));
      dom.streakRows.appendChild(el);
    });

  const { names, matrix } = calculateHeadToHead();
  dom.h2hTable.replaceChildren();
  const head = make("tr", "");
  head.appendChild(make("th", "", "↓ beat →"));
  for (const name of names) head.appendChild(make("th", "", name));
  dom.h2hTable.appendChild(head);
  for (const a of names) {
    const tr = make("tr", "");
    tr.appendChild(make("th", "", a));
    let bestCount = 0;
    for (const b of names) {
      if (a !== b && matrix[a][b] > bestCount) bestCount = matrix[a][b];
    }
    for (const b of names) {
      const val = a === b ? "—" : String(matrix[a][b]);
      const td = make("td", a !== b && matrix[a][b] === bestCount && bestCount > 0 ? "is-best" : "", val);
      tr.appendChild(td);
    }
    dom.h2hTable.appendChild(tr);
  }

  dom.formChart.replaceChildren();
  const standings = calculateStandings();
  const top = standings.slice(0, 5);
  for (const standing of top) {
    const plays = sessionsNewestFirst()
      .filter((s) => s.results.some((r) => r.player === standing.name))
      .slice(0, 10)
      .reverse();
    const el = make("article", "roll-row");
    el.style.setProperty("--player-color", getPlayer(standing.name).color);
    el.appendChild(make("span", "roll-avatar", getPlayer(standing.name).emoji));
    const copy = make("div", "roll-copy");
    copy.appendChild(make("span", "roll-name", standing.name));
    const spark = make("div", "spark");
    const maxPts = Math.max(1, ...plays.map((s) => s.results.find((r) => r.player === standing.name).points));
    for (const session of plays) {
      const result = session.results.find((r) => r.player === standing.name);
      const bar = make("span", `spark-bar${result.position === 1 ? " is-win" : ""}`);
      bar.style.height = `${Math.max(8, Math.round((result.points / maxPts) * 100))}%`;
      bar.setAttribute("aria-label", `${session.game}: ${result.points} pts`);
      spark.appendChild(bar);
    }
    if (!plays.length) spark.appendChild(make("span", "roll-chip", "no plays yet"));
    copy.appendChild(spark);
    el.appendChild(copy);
    el.appendChild(make("strong", "roll-total", trimNumber(standing.points)));
    dom.formChart.appendChild(el);
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
      renderHistory();
      renderPerGameStandings();
    });
    input.addEventListener("blur", () => {
      const cleaned = input.value.trim() || "🎮";
      input.value = cleaned;
      state.gameEmoji[game] = cleaned;
      saveState();
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
      renderBoard();
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

  populateGameSelect(draft ? draft.game : editing ? editing.game : latest ? latest.game : "");
  if (draft && draft.newGameName) {
    dom.gameSelect.value = "__new";
    dom.newGameInput.hidden = false;
    dom.newGameInput.value = draft.newGameName;
  }
  dom.gameDate.value = draft && draft.date ? draft.date : editing ? editing.date : todayString();
  dom.notesInput.value = draft && draft.notes ? draft.notes : editing ? editing.notes || "" : "";
  dom.newGameInput.hidden = !draft || !draft.newGameName;
  if (!draft) dom.newGameInput.value = "";

  // Start from an empty board. Pre-filling with the previous session's exact
  // result made the form look like a finished entry and all but invited
  // duplicate logging — "repeat last" is now an explicit button instead.
  aimedPosition = null;
  if (draft && draft.mode) {
    formMode = draft.mode;
    if (draft.teams) {
      dom.teamAName.value = draft.teams.A;
      dom.teamBName.value = draft.teams.B;
    }
  } else if (!draft && !editing) {
    formMode = "solo";
  }
  if (!draft) {
    prefillBoard(editing ? editing.results : []);
    if (editing) {
      formMode = editing.mode === "teams" ? "teams" : "solo";
      dom.teamAName.value = editing.teams.A;
      dom.teamBName.value = editing.teams.B;
    }
  }
  renderBoard();
}

function prefillBoard(results) {
  formRows = POSITION_META.map((meta) => {
    const match = results.find((r) => r.position === meta.position);
    const points = match && Number.isFinite(match.points) ? match.points : state.scoring[meta.position];
    return {
      position: meta.position,
      player: match ? match.player : "",
      points,
      team: match && (match.team === "A" || match.team === "B") ? match.team : null,
    };
  });
}

// Snapshots the board so a settings change never wipes a half-filled session.
function readFormDraft() {
  const results = readFormRows().filter((row) => row.player);
  if (!results.length) return null;
  const newGameName = dom.gameSelect.value === "__new" ? dom.newGameInput.value.trim() : "";
  return {
    game: dom.gameSelect.value === "__new" ? newGameName : dom.gameSelect.value,
    newGameName,
    date: dom.gameDate.value,
    notes: dom.notesInput.value,
    mode: formMode,
    teams: teamNames(),
    results,
  };
}

function populateGameSelect(selectedGame) {
  const games = [...new Set(state.sessions.map((s) => s.game))].sort((a, b) => a.localeCompare(b));
  dom.gameSelect.replaceChildren();
  dom.gameSelect.appendChild(createOption("", "— choose a game —"));
  for (const game of games) dom.gameSelect.appendChild(createOption(game, `${getGameEmoji(game)} ${game}`));
  for (const game of Object.keys(DEFAULT_GAME_EMOJI)) {
    if (!games.includes(game)) dom.gameSelect.appendChild(createOption(game, `${DEFAULT_GAME_EMOJI[game]} ${game}`));
  }
  dom.gameSelect.appendChild(createOption("__new", "➕ Add a new game…"));
  dom.gameSelect.value =
    selectedGame && [...dom.gameSelect.options].some((o) => o.value === selectedGame) ? selectedGame : "";
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE BOARD — five stones, one per finishing place.

   Two tap targets per row:
     · the place badge  → aim here, and tap a second row to swap the two
     · the occupant     → send that player back to the pool
   A player tapped in the pool lands in the aimed place, or the next open one.
   ═══════════════════════════════════════════════════════════════════════════ */

function renderBoard() {
  dom.stoneList.replaceChildren();
  const players = state.players.slice(0, 5);
  const names = teamNames();

  dom.modeSoloButton.classList.toggle("is-primary", formMode === "solo");
  dom.modeTeamsButton.classList.toggle("is-primary", formMode === "teams");
  dom.modeSoloButton.setAttribute("aria-pressed", formMode === "solo" ? "true" : "false");
  dom.modeTeamsButton.setAttribute("aria-pressed", formMode === "teams" ? "true" : "false");
  dom.teamNames.hidden = formMode !== "teams";

  for (const meta of POSITION_META) {
    const row = formRows.find((r) => r.position === meta.position) || {
      position: meta.position,
      player: "",
      points: state.scoring[meta.position],
    };
    const player = row.player ? getPlayer(row.player) : null;
    const isAimed = aimedPosition === meta.position;

    const li = make(
      "li",
      `stone-row${row.player ? " is-filled" : ""}${meta.position === 1 ? " is-first" : ""}${isAimed ? " is-aimed" : ""}`
    );
    if (player) li.style.setProperty("--player-color", player.color);

    // ── The badge: aiming and swapping live here ──
    const place = make("button", "stone-place");
    place.type = "button";
    place.dataset.aimPosition = String(meta.position);
    place.setAttribute("aria-pressed", isAimed ? "true" : "false");
    place.setAttribute(
      "aria-label",
      isAimed
        ? `Stop aiming at ${meta.label} place`
        : `Aim at ${meta.label} place, then tap a player`
    );
    place.appendChild(make("span", "stone-place-emoji", meta.emoji));
    const placeText = make("span", "stone-place-text");
    placeText.appendChild(make("strong", "", meta.label));
    // Show the points actually on this row. Printing the default here made the
    // label quietly lie the moment somebody edited a value.
    placeText.appendChild(
      make("small", row.points === state.scoring[meta.position] ? "" : "is-custom", `${trimNumber(row.points)} pts`)
    );
    place.appendChild(placeText);

    // Occupant: a button so returning a player is one tap (and keyboard-reachable)
    const occupant = make("button", "stone-occupant");
    occupant.type = "button";
    if (player) {
      occupant.dataset.removePosition = String(meta.position);
      occupant.setAttribute("aria-label", `Send ${player.name} back to the pool from ${meta.label} place`);
      occupant.appendChild(make("span", "stone-occupant-emoji", player.emoji));
      occupant.appendChild(make("span", "stone-occupant-name", player.name));
      occupant.appendChild(make("span", "stone-occupant-remove", "remove"));
    } else {
      occupant.disabled = true;
      occupant.appendChild(
        make(
          "span",
          "stone-occupant-name",
          isAimed ? "Aimed — tap a player below" : "Empty — aim here, or tap a player below"
        )
      );
    }
    li.append(place, occupant);

    // Points: number field plus steppers, so it works on a phone
    const points = make("div", "stone-points");
    const minus = make("button", "step-btn", "−");
    minus.type = "button";
    minus.dataset.step = String(meta.position);
    minus.dataset.delta = "-1";
    minus.setAttribute("aria-label", `Reduce points for ${meta.label} place`);

    const input = make("input", "points-input");
    input.type = "number";
    input.min = "0";
    input.step = "0.5";
    input.inputMode = "decimal";
    input.id = `points-${meta.position}`;
    input.value = String(row.points);
    input.setAttribute("aria-label", `Points for ${meta.label} place`);
    input.addEventListener("input", () => {
      const target = formRows.find((r) => r.position === meta.position);
      if (target) target.points = Number(input.value);
      syncPlaceLabels();
    });

    const plus = make("button", "step-btn", "+");
    plus.type = "button";
    plus.dataset.step = String(meta.position);
    plus.dataset.delta = "1";
    plus.setAttribute("aria-label", `Increase points for ${meta.label} place`);

    points.append(minus, input, plus);
    li.appendChild(points);

    // Team switch on a filled stone (team games only).
    if (formMode === "teams" && player) {
      const teams = make("div", "stone-teams");
      for (const side of ["A", "B"]) {
        const btn = make("button", `stone-team-btn${row.team === side ? (side === "A" ? " is-on-a" : " is-on-b") : ""}`, side === "A" ? names.A : names.B);
        btn.type = "button";
        btn.dataset.teamPos = String(meta.position);
        btn.dataset.team = side;
        btn.setAttribute("aria-pressed", row.team === side ? "true" : "false");
        btn.setAttribute("aria-label", `Put ${player.name} in ${side === "A" ? names.A : names.B}`);
        teams.appendChild(btn);
      }
      li.appendChild(teams);
    }

    dom.stoneList.appendChild(li);
  }

  renderPool(players);
  updateHint();
}

function renderPool(players) {
  dom.playerPool.replaceChildren();
  const placed = new Set(formRows.map((r) => r.player).filter(Boolean));

  for (const player of players) {
    const chip = make("button", `pool-chip${placed.has(player.name) ? " is-placed" : ""}`);
    chip.type = "button";
    chip.style.setProperty("--player-color", player.color);
    const position = formRows.find((r) => r.player === player.name);

    if (position) {
      chip.disabled = true;
      chip.setAttribute("aria-label", `${player.name} is already in ${POSITION_META[position.position - 1].label} place`);
      chip.appendChild(make("span", "pool-chip-emoji", player.emoji));
      chip.appendChild(make("span", "pool-chip-place", POSITION_META[position.position - 1].label));
    } else {
      chip.dataset.placePlayer = player.name;
      chip.setAttribute("aria-label", `Place ${player.name} in the next open place`);
      chip.appendChild(make("span", "pool-chip-emoji", player.emoji));
      chip.appendChild(make("span", "pool-chip-name", player.name));
    }
    dom.playerPool.appendChild(chip);
  }
}

function updateHint() {
  if (!dom.podiumHint) return;
  const placed = formRows.filter((r) => r.player).length;

  if (aimedPosition) {
    const label = POSITION_META[aimedPosition - 1].label;
    const holder = formRows.find((r) => r.position === aimedPosition);
    dom.podiumHint.textContent = holder && holder.player
      ? `Aiming at ${label} place — tap a player to take ${holder.player}'s spot, or tap another place to swap.`
      : `Aiming at ${label} place — tap a player below to fill it.`;
    return;
  }

  if (!placed) {
    dom.podiumHint.textContent =
      "Tap “everyone played” for the usual case, or tap players one by one. Tap a place first if someone finished out of order.";
  } else if (placed < 5) {
    dom.podiumHint.textContent = `${placed} of 5 placed — the next player you tap takes the next open place.`;
  } else {
    dom.podiumHint.textContent = "All five placed. Tap two places to swap them, adjust the points, then log the session.";
  }
}

function handlePoolClick(event) {
  const chip = event.target.closest("[data-place-player]");
  if (!chip) return;
  placePlayer(chip.dataset.placePlayer);
}

function handleStoneClick(event) {
  const teamBtn = event.target.closest("[data-team-pos]");
  if (teamBtn) {
    const target = formRows.find((r) => r.position === Number(teamBtn.dataset.teamPos));
    if (!target) return;
    target.team = target.team === teamBtn.dataset.team ? null : teamBtn.dataset.team;
    renderBoard();
    return;
  }

  const step = event.target.closest("[data-step]");
  if (step) {
    const position = Number(step.dataset.step);
    const delta = Number(step.dataset.delta);
    const target = formRows.find((r) => r.position === position);
    if (!target) return;
    const current = Number.isFinite(target.points) ? target.points : 0;
    target.points = Math.max(0, roundScore(current + delta));
    const input = document.querySelector(`#points-${position}`);
    if (input) input.value = String(target.points);
    syncPlaceLabels();
    updateHint();
    return;
  }

  const remove = event.target.closest("[data-remove-position]");
  if (remove) {
    removePlayer(Number(remove.dataset.removePosition));
    return;
  }

  const aim = event.target.closest("[data-aim-position]");
  if (!aim) return;
  const position = Number(aim.dataset.aimPosition);
  // Aiming at one place and then tapping another swaps those two.
  if (aimedPosition !== null && aimedPosition !== position) {
    swapPositions(aimedPosition, position);
    return;
  }
  aimAt(aimedPosition === position ? null : position);
}

function aimAt(position) {
  aimedPosition = position;
  renderBoard();
  if (position) {
    const badge = dom.stoneList.querySelector(`[data-aim-position="${position}"]`);
    if (badge) badge.focus();
  }
}

// Points belong to the place, not the person, so a swap moves players only.
function swapPositions(a, b) {
  const rowA = formRows.find((r) => r.position === a);
  const rowB = formRows.find((r) => r.position === b);
  if (!rowA || !rowB || a === b) return;
  const held = rowA.player;
  rowA.player = rowB.player;
  rowB.player = held;
  aimedPosition = null;
  renderBoard();
  showToast(`Swapped ${POSITION_META[a - 1].label} and ${POSITION_META[b - 1].label} places.`);
}

function placePlayer(name) {
  const target = aimedPosition
    ? formRows.find((r) => r.position === aimedPosition)
    : formRows.find((r) => !r.player);

  if (!target) {
    showToast("All five places are taken. Tap a place to aim, or send someone back to the pool.");
    return;
  }

  // Whoever was in the aimed place is the one who actually gets evicted.
  const displaced = target.player && target.player !== name ? target.player : null;
  // Clear the player off any other stone first, so nobody can hold two places.
  for (const row of formRows) {
    if (row.player === name && row.position !== target.position) row.player = "";
  }

  target.player = name;
  target.points = state.scoring[target.position];
  aimedPosition = null;
  renderBoard();

  if (displaced) showToast(`${displaced} went back to the pool.`);
  const chip = dom.playerPool.querySelector("[data-place-player]");
  if (chip) chip.focus();
}

function removePlayer(position) {
  const target = formRows.find((r) => r.position === position);
  if (!target || !target.player) return;
  const name = target.player;
  target.player = "";
  target.team = null;
  target.points = state.scoring[position];
  if (aimedPosition === position) aimedPosition = null;
  renderBoard();
  const chip = dom.playerPool.querySelector(`[data-place-player="${cssEscape(name)}"]`);
  if (chip) chip.focus();
}

/* ── Board shortcuts: the three things you actually want to do ── */

function fillEveryonePlayed() {
  const open = formRows.filter((r) => !r.player);
  const waiting = state.players.slice(0, 5).filter((p) => !formRows.some((r) => r.player === p.name));

  if (!open.length || !waiting.length) {
    showToast("Everyone is already on a stone.");
    return;
  }

  const count = Math.min(open.length, waiting.length);
  for (let i = 0; i < count; i += 1) {
    open[i].player = waiting[i].name;
    open[i].points = state.scoring[open[i].position];
  }
  aimedPosition = null;
  renderBoard();
  showToast(`${count} placed in household order — tap two places to swap anyone who finished differently.`);
}

function clearBoard() {
  const placed = formRows.filter((r) => r.player).length;
  if (!placed) {
    showToast("The board is already empty.");
    return;
  }
  prefillBoard([]);
  aimedPosition = null;
  renderBoard();
  showToast(`Sent all ${placed} back to the pool.`);
}

function repeatLastGame() {
  const last = state.sessions.length ? state.sessions[state.sessions.length - 1] : null;
  if (!last) {
    showToast("No earlier session to copy yet.");
    return;
  }
  prefillBoard(last.results);
  dom.gameSelect.value = last.game;
  dom.gameDate.value = todayString();
  aimedPosition = null;
  renderBoard();
  showToast(`Copied the order from ${last.game}. Change the date if that was a different day.`);
}

// Keeps each badge's points label honest when points change without a re-render.
function syncPlaceLabels() {
  if (!dom.stoneList) return;
  for (const meta of POSITION_META) {
    const row = formRows.find((r) => r.position === meta.position);
    if (!row) continue;
    const label = dom.stoneList.querySelector(`[data-aim-position="${meta.position}"] .stone-place-text small`);
    if (!label) continue;
    label.textContent = `${trimNumber(row.points)} pts`;
    label.classList.toggle("is-custom", row.points !== state.scoring[meta.position]);
  }
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function readFormRows() {
  return formRows.map((row) => ({
    position: row.position,
    player: row.player,
    points: row.points,
    team: row.team === "A" || row.team === "B" ? row.team : null,
  }));
}

function setFormMode(mode) {
  formMode = mode === "teams" ? "teams" : "solo";
  renderBoard();
  showToast(formMode === "teams" ? "Team game — assign each player to a team." : "Solo game.");
}

function syncTeamNames() {
  renderBoard();
}

function teamNames() {
  return {
    A: (dom.teamAName.value.trim() || "Team A").slice(0, 24),
    B: (dom.teamBName.value.trim() || "Team B").slice(0, 24),
  };
}

function handleGameSelectChange() {
  const addingNew = dom.gameSelect.value === "__new";
  dom.newGameInput.hidden = !addingNew;
  if (addingNew) dom.newGameInput.focus();
}

function resetAllPoints() {
  for (const row of formRows) row.points = state.scoring[row.position];
  renderBoard();
  showToast("Points reset to the current defaults.");
}

function handleGameSubmit(event) {
  event.preventDefault();
  clearFormMessage();

  const game = getSubmittedGameName();
  const date = dom.gameDate.value;
  const rows = readFormRows().filter((row) => row.player);

  if (!game) {
    setFormMessage("Choose a game or enter a new game name.", "error");
    return;
  }
  if (!isDateString(date)) {
    setFormMessage("Choose a valid date for the session.", "error");
    return;
  }
  if (!rows.length) {
    setFormMessage("Place at least one player on a stone before logging.", "error");
    return;
  }

  const names = teamNames();
  if (formMode === "teams") {
    const unassigned = rows.filter((row) => row.team !== "A" && row.team !== "B");
    if (unassigned.length) {
      setFormMessage(`Give every placed player a team — ${unassigned.length} still need ${names.A} or ${names.B}.`, "error");
      return;
    }
    if (names.A.toLowerCase() === names.B.toLowerCase()) {
      setFormMessage("Give the two teams different names.", "error");
      return;
    }
  }

  for (const row of rows) {
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
    setFormMessage(
      `${game} on ${formatDate(date)} is already logged — use Edit on that entry in the Chronicle to change it.`,
      "error"
    );
    return;
  }

  snapshotForUndo();

  const session = {
    id: editingSessionId || makeId(),
    date,
    game,
    mode: formMode,
    teams: formMode === "teams" ? names : { A: "Team A", B: "Team B" },
    notes: dom.notesInput.value.trim(),
    results: rows.map((row) => ({
      player: row.player,
      position: row.position,
      points: roundScore(row.points),
      team: formMode === "teams" ? row.team : null,
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
  dom.logButton.textContent = "Log Session";

  saveState();
  pushToRemote();
  renderDashboard();
  renderGameEmojiList();
  resetForm();
  setFormMessage(
    wasEditing ? `${game} updated successfully.` : `${game} logged successfully.`,
    "success"
  );
  showToast(wasEditing ? `${game} updated.` : `${game} added to the tracker.`, { undo: true });
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
  const sessionId = button.dataset.sessionId;
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  // Two taps to remove: the first arms, the second confirms. The arm expires.
  if (armedDeleteId !== sessionId) {
    window.clearTimeout(armedDeleteTimer);
    armedDeleteId = sessionId;
    renderHistory();
    showToast("Tap remove again to confirm — nothing is gone yet.");
    armedDeleteTimer = window.setTimeout(() => {
      armedDeleteId = null;
      renderHistory();
    }, 6000);
    return;
  }
  window.clearTimeout(armedDeleteTimer);
  armedDeleteId = null;
  if (editingSessionId === session.id) cancelEdit();
  snapshotForUndo();
  state.sessions = state.sessions.filter((item) => item.id !== session.id);
  saveState();
  pushToRemote();
  renderDashboard();
  resetForm();
  showToast("Session removed.", { undo: true });
}

function startEditing(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  editingSessionId = sessionId;
  dom.editBanner.hidden = false;
  dom.editBannerText.textContent = `Editing ${session.game} from ${formatDate(session.date)}`;
  dom.logButton.textContent = "Save Changes";

  populateGameSelect(session.game);
  dom.gameDate.value = session.date;
  dom.notesInput.value = session.notes || "";
  dom.newGameInput.hidden = true;
  dom.newGameInput.value = "";
  formMode = session.mode === "teams" ? "teams" : "solo";
  dom.teamAName.value = session.teams.A;
  dom.teamBName.value = session.teams.B;
  prefillBoard(session.results);
  renderBoard();
  clearFormMessage();

  switchTab("log");
  dom.gameSelect.focus();
  showToast("Loaded session into the form. Save to apply, or cancel.");
}

function cancelEdit() {
  editingSessionId = null;
  dom.editBanner.hidden = true;
  dom.editBannerText.textContent = "Editing a saved session";
  dom.logButton.textContent = "Log Session";
  clearFormMessage();
  resetForm();
}

function renderDataSettingsMessage(message, type = "success") {
  dom.settingsMessage.textContent = message;
  dom.settingsMessage.style.color = type === "error" ? "var(--danger)" : "var(--success)";
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
      dom.logButton.textContent = "Log Session";
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
  // Two taps as well — and the toast afterwards still offers an undo.
  if (!armedClearAll) {
    armedClearAll = true;
    dom.clearDataButton.classList.add("is-armed");
    dom.clearDataButton.textContent = "Tap again to clear everything";
    renderDataSettingsMessage("This removes every logged game. Tap again within 8 seconds to go through with it.", "error");
    window.clearTimeout(armedClearTimer);
    armedClearTimer = window.setTimeout(() => {
      armedClearAll = false;
      dom.clearDataButton.classList.remove("is-armed");
      dom.clearDataButton.textContent = "Clear All Games";
    }, 8000);
    return;
  }
  window.clearTimeout(armedClearTimer);
  armedClearAll = false;
  dom.clearDataButton.classList.remove("is-armed");
  dom.clearDataButton.textContent = "Clear All Games";
  snapshotForUndo();
  state = createEmptyState();
  editingSessionId = null;
  dom.editBanner.hidden = true;
  dom.logButton.textContent = "Log Session";
  saveState();
  pushToRemote();
  renderDashboard();
  renderScoringInputs();
  renderRoster();
  renderGameEmojiList();
  resetForm();
  renderDataSettingsMessage("All logged games cleared.");
  showToast("All logged games cleared.", { undo: true });
}

function resetScoring() {
  state.scoring = clone(DEFAULT_SCORING);
  saveState();
  renderScoringInputs();
  renderBoard();
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

function showToast(message, options) {
  const undoable = Boolean(options && options.undo);
  window.clearTimeout(toastTimer);
  // Write to the inner span — assigning textContent on the toast itself would
  // delete the Undo button along with the text.
  if (dom.toastText) dom.toastText.textContent = message;
  else dom.toast.textContent = message;
  if (dom.undoButton) dom.undoButton.hidden = !undoable;
  dom.toast.classList.toggle("has-undo", undoable);
  dom.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("visible"), undoable ? 6500 : 2800);
}

/* ═══════════════════════════════ SHARED BOARD (Supabase) ═══════════════════════════════
   Browsers can't talk to each other, so live sync needs one shared database.
   This adapter speaks to a free Supabase project (plain REST — no library needed):

     tower_meta     one row, id = 1: { players, scoring, gameEmoji, updated_at }
     tower_sessions one row per session: { id, date, game, mode, teams, notes, results, updated_at }

   Keys live in per-device localStorage (never in exports). Last writer wins per
   row by updated_at. When disconnected everything works exactly as before.
   ═══════════════════════════════════════════════════════════════════════════ */

const REMOTE_KEY = "tower-remote-v1";
let remote = null;
let remoteTimer = 0;
let pushTimer = 0;
let lastPullAt = 0;

function loadRemoteCreds() {
  try {
    const raw = window.localStorage.getItem(REMOTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.url && parsed.key) return parsed;
  } catch (error) {
    console.warn("Could not read remote credentials", error);
  }
  return null;
}

function initSync() {
  remote = loadRemoteCreds();
  if (dom.sbUrl && remote) dom.sbUrl.value = remote.url;
  if (dom.sbKey && remote) dom.sbKey.value = remote.key;
  if (remote) {
    setSyncMessage("Connected — pulling the shared board…");
    pullFromRemote(true);
    schedulePoll();
  } else {
    setSyncMessage("");
    updateSyncStatus();
  }
  window.addEventListener("online", () => {
    if (remote) pullFromRemote(true);
  });
}

function setSyncMessage(message, type) {
  if (!dom.syncMessage) return;
  dom.syncMessage.textContent = message;
  dom.syncMessage.style.color = type === "error" ? "var(--danger)" : "var(--success)";
}

function updateSyncStatus() {
  if (dom.syncStatus) {
    dom.syncStatus.textContent = remote
      ? "Five souls, one crown · shared live board"
      : "Five souls, one crown · saved in this browser";
  }
  if (dom.storageStatus) {
    dom.storageStatus.textContent = remote
      ? `Shared board live${lastPullAt ? ` · synced ${new Date(lastPullAt).toLocaleTimeString()}` : ""}`
      : "Saved locally in this browser";
  }
}

function sbHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function connectSync() {
  const url = dom.sbUrl.value.trim().replace(/\/+$/, "");
  const key = dom.sbKey.value.trim();
  if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
    setSyncMessage("That URL doesn't look like a Supabase project (https://xyz.supabase.co).", "error");
    return;
  }
  if (key.length < 20) {
    setSyncMessage("Paste the anon key from your Supabase dashboard.", "error");
    return;
  }
  remote = { url, key };
  try {
    window.localStorage.setItem(REMOTE_KEY, JSON.stringify(remote));
  } catch (error) {
    setSyncMessage("Could not save credentials in this browser.", "error");
    return;
  }
  setSyncMessage("Connected — pulling the shared board…");
  updateSyncStatus();
  pullFromRemote(true);
  schedulePoll();
}

function disconnectSync() {
  remote = null;
  window.clearTimeout(remoteTimer);
  window.clearTimeout(pushTimer);
  try {
    window.localStorage.removeItem(REMOTE_KEY);
  } catch (error) {
    console.warn("Could not clear remote credentials", error);
  }
  setSyncMessage("Disconnected — back to this browser only.");
  updateSyncStatus();
}

function schedulePoll() {
  window.clearTimeout(remoteTimer);
  if (!remote) return;
  remoteTimer = window.setTimeout(async () => {
    await pullFromRemote(false);
    schedulePoll();
  }, 15000);
}

/* Debounced: roster typing saves constantly, the network shouldn't. */
function pushToRemote() {
  if (!remote) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => pushNow(), 2000);
}

async function pushNow() {
  if (!remote) return;
  try {
    const stamp = new Date().toISOString();
    await fetch(`${remote.url}/rest/v1/tower_meta`, {
      method: "POST",
      headers: { ...sbHeaders(remote.key), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: 1,
        players: state.players,
        scoring: state.scoring,
        gameEmoji: state.gameEmoji,
        updated_at: stamp,
      }),
    });
    for (const session of state.sessions) {
      await fetch(`${remote.url}/rest/v1/tower_sessions`, {
        method: "POST",
        headers: { ...sbHeaders(remote.key), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ ...session, updated_at: stamp }),
      });
    }
    setSyncMessage(`Pushed ${state.sessions.length} sessions to the shared board.`);
  } catch (error) {
    console.warn("Push failed", error);
    setSyncMessage("Push failed — check your connection. Your games are still safe here.", "error");
  }
}

async function pushToRemoteNow() {
  window.clearTimeout(pushTimer);
  await pushNow();
}

async function pullFromRemote(announce) {
  if (!remote) return;
  try {
    const metaRes = await fetch(`${remote.url}/rest/v1/tower_meta?id=eq.1&select=*`, {
      headers: sbHeaders(remote.key),
    });
    const metaRows = await metaRes.json();
    const sessionsRes = await fetch(`${remote.url}/rest/v1/tower_sessions?select=*&order=date.asc`, {
      headers: sbHeaders(remote.key),
    });
    const sessionRows = await sessionsRes.json();
    if (!Array.isArray(sessionRows)) throw new Error("Unexpected response from the shared board.");

    const merged = normalizeState({
      players: metaRows && metaRows[0] ? metaRows[0].players : state.players,
      scoring: metaRows && metaRows[0] ? metaRows[0].scoring : state.scoring,
      gameEmoji: metaRows && metaRows[0] ? metaRows[0].gameEmoji : state.gameEmoji,
      sessions: sessionRows,
    });
    // Don't clobber an in-progress edit with a background pull.
    const localDraft = readFormDraft();
    state = merged;
    lastPullAt = Date.now();
    saveStateLocalOnly();
    renderDashboard();
    renderScoringInputs();
    renderRoster();
    renderGameEmojiList();
    resetForm(localDraft ? { draft: localDraft } : undefined);
    updateSyncStatus();
    if (announce) {
      setSyncMessage(`Shared board live — ${state.sessions.length} sessions.`);
      showToast("Shared board synced.");
    }
  } catch (error) {
    console.warn("Pull failed", error);
    if (announce) setSyncMessage("Could not reach the shared board — still showing this device.", "error");
  }
}

/* saveState() pushes; the pull path must write without pushing back. */
function saveStateLocalOnly() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save tracker data", error);
  }
}

/* ═══════════════════════════════ UNDO ═══════════════════════════════ */

function snapshotForUndo() {
  undoSnapshot = JSON.stringify({ sessions: state.sessions, players: state.players });
}

function performUndo() {
  if (!undoSnapshot) return;
  const restored = JSON.parse(undoSnapshot);
  undoSnapshot = null;
  state.sessions = restored.sessions;
  state.players = restored.players;
  cancelEdit();
  saveState();
  renderScoringInputs();
  renderRoster();
  renderGameEmojiList();
  renderDashboard();
  resetForm();
  showToast("Undone — the ledger is back as it was.");
}
