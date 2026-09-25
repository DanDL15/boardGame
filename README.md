# 🏰 The Tower

A board game scoreboard for one household of five. Log a session, settle the finishing order,
and keep the eternal ledger.

**[Live site →](https://dan-dl15.github.io/boardGame/)** · Runs entirely in your browser ·
No accounts, no server, no build step, no cost.

The flat is called The Tower, so the flat's scoreboard is a tower: ivy stone, storm
slate, and Stirling green beacons — Heritage `#006938`, Energy `#76b72a`. The leader
sits at the top of the tower, and everything you log is carved into the chronicle.

---

## ✨ How it works

The page is split into tabs, each with one job:

| Tab | What it's for |
| --- | --- |
| **Tower** | The scoreboard. Four carved tablets, the top three on the tower, everyone else ranked below, plus team honours when team games exist. |
| **Log** | The board — five stones, one per finishing place. Solo or teams. |
| **Chronicle** | Every session, newest first, searchable and filterable. Two taps to remove — nothing vanishes by accident. |
| **Stats** | Best single game per title, win streaks and form, head-to-head matrix, points over time, standings by game. |
| **Vault** | Players, game icons, default scoring, shared-board connection, and your JSON backup. |

## 🎯 Logging a session

The board is the part that matters, so it has three tap targets and nothing hidden:

- **Tap a player** in *The Household* → they take the next open place.
- **Tap a place** (the `1st` / `2nd` badge) → you are now *aiming* there, and the next player you
  tap lands in that exact place. Tap a second place to **swap** the two.
- **Tap a player already on a stone** → they go back to the pool.
- **Points** are editable per place, with `−` / `+` steppers that never go below zero. A place whose
  points differ from the house default is marked ✦, so a tweak is never silently lost.

Three shortcuts sit above the board:

| Button | What it does |
| --- | --- |
| **Everyone played** | Fills all five places in household order — then swap whoever finished differently. |
| **Repeat last** | Copies the previous session's game and finishing order. Opt-in, never automatic. |
| **Clear** | Sends everyone back to the pool. |

Keyboard: <kbd>1</kbd>–<kbd>5</kbd> aim at a place, <kbd>Esc</kbd> stands down. Typing in any text
box is left alone.

## 👥 Team games

Flip the **Teams** switch on the Log tab, name both sides, and each filled stone grows an
A/B switch. Points still belong to places; honours are counted per player *and* per team,
and the Tower tab grows a Team Honours table once a team game exists.

## 🛡️ Deleting is deliberately hard

Removing a session takes **two taps** — the first arms the button ("Tap again to confirm"),
the second does it, and the arm expires after 6 seconds. Clearing everything takes two taps
plus an 8-second window. Every destructive action offers **Undo** in the confirmation toast.

The board **starts empty** on purpose. It used to arrive pre-filled with the previous game's exact
result, which looked like a finished entry and made duplicate logging almost unavoidable.

Logging or removing a session offers a real **Undo** in the confirmation toast.

## ✨ Features

- **Leaderboard first** — the Tower is the default tab, not buried at the bottom.
- **Tabs, not one long scroll** — Tower / Log / Chronicle / Stats / Vault, deep-linkable via `#/…`.
- **Team games** — A/B sides with per-team honours.
- **Two-tap delete** — armed confirms, expiring arms, real undo.
- **Stats that settle arguments** — best single game per title, streaks, head-to-head, form, points-over-time.
- **Four stat tablets** — sessions, distinct games, points awarded, and the reigning champion.
- **Aim and swap** — put anyone in any place, and fix the order by swapping two stones.
- **One-tap logging** — "everyone played" for the usual case.
- **Edit anything later** — every session reopens in the board and saves in place.
- **Your own players** — edit the five names, icons, and colours. Renaming a player updates their
  whole history, not just the roster.
- **Per-game icons** — give each game an emoji so it reads instantly everywhere it appears.
- **Configurable scoring** — change the default points for each position; existing results keep
  the points they were logged with.
- **Real undo** — for logging, editing, and removing.
- **JSON backup and restore** — export everything, import it anywhere.
- **Cross-tab sync** — open the site in two tabs and they stay in step.

## 🗄️ Where your data lives

Out of the box everything is stored in your browser's `localStorage`:

- ✅ Fast, private, and free to host
- ✅ Works offline once loaded
- ⚠️ **Each browser and device keeps its own copy** — your laptop doesn't see your phone
- ⚠️ Clearing site data removes your games

**Use _Export_ before switching devices or clearing your browser.** Use _Import_ to restore a
backup.

## ☁️ One shared live board (2-minute setup)

Browsers can't talk to each other, so instant phone ↔ laptop sync needs one shared home for
the scores. That home is this repo itself — `data/board.json` — read and written through the
GitHub API. No new accounts, no new services, no server code:

1. Create a **fine-grained personal access token**:
   - GitHub → your avatar → **Settings → Developer settings → Personal access tokens →
     Fine-grained tokens → Generate new token**.
   - Name it `tower-board`, expiry whatever you like, **Repository access → Only select
     repositories → `DanDL15/boardGame`**.
   - Under **Permissions → Repository permissions**, set **Contents → Read and write**.
     Nothing else. Generate and copy it (it starts `github_pat_…`).
2. On your laptop, open the Tower → **Vault → Shared Board**, paste the token, check the repo
   reads `DanDL15/boardGame`, tap **Connect**, then **Push this device ↑** once. This creates
   `data/board.json` from the history you already have.
3. On your phone (and every other device), open the Tower → **Vault → Shared Board**, paste
   the **same token**, tap **Connect**. The shared board pulls in within seconds.

After that every log, edit, or remove pushes within ~2 seconds and every device pulls every
15 seconds — and pushes merge by session, so two flatmates logging at once don't wipe each
other out. The token stays on each device and is never included in exports. Tokens are
revocable any time under Developer settings.

> The repo is public, so `data/board.json` is readable by anyone with the link — it's game
> scores, but go in with eyes open. If that bothers you, make the repo private (Pages still
> works) and the file is only writable with the token.

## 🚀 Run it locally

No build step, no dependencies, no `npm install`. Any static server works:

```bash
git clone https://github.com/DanDL15/boardGame.git
cd boardGame
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## 🧪 Run the self-test

There is no test framework in this project, so the checks lean on the JavaScriptCore already
built into macOS. The suite runs the **real** `app.js` against a minimal DOM and asserts behaviour:

```bash
sh dev/run-selftest.sh
```

It prints one `PASS`/`FAIL` line per assertion and is the fastest way to catch a null DOM lookup, a
renamed `id`, or a board interaction that quietly does the wrong thing. It needs `app.js` and
`index.html` to agree with each other, which is exactly the coupling that breaks silently in a
static site.

## ☁️ Deploy your own copy

The site is fully static, so GitHub Pages hosts it for free.

1. Create a repository on GitHub.
2. Upload `index.html`, `styles.css`, `app.js`, and `404.html` to the repo root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`.
5. Save. GitHub publishes the site within a minute at
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

`.nojekyll` stops Jekyll from interfering with the build, and `404.html` redirects mistyped URLs
back to the dashboard.

## ✏️ Customise it

Everything is driven by four constants at the top of `app.js`:

| Constant | Controls |
| --- | --- |
| `DEFAULT_PLAYERS` | The five names, emojis, and colours |
| `DEFAULT_SCORING` | Starting points for 1st–5th place |
| `DEFAULT_GAME_EMOJI` | Icons for the pre-loaded games |
| `DEMO_SESSIONS` | The example history shown on first visit |

Colours, spacing, and the whole torch-lit palette live in the `:root` block at the top of
`styles.css`.

> Changing `DEFAULT_PLAYERS` only affects a **fresh** browser — existing data keeps the roster it
> already has. To change a live roster, use the in-app **The Vault** panel instead.

## 🧱 Project layout

| File | Role |
| --- | --- |
| `index.html` | The single page — five tabs |
| `styles.css` | The Tower theme, design tokens, responsive layout |
| `app.js` | State, rendering, validation, teams, stats, GitHub sync, import/export |
| `assets/tower-bg.jpg` | The tower painting, compressed for phones |
| `404.html` | Redirects stray URLs to the dashboard |
| `dev/dom-stub.js` | Minimal DOM used by the self-test |
| `dev/selftest.js` | The assertions |
| `dev/run-selftest.sh` | Assembles and runs them on JavaScriptCore |

No framework, no bundler, no lockfile. The same three site files work when edited by hand in
GitHub or cloned and developed locally.

## ♿ Accessibility

Keyboard navigable throughout (including the board, via <kbd>1</kbd>–<kbd>5</kbd>), visible focus
states, `aria-pressed` on the aim targets, ARIA labels on every control, live regions for status
messages, and a layout that stays usable down to 320px wide. `prefers-reduced-motion` is honoured.

## 📄 Licence

Use it, fork it, make it yours.
