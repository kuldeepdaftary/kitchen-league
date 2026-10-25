# Kitchen League

A head-to-head household game for the kitchen iPad. Two players score points for chores, water and protein, and the cartoon faces react to every tap. The Today tab is the daily match, League keeps the monthly table, Trophies is the cabinet of bronze, silver and gold awards, and Timeline shows each day's entries in order with the running score.

Scores are kept in a Google Sheet in your Drive, so every device shows the same game. The app is one HTML file with no build step.

Getting it onto the iPad takes three one-off steps: put the app online, connect the Google Sheet, then add it to the iPad's Home Screen.

---

## 1. Put the app online

The iPad needs the app on an `https://` address. Without that it can't be added to the Home Screen, and the camera (motion wake) won't work. GitHub Pages is free: fork this repo (or push your copy), then in the repo go to **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. A minute later it's live at `https://<your-username>.github.io/kitchen-league/`.

Any static host works the same way (Cloudflare Pages, Netlify, Vercel), as long as it serves over HTTPS.

## 2. Connect your Google Sheet (about 5 minutes)

1. Make a new sheet at [sheets.new](https://sheets.new) and call it **Kitchen League**.
2. In the sheet choose **Extensions > Apps Script**. Delete the starter code, paste the whole of [Code.gs](Code.gs), and save (Cmd+S).
3. Go back to the sheet and reload the page. A **Kitchen League** menu appears. Choose **Kitchen League > Set up**.
   - Google asks for permission. Choose your account, then **Advanced > Go to Kitchen League (unsafe) > Allow**. The warning appears for any personal script that Google hasn't reviewed. This one only reads and writes this one sheet.
   - If nothing shows up after you allow it, choose **Set up** again. A box shows your **key**.
4. Back in Apps Script choose **Deploy > New deployment**. Click the gear, pick **Web app**, set **Execute as: Me** and **Who has access: Anyone**, then **Deploy**. Copy the **Web app URL** (it ends in `/exec`).
5. Open the app on your Mac, then go to **Settings > Google Drive sync**. Paste the URL and the key and press **Connect**. Any scores already on that device are copied into the sheet.
6. Still in Settings, set the two players' names (they start as Blue and Orange), daily targets and chores, then **Save**. Pick how many points a treat costs (5 by default, or Nothing to hide the treat buttons). A day with no treats gives that player a head start the next morning: +3, rising to +5 after 3 clean days in a row, +10 after 7, +15 after 14 and +20 after 30. The app adds it to the score, so the sheet's own points columns don't include it. Tick **Repeats** on chores that happen several times a day, like pumping or sterilising bottles: each tap then scores again, and press and hold takes one off. They are stored in the sheet, so every device picks them up.

"Anyone" means the app can reach the sheet without a Google sign-in. Nobody can read or change scores without the key.

The **Days** tab in the sheet gets one readable row per day (points, water, protein, chores, winner), so you can chart it. Don't edit the **Data** column by hand.

## 3. Set up the iPad

1. **Open it.** On the Mac, open **Settings** in Kitchen League. Point the iPad's camera at the pairing code and tap the link. Safari opens the app already connected. (Or just type the app's address into Safari on the iPad.)
2. **Add it to the Home Screen.** In Safari tap **Share > Add to Home Screen > Add**. On iPadOS 26, make sure **Open as Web App** is on.
3. **Open it from the Home Screen** and check the top bar says **Synced to Drive**. If it doesn't: on the Mac, press **Copy pairing link**, then on the iPad open **Settings** and paste the link into the address box. With the same Apple ID, Universal Clipboard lets you copy on one device and paste on the other. Home Screen apps keep their own storage, separate from Safari, which is why this step is sometimes needed.
4. **Motion wake.** Tap **Motion wake off** in the top bar and allow the camera. The screen then goes dark after the idle time and lights up when someone walks in. If it stops asking for the camera, check **Settings > Apps > Safari > Camera** (on older iPadOS: **Settings > Safari > Camera**) is set to **Allow**.
5. **Keep it awake.** Set **Settings > Display & Brightness > Auto-Lock** to **Never** and leave the iPad on charge. The app handles its own sleep screen.
6. **Optional: lock it to the app** with **Settings > Accessibility > Guided Access**. Triple-click the top button to start or stop it.

Phones join the same way: scan the code or send them the pairing link. The link contains your key, so only share it with the household.

---

## What's public and what's private

The code and the hosted page are public. They hold no scores, names or keys, and anyone who opens the page gets an empty game that saves only to their own browser.

Your household's game is private:
- **Scores, names, targets and chores** live in your Google Sheet, in your Drive.
- **The web app address and the key** are only stored on your own devices. Every request to the sheet must carry the key.
- **The pairing link** carries the key after a `#`, which browsers never send to the web host. Only share it with the household. If it leaks, **Kitchen League > Make a new key** in the sheet locks out every device until you reconnect them.
- The page asks search engines not to index it.

## Updating

- **The app:** edit `index.html` and push. GitHub Pages republishes in about a minute. The iPad loads the new version the next time the app opens, or straight away if you close and reopen it from the app switcher.
- **The backend:** paste the new `Code.gs` into Apps Script and save. Then choose **Deploy > Manage deployments**, click the pencil, set **Version: New version**, and press **Deploy**. This keeps the same `/exec` address, so no device needs reconnecting. Don't use **New deployment**: that makes a new address. Your key is stored separately and survives the paste.

## Trophies

Each trophy has three tiers and is worked out from your whole history, so days played before trophies existed count too.

| Trophy | Bronze | Silver | Gold |
|---|---|---|---|
| 💧 Hydration: days hitting the water target | Sipper (5) | Camel (25) | Fish (100) |
| 🥚 Protein: days hitting the protein target | Snacker (5) | Lifter (25) | Powerhouse (100) |
| 🔥 Streak: days in a row hitting both | On a Roll (3) | Iron Week (7) | Unbreakable (30) |
| 🥦 Clean Streak: days in a row with no treats | Fresh Start (3) | Clean Week (7) | Iron Will (30) |
| 🧽 Chores: chores done in total | Helping Hand (10) | House Hero (50) | Chore Machine (200) |
| 🐝 Busy Day: most chores in one day | Busy Bee (3) | Whirlwind (5) | Tornado (8) |
| 🚀 Big Day: best score in one day | Half Century (50) | High Flyer (75) | Century (100) |
| 🥊 Day Wins: days won | Off the Mark (1) | Contender (10) | Heavyweight (50) |
| 🎯 Win Run: days won in a row | Hat-trick (3) | High Five (5) | Perfect Week (7) |
| 📅 Weeks won | Week Winner (1) | Regular (4) | Season Ticket (12) |
| 👑 Months won | Champion (1) | Dynasty (3) | Legend (12) |
| 🌅 Early Bird: days with water logged before 8am | Early Bird (1) | Sunrise Club (10) | Dawn Patrol (50) |

## Developing

Serve the folder and open http://localhost:8765:

```bash
python3 -m http.server 8765
```

Run the backend tests. They run `Code.gs` in Node against fake Google services, and check that the scoring code shared with `index.html` is identical:

```bash
node --test
```
