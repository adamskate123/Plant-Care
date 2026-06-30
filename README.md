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

## Pushing reminders into the Apple Reminders app

Plant Care can hand each plant's next watering to the built-in **Reminders**
app, so you get a real due-date alert even when Plant Care is closed. Apple
doesn't let a web app write to Reminders directly, so this works through the
**Shortcuts** app — a one-time, ~2-minute setup.

### 1. Create the Shortcut (once)

Open **Shortcuts** → **+** (new shortcut), name it **exactly**
`Plant Care Reminder`, then add these actions in order:

1. **Receive** — at the top, set it to receive **Text** input (and, if asked
   what to do with no input, "Stop and respond").
2. **Split Text** — split *Shortcut Input* by a **Custom** separator: `|`
3. **Get Item from List** — *Item at Index* **1** of *Split Text* → this is the
   title (rename this variable "Title" if you like).
4. **Get Item from List** — *Item at Index* **2** of *Split Text* → the date text.
5. **Get Dates from Input** — pass it the date text from step 4 → gives a real date.
6. **Add New Reminder** — set the reminder text to the **Title** variable from
   step 3; expand options and set **Remind me → At a time** to the **date**
   from step 5.

Run it once from inside Shortcuts so iOS grants it permission to add reminders.

### 2. Use it

**Manually:** open a plant → **🍎 Add to Reminders**. Your phone jumps to
Shortcuts, the reminder is created on the next watering date (9 AM by default),
and you're returned to the app. The first time, tap **Allow** if iOS asks.

**Automatically:** tap the **🍎** button in the top bar to toggle
**auto-reminders on**. While it's on, every time you tap **💧 Water** a plant,
its *next* watering reminder is created in the Reminders app for you — no extra
step. Tap **🍎** again to turn it off (the setting is remembered). Heads-up:
each watering briefly bounces you to Shortcuts to create the reminder, so leave
it off if you'd rather add reminders by hand.

> The app sends the Shortcut a single line of text formatted as
> `Water <plant name>|YYYY-MM-DD HH:MM`, which the steps above split into the
> reminder's title and due time. To change the default alert time, edit
> `REMINDER_HOUR` near the top of the Reminders section in `app.js`.

## A note on in-app reminders

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
