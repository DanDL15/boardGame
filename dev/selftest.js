/* ═══════════════════════════════════════════════════════════════════════════
   SELF-TEST — runs the real app.js against a minimal DOM and asserts behaviour.

   There is no build step and no test framework in this project, so this leans on
   macOS's built-in JavaScriptCore via `osascript`. Run it with:

       sh dev/run-selftest.sh

   It catches the class of bug that is invisible in a static site: a DOM lookup
   that returns null, a renamed id, or a board interaction that quietly does
   the wrong thing. It is deliberately strict about missing nodes.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════ TEST ═══════════════ */
var STORE = {};
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(STORE, k) ? STORE[k] : null; },
  setItem: function (k, v) { STORE[k] = String(v); },
  removeItem: function (k) { delete STORE[k]; },
};
globalThis.document = buildDocument(__IDS);
globalThis.window = {
  localStorage: globalThis.localStorage,
  crypto: { randomUUID: function () { return "id-" + (globalThis.__n = (globalThis.__n || 0) + 1); } },
  setTimeout: function () { return 0; },
  clearTimeout: function () {},
  confirm: function () { return true; },
  CSS: { escape: function (v) { return String(v).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); } },
  addEventListener: function () {},
  removeEventListener: function () {},
  scrollTo: function () {},
};
globalThis.window.localStorage = globalThis.localStorage;
globalThis.console = globalThis.console || { warn: function () {}, log: function () {} };
globalThis.Blob = function () {};
globalThis.URL = { createObjectURL: function () { return "blob:x"; }, revokeObjectURL: function () {} };

var FATAL = null;
try {
  /* init() runs on DOMContentLoaded; call it directly to surface errors. */
  init();
  __out("PASS init() completed without throwing");
} catch (e) {
  FATAL = (e && e.message) ? e.message : String(e);
  __out("FAIL init() threw: " + FATAL);
  if (e && e.stack) __out(String(e.stack).split("\n").slice(0, 4).join("\n"));
}

function assert(cond, label) {
  __out((cond ? "PASS " : "FAIL ") + label);
}

if (!FATAL) {
  var lb = document.querySelector("#leaderboardRows");
  var podium = document.querySelector("#podium");
  var hist = document.querySelector("#historyList");
  assert(podium.children.length > 0, "podium rendered (children=" + podium.children.length + ")");
  assert(lb.children.length > 0, "leaderboard roll rendered (children=" + lb.children.length + ")");
  assert(hist.children.length > 0, "chronicle rendered (children=" + hist.children.length + ")");
  assert(document.querySelector("#playerPool").children.length === 5,
    "roster pool has 5 chips (got " + document.querySelector("#playerPool").children.length + ")");
  assert(document.querySelector("#stoneList").children.length === 5,
    "5 stones rendered (got " + document.querySelector("#stoneList").children.length + ")");

  /* ── exercise the logging flow end to end ── */
  document.querySelector("#gameSelect").value = "Monopoly Duel";
  document.querySelector("#gameDate").value = "2025-10-01";

  var chips = document.querySelector("#playerPool").children.filter(function (c) { return c.dataset.placePlayer; });
  __out("INFO placeable chips at start: " + chips.length);
  for (var ci = 0; ci < chips.length; ci++) { placePlayer(chips[ci].dataset.placePlayer); }

  var rows = readFormRows().filter(function (r) { return r.player; });
  assert(rows.length === 5, "all 5 players placed via chips (got " + rows.length + ")");
  __out("INFO placed order: " + rows.map(function (r) { return r.position + ":" + r.player; }).join(", "));

  var sessionsBefore = state.sessions.length;
  handleGameSubmit({ preventDefault: function () {} });
  assert(state.sessions.length === sessionsBefore + 1, "session logged (sessions=" + state.sessions.length + ")");
  assert(localStorage.getItem(STORAGE_KEY) !== null, "state persisted to localStorage");

  var standings = calculateStandings();
  __out("INFO standings: " + standings.map(function (s) { return s.name + "=" + s.points + "/" + s.plays + "p"; }).join(", "));
  assert(standings.length === 5, "standings computed for 5 players");

  /* validation: no players placed */
  for (var fi = 0; fi < formRows.length; fi++) { formRows[fi].player = ""; }
  document.querySelector("#formMessage").textContent = "";
  handleGameSubmit({ preventDefault: function () {} });
  assert(/at least one player/i.test(document.querySelector("#formMessage").textContent),
    "validation blocks empty board: '" + document.querySelector("#formMessage").textContent + "'");

  /* validation: duplicate session */
  for (var fi2 = 0; fi2 < formRows.length; fi2++) { formRows[fi2].player = state.players[fi2].name; formRows[fi2].points = 5; }
  document.querySelector("#formMessage").textContent = "";
  document.querySelector("#gameSelect").value = "Monopoly Duel";
  document.querySelector("#gameDate").value = "2025-10-01";
  handleGameSubmit({ preventDefault: function () {} });
  assert(/already logged/i.test(document.querySelector("#formMessage").textContent),
    "validation blocks duplicate same-day session: '" + document.querySelector("#formMessage").textContent + "'");

  /* import / export round trip through normalizeState */
  var snap = JSON.stringify(state);
  var round = normalizeState(JSON.parse(snap));
  assert(round.sessions.length === state.sessions.length, "export/import round trip preserves sessions");

  /* rename must cascade through history */
  var targetName = state.players[0].name;
  var expected = 0;
  for (var si = 0; si < state.sessions.length; si++) {
    for (var ri = 0; ri < state.sessions[si].results.length; ri++) {
      if (state.sessions[si].results[ri].player === targetName) expected++;
    }
  }
  renamePlayerEverywhere(targetName, "Zaphod", 0);
  var actual = 0;
  for (var si2 = 0; si2 < state.sessions.length; si2++) {
    for (var ri2 = 0; ri2 < state.sessions[si2].results.length; ri2++) {
      if (state.sessions[si2].results[ri2].player === "Zaphod") actual++;
    }
  }
  assert(expected > 0 && expected === actual,
    "rename cascades to every session (expected " + expected + ", got " + actual + ")");

  /* ═════ THE REWORKED BOARD ═════ */
  function rowAt(pos) {
    for (var i = 0; i < formRows.length; i++) { if (formRows[i].position === pos) return formRows[i]; }
    return null;
  }
  function placedCount() {
    var n = 0;
    for (var i = 0; i < formRows.length; i++) { if (formRows[i].player) n++; }
    return n;
  }

  resetForm();
  assert(placedCount() === 0,
    "board starts EMPTY, not pre-filled with the last game (placed " + placedCount() + ")");

  fillEveryonePlayed();
  assert(placedCount() === 5, "'everyone played' fills all five stones (got " + placedCount() + ")");

  clearBoard();
  var thirdPlayer = state.players[2].name;
  aimAt(3);
  assert(aimedPosition === 3, "aimAt(3) arms the third stone");
  placePlayer(thirdPlayer);
  var landed = 0, landedAt = 0;
  for (var li = 0; li < formRows.length; li++) {
    if (formRows[li].player === thirdPlayer) { landed++; landedAt = formRows[li].position; }
  }
  assert(landed === 1 && landedAt === 3,
    "an aimed player lands in exactly the aimed place (landed at " + landedAt + ")");

  fillEveryonePlayed();
  var firstBefore = rowAt(1).player, thirdBefore = rowAt(3).player;
  swapPositions(1, 3);
  assert(rowAt(1).player === thirdBefore && rowAt(3).player === firstBefore,
    "swapPositions(1,3) exchanges the two players");

  var pointsOfFirst = rowAt(1).points;
  swapPositions(1, 3);
  assert(rowAt(1).points === pointsOfFirst, "a swap keeps the place's own points value");

  var seen = {}, dupes = 0;
  for (var bi = 0; bi < formRows.length; bi++) {
    var nm = formRows[bi].player;
    if (!nm) continue;
    if (seen[nm]) dupes++;
    seen[nm] = 1;
  }
  assert(dupes === 0, "no player ever occupies two stones (dupes " + dupes + ")");

  clearBoard();
  assert(placedCount() === 0, "'clear' empties the board");

  repeatLastGame();
  var lastSess = state.sessions[state.sessions.length - 1];
  var matches = 0;
  for (var rj = 0; rj < lastSess.results.length; rj++) {
    if (rowAt(lastSess.results[rj].position).player === lastSess.results[rj].player) matches++;
  }
  assert(matches === lastSess.results.length,
    "'repeat last' copies the previous order (" + matches + "/" + lastSess.results.length + ")");

  clearBoard();
  var mover = state.players[0].name;
  placePlayer(mover);
  aimAt(2);
  placePlayer(mover);
  var moverCount = 0;
  for (var mi = 0; mi < formRows.length; mi++) { if (formRows[mi].player === mover) moverCount++; }
  assert(moverCount === 1, "re-placing a player moves them instead of duplicating (count " + moverCount + ")");

  clearBoard();
  rowAt(2).points = 0;
  syncPlaceLabels();
  var badge = document.querySelector("#stoneList").querySelector("[data-aim-position=\"2\"] .stone-place-text small");
  assert(badge && badge.textContent === "0 pts",
    "the badge shows the row's REAL points, not the default (got '" + (badge ? badge.textContent : "none") + "')");

  var statTiles = document.querySelector("#ledgerStats").children;
  assert(statTiles.length === 4, "stat row renders 4 tiles (got " + statTiles.length + ")");

  var podiumText = document.querySelector("#podium").__text();
  var rollText = document.querySelector("#leaderboardRows").__text();
  var overlap = 0;
  for (var pi = 0; pi < state.players.length; pi++) {
    var who = state.players[pi].name;
    if (podiumText.indexOf(who) !== -1 && rollText.indexOf(who) !== -1) overlap++;
  }
  assert(overlap === 0, "no player appears in both the podium and the roll (overlap " + overlap + ")");

  var sessionsBeforeUndo = state.sessions.length;
  snapshotForUndo();
  state.sessions.push({ id: "temp-x", date: "2025-11-11", game: "Temp", notes: "",
    results: [{ player: state.players[0].name, position: 1, points: 5 }] });
  performUndo();
  assert(state.sessions.length === sessionsBeforeUndo,
    "undo restores the previous session count (" + sessionsBeforeUndo + ")");

  /* exercise the real delegated click handlers, not just the helpers */
  clearBoard();
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-aim-position=\"4\"]") });
  assert(aimedPosition === 4, "clicking a place badge aims there via the delegated handler");
  var clickTarget = state.players[1].name;
  handlePoolClick({ target: document.querySelector("#playerPool").querySelector("[data-place-player=\"" + clickTarget + "\"]") });
  assert(rowAt(4).player === clickTarget, "clicking a pool chip fills the aimed place (got " + rowAt(4).player + ")");

  fillEveryonePlayed();
  var occupantBtn = document.querySelector("#stoneList").querySelector("[data-remove-position=\"2\"]");
  var removedName = rowAt(2).player;
  handleStoneClick({ target: occupantBtn });
  assert(rowAt(2).player === "" && placedCount() === 4, "clicking an occupant sends that player back to the pool");

  var stepBtn = document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"1\"]");
  var beforeStep = rowAt(2).points;
  handleStoneClick({ target: stepBtn });
  assert(rowAt(2).points === beforeStep + 1, "the + stepper adds a point (" + beforeStep + " -> " + rowAt(2).points + ")");

  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  handleStoneClick({ target: document.querySelector("#stoneList").querySelector("[data-step=\"2\"][data-delta=\"-1\"]") });
  assert(rowAt(2).points === 0, "the \u2212 stepper floors at zero, never negative (got " + rowAt(2).points + ")");

  var badge2 = document.querySelector("#stoneList").querySelector("[data-aim-position=\"2\"] .stone-place-text small");
  assert(badge2 && badge2.textContent === "0 pts",
    "stepper keeps the badge label honest (got '" + (badge2 ? badge2.textContent : "none") + "')");

  /* keyboard aiming */
  var keydown = document.querySelector("#gameForm")._listeners.keydown[0];
  function pressKey(key, tagName, type) {
    keydown({ key: key, target: { tagName: tagName || "BUTTON", type: type || "button" }, metaKey: false, ctrlKey: false, altKey: false });
  }
  clearBoard();
  pressKey("2");
  assert(aimedPosition === 2, "pressing 2 aims at second place");
  pressKey("2");
  assert(aimedPosition === null, "pressing the same digit again stands down");
  pressKey("4");
  assert(aimedPosition === 4, "pressing 4 aims at fourth place");
  pressKey("Escape");
  assert(aimedPosition === null, "Escape stands down");
  pressKey("9");
  assert(aimedPosition === null, "an out-of-range digit is ignored");
  pressKey("Enter");
  assert(aimedPosition === null, "a non-digit key is ignored");
  pressKey("3", "INPUT", "number");
  assert(aimedPosition === null, "typing a digit in the points box does not hijack aim");
  pressKey("3", "TEXTAREA", "textarea");
  assert(aimedPosition === null, "typing in the notes box does not hijack aim");

  /* ═════ EDIT / IMPORT / CLEAR ═════ */
  var target = state.sessions[state.sessions.length - 1];
  var originalCount = state.sessions.length;
  startEditing(target.id);
  assert(editingSessionId === target.id, "startEditing arms the edit state");
  assert(document.querySelector("#editBanner").hidden === false, "the edit banner is revealed");
  var loaded = 0;
  for (var ei = 0; ei < formRows.length; ei++) { if (formRows[ei].player) loaded++; }
  assert(loaded === target.results.length,
    "editing pre-loads the saved order (" + loaded + "/" + target.results.length + ")");
  document.querySelector("#notesInput").value = "edited by the test";
  handleGameSubmit({ preventDefault: function () {} });
  assert(editingSessionId === null, "saving clears the edit state");
  assert(state.sessions.length === originalCount, "editing replaces rather than duplicates (" + originalCount + ")");
  assert(document.querySelector("#editBanner").hidden === true, "the edit banner hides again after saving");

  cancelEdit();
  assert(editingSessionId === null, "cancelEdit stands down cleanly");

  var importTarget = { sessions: state.sessions, players: state.players, scoring: { 1: 9, 2: 4, 3: 1, 4: 0, 5: 0 } };
  var normalizedImport = normalizeState(importTarget);
  assert(normalizedImport.scoring[1] === 9, "imported scoring is honoured");
  state = normalizedImport;
  renderDashboard();
  assert(document.querySelector("#podium").children.length > 0, "renders after a scoring-changing import");

  var beforeClear = state.sessions.length;
  state.sessions = [];
  renderDashboard();
  assert(document.querySelector("#podium").children.length === 1, "empty ledger shows a single empty state");
  assert(document.querySelector("#rollBlock").hidden === true, "the roll hides when there is nobody left to list");
  assert(document.querySelector("#ledgerStats").children.length === 4, "stat row still renders when empty");
  state = normalizeState(importTarget);
  renderDashboard();

  var toastsIntact = document.querySelector("#undoButton") !== null;
  assert(toastsIntact, "undo button survives being written to (toast structure intact)");
}
__log.join("\n")
