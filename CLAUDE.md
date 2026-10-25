# Kitchen League

A head-to-head household game for two players, shown on an iPad in the kitchen. The repo is public, so it holds no personal names, keys or sheet addresses; each household's names, targets and chores live in its own Google Sheet. Each player scores points for chores, water and protein. The app tracks daily, weekly and monthly winners, awards trophies, and shows cartoon faces that react to the scores.

## Files
- `index.html`: the whole app in one file (vanilla JS, no build step). It is meant for an iPad home screen, served over HTTPS (GitHub Pages).
- `Code.gs`: the Google Apps Script backend. It lives inside a Google Sheet (Extensions > Apps Script) and is deployed as a web app.
- `sw.js`: offline shell. Network first for same-origin files, cache first for fonts and the QR library, never touches the Sheet.
- `icon.svg`, `icon-180.png`: favicon and Home Screen icon. There is deliberately no web manifest: iPadOS would use its `start_url` and drop the pairing link when the page is added to the Home Screen.
- `tests/backend.test.mjs`: runs `Code.gs` in Node against fake Apps Script services. Run `node --test` after any change to `Code.gs` or the shared block.
- `README.md`: setup guide for the Sheet, hosting and the iPad.

## How it works
- **Scoring:** chores carry fixed points, and whoever claims a chore first gets them. Water and protein are each worth up to 15 points, scaled to that player's own target, plus a 5-point bonus for hitting it. Treats cost points: `add` ops with `k:'sweet'` or `k:'fried'` and `amt` = the penalty (config `treat`, default 5, 0 hides the buttons), so `day[p].sweet`/`fried` hold penalty points, `scoreOf` subtracts them (`neg`), Undo pops them like water, and a day's total can go below zero. The highest daily total wins the day. Weeks start on Monday.
- **Data:** day documents are keyed `YYYY-MM-DD`, shaped `{a:{water,protein,sweet,fried,log,tw,tp}, b:{...}, chores:{id:{by,pts,name}}, seen:[opIds]}`. A chore marked `multi` in config (Settings: Repeats) can be done many times a day: each go is its own claim keyed `<choreId>~<unique>`, so `applyOp`, `scoreOf` and the backend treat it like any claim and need no change. Taps add a go, press and hold removes the player's latest. Player `a` is blue and player `b` is orange. Their names come from Settings (default Blue and Orange) and sync through the Sheet's config.
- **Sync:** the client sends ops (`add`, `undo`, `claim`, `clear`, `import`) and the server applies them under a lock. Applied ops are deduplicated by id through `seen`. Clients poll `GET ?key=&since=` every 30 seconds, asking for a minute of overlap. The server reads its clock before reading rows, so a save that lands mid-read comes back on the next poll.
- **Key:** stored in Script Properties, made by the Sheet menu Kitchen League > Set up (`setup()`), so pasting a new `Code.gs` never resets it. The `KEY` constant is only a fallback.
- **Pairing link:** `index.html#sync=<exec url>&key=<key>`. Opening it connects the device. The hash never reaches the web host. Settings shows it as a QR code (qrcode-generator from cdnjs, pinned with SRI) plus Copy and Share buttons. The address box also accepts a pasted pairing link. Home Screen apps have storage separate from Safari, so in an iOS Safari tab the link is left in the address bar for Add to Home Screen to carry over; a Home Screen launch that finds a link the user disconnected from (`kl.unpaired`) ignores it.
- **Shared code:** the logic between `/* SHARED START */` and `/* SHARED END */` in `index.html` (`blankDay`, `normDay`, `dayActive`, `applyOp`, `scoreOf`) must stay identical to the copy in `Code.gs`. The tests check this.
- **Storage modes:** the app uses the Google Sheet when one is configured in Settings. Otherwise it saves to `localStorage`. Inside a claude.ai artifact it uses the artifact's db instead.
- **Trophies:** `TRACKS` in `index.html`, 11 trophies with bronze, silver and gold tiers. They are derived from day history on every render (`trophyStats`), never stored, so they need no schema change and agree across devices. Tracks with `max:true` measure a personal best rather than a total. Wins only count finished days, as in the League tab. Each device remembers which tiers it has celebrated in `kl.ach`. After a bulk load (first run, connecting a sheet, the first db snapshot) or more than 4 at once, new tiers are recorded quietly. Unlocks while the screen sleeps are queued and celebrated on wake.
- **Timeline:** `dayEvents` rebuilds one day from the water/protein `log` entries and the chore claims (both carry a time `t`), sorts them, and replays them through `scoreOf` to get each entry's points, target hits, lead changes and the running score. Undo, take-one-off and steals delete or overwrite entries, so it shows only what still counts.
- **Motion wake:** the front camera is sampled every 400ms and frames are compared. The screen goes dark after the idle timeout. This needs camera permission and HTTPS.
- **Avatars:** inline SVG. Score moods: yawn (0 points before 10am), cry (0 points), sad (under 15), meh (under 35), happy (under 60), laugh (60 and up). Reactions: `pop` when a player scores, `smug` (sunglasses) for the player who steals a chore and `shock` for the one robbed, `party` (party hat, confetti) on a trophy unlock, `guilty` (worried brows, wobbly mouth, blush) when a treat is logged. League and Trophies boards also use champ, lead, chase and rematch, and the sleep screen uses sleep.

## Style
- Copy avoids em-dashes.
- Theme colours are CSS tokens, with light and dark variants (medals: `--bronze`, `--silver`, `--gold`).
- Code style is dense ES5 (`var`, `function`, string-built HTML) to match the existing file.

## Next ideas
- Weekly recap on Monday morning (last week's winner, trophies earned).
- Custom player avatars or a third player.
