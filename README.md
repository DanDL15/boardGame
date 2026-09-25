# 🎲 Board Game Tracker

A friendly, local-first scoreboard for tracking board game sessions — points, finishing
positions, and the bragging rights that follow.

Log a game, settle the order, and let the scoreboard do the arguing.

**[Live site →](https://dan-dl15.github.io/boardGame/)** · Runs entirely in your browser ·
No accounts, no server, no cost.

---

## ✨ Features

- **Log a game** — pick a game, set the date, assign each of the five positions a player and points.
- **Edit anything later** — every logged session can be reopened and corrected without deleting it.
- **Your own players** — edit the five names, icons, and colours. Renaming a player updates their
  whole history, not just the roster.
- **Per-game icons** — give each game an emoji so it reads instantly everywhere it appears.
- **Live leaderboard** — total points, wins, seconds, thirds, and points-per-play, with a
  podium for the top three.
- **Per-game standings** — who actually dominates each individual game.
- **Session history** — every game newest-first, with notes and one-click removal.
- **Configurable scoring** — change the default points for each position; existing results keep
  the points they were logged with.
- **JSON backup and restore** — export everything, import it anywhere.
- **Cross-tab sync** — open the site in two tabs and they stay in step.

## 🗄️ Where your data lives

Everything is stored in your browser's `localStorage`. There is no account and no server, so:

- ✅ Fast, private, and free to host
- ✅ Works offline once loaded
- ⚠️ **Each browser and device keeps its own copy** — the leaderboard is not shared between people
- ⚠️ Clearing site data removes your games

**Use _Export data_ before switching devices or clearing your browser.** Use _Import data_ to
restore a backup.

If you need one genuinely shared live scoreboard, that requires a hosted database and accounts —
GitHub Pages only serves static files.

## 🚀 Run it locally

No build step, no dependencies, no `npm install`. Any static server works:

```bash
git clone https://github.com/DanDL15/boardGame.git
cd boardGame
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

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

Colours and spacing live in the `:root` block at the top of `styles.css`.

> Changing `DEFAULT_PLAYERS` only affects a **fresh** browser — existing data keeps the roster it
> already has. To change a live roster, use the in-app **Data & settings** panel instead.

## 🧱 Project layout

| File | Role |
| --- | --- |
| `index.html` | The single page |
| `styles.css` | Dark theme, design tokens, responsive layout |
| `app.js` | State, rendering, validation, import/export |
| `404.html` | Redirects stray URLs to the dashboard |

No framework, no bundler, no lockfile. The same three files work when edited by hand in GitHub or
cloned and developed locally.

## ♿ Accessibility

Keyboard navigable throughout, visible focus states, ARIA labels on every control, live regions
for status messages, and a layout that stays usable down to 320px wide.

## 📄 Licence

Use it, fork it, make it yours.
