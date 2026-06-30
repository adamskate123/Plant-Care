# 🪴 Plant Care

A simple, private watering tracker for your **indoor and outdoor plants** — built as
an installable web app (PWA) that lives on your iPhone home screen just like a
native app. No App Store, no account, no Mac/Xcode needed.

## Features

- ➕ Add plants with a name, **indoor/outdoor** location, watering interval, last
  watered date, and optional notes.
- 💧 One-tap **"Water"** button logs today's watering and recalculates the next
  due date.
- 🚦 Clear status for every plant: *water today*, *water in N days*, or
  *overdue by N days*.
- 🔎 Filter tabs: **All / Indoor / Outdoor / Needs water**, sorted so the
  thirstiest plants float to the top.
- 📖 Per-plant detail view with full watering history.
- 🔔 Optional reminders that flag plants needing water (see notes below).
- 📴 **Works fully offline** — all data is stored privately on your phone
  (`localStorage`), nothing is sent anywhere.

## Install on your iPhone

1. Host the files (see **Running it** below) and open the URL in **Safari** on
   your iPhone.
2. Tap the **Share** button → **Add to Home Screen**.
3. Open "Plant Care" from your home screen — it runs full-screen like a native app.

## Running it

It's plain HTML/CSS/JS with no build step. You just need to serve the folder over
HTTPS (a service worker and "Add to Home Screen" require it; `localhost` is fine
for testing).

**Quick local test (from this folder):**

```bash
python3 -m http.server 8000
# then visit http://localhost:8000 on your computer
```

**To use it on your phone**, host it anywhere that serves static files over
HTTPS — for example **GitHub Pages**:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build from branch**, pick this branch, folder `/root`.
3. Open the published `https://…github.io/…` URL in Safari and Add to Home Screen.

## A note on reminders

This app keeps everything on your device with **no server**, which is great for
privacy. The trade-off is reminders: it shows you what needs water every time you
open the app, and (if you grant permission) can pop a notification while it's
running. iOS supports notifications for home-screen web apps on **iOS 16.4+** —
enable them by tapping the 🔔 in the top-right *after* adding the app to your home
screen.

Truly scheduled background reminders (a buzz at 9am even if the app is closed)
require a small push server. If you'd like that, it can be added later.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App markup and dialogs |
| `styles.css` | Styling (calming green, iOS safe-area aware) |
| `app.js` | All logic: storage, scheduling, rendering, reminders |
| `sw.js` | Service worker for offline support |
| `manifest.webmanifest` | PWA metadata (name, icons, colors) |
| `icons/` | App icons |
| `tools/make_icons.py` | Regenerates the icons (pure Python, no deps) |
