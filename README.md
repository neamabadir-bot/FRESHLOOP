# FRESHLOOP 🌿

**FRESHLOOP** is a smart food-management app that helps households – starting with **students living alone or with roommates** – know what food they have at home, track expiry dates, and use products before they go to waste.

This repository contains the **first version (MVP)** defined in the project specification (updated version of 1.11.2026, after the lecturer's feedback). It is a mobile-first web app (installable on Android and iPhone home screens) with a Node.js server and a SQLite database.

---

## MVP features (spec section 15)

| # | Feature | Where |
|---|---------|-------|
| 1 | Sign up and create a personal account with **email + password** | `src/pages/Auth.jsx`, `server/auth.js` |
| 2 | **Photograph / scan a supermarket receipt** (phone camera or image) | `src/pages/Scan.jsx` |
| 3 | **Recognise products** with OCR (text recognition) – names, quantities and prices – and show them for approval | Tesseract.js + `src/lib/receiptParser.js` |
| 4 | **Correct details, remove non-food items, add products manually** – nothing is added before the user confirms | Review step in `Scan.jsx`, `src/pages/AddItem.jsx` |
| 5 | **Enter expiry dates**, distinguishing **"use by"** from **"best before"** | `src/components/ItemForm.jsx` |
| 6 | **Inventory management** and quantity updates | `src/pages/Inventory.jsx`, `src/pages/ItemDetail.jsx` |
| 7 | Mark products as **consumed or thrown away** (reason optional) | `src/components/RemoveSheet.jsx` |
| 8 | **Expiry alerts**: 3 days before the date ("check how much is left") and on the date (status **"Needs check"**). Products are **never deleted automatically**. Each user chooses whether to get alerts. | `server/expiry.js`, `server/app.js`, `src/pages/Alerts.jsx` |
| 9 | **Dashboard** showing the inventory and the products that need attention, with the main add / update actions | `src/pages/Dashboard.jsx` |

The trust principles from the spec are built in:
- Expiry dates in this version are always **entered or confirmed by the user** – the app never presents a guess as a certain date.
- "Use by" items past their date are flagged as not to be used; "best before" items show an explanation that the date is about quality, with the limits of what the app can know.

The interface is available in **English and Hebrew** (with right-to-left layout).

### Planned for later stages (not in this MVP, per spec sections 8–12 and 19)
AI recipe suggestions, personal AI agent (text / voice / quick actions), smart shopping list, shared households with invite links and admins, Google / Apple / phone sign-in, AI-estimated shelf life, statistics and money-saving estimates, Arabic and Russian.

---

## Tech stack

- **Front end:** React 18 + Vite, React Router, lucide-react icons, mobile-first CSS (no UI framework)
- **OCR:** [Tesseract.js](https://github.com/naptha/tesseract.js) (Hebrew + English) – runs **on the device**, the photo is never uploaded
- **Back end:** Node.js + Express, JWT login tokens, passwords hashed with scrypt
- **Database:** SQLite via Node's built-in `node:sqlite` (no database server to install)
- **Tests:** Vitest + Supertest
- **Installable app (PWA):** web manifest + service worker (also used for phone notifications)

## Project structure

```
freshloop/
├── server/
│   ├── index.js          # starts the server (also serves the built app in production)
│   ├── app.js            # REST API: auth, items, receipts, dashboard, notifications
│   ├── db.js             # SQLite schema
│   ├── auth.js           # password hashing + JWT
│   └── expiry.js         # expiry status + alert rules (3 days before / on the day)
├── src/
│   ├── pages/            # Auth, Dashboard, Inventory, ItemDetail, AddItem, Scan, Alerts, Settings
│   ├── components/       # BottomNav, ItemForm, RemoveSheet, shared UI
│   ├── lib/              # receiptParser.js (OCR text -> products), format.js
│   ├── i18n.jsx          # English / Hebrew text
│   ├── auth.jsx          # login state
│   ├── notifications.jsx # unread alerts + phone notifications
│   └── styles.css        # design system (greens, whites, natural tones)
├── public/               # icon, manifest, service worker, samples/sample-receipt.svg
├── tests/                # unit + API tests
└── index.html
```

---

## Running the app

### 1. Requirements
- **Node.js 22.13 or newer** (LTS recommended) – download from <https://nodejs.org> or on Windows run `winget install OpenJS.NodeJS.LTS`.
- Internet connection the first time you scan a receipt (Tesseract downloads its Hebrew/English language data, then the browser caches it).

### 2. Install
```bash
npm install
```

### 3. Start in development mode
```bash
npm run dev
```
This starts two things together:
- the API server on <http://localhost:3001>
- the app on **<http://localhost:5173>** ← open this one

Create an account and start adding products. Data is stored in `data/freshloop.db` (created automatically).

### 4. Open it on your phone
1. Connect the phone to the **same Wi-Fi** as the computer.
2. When `npm run dev` starts, Vite prints a `Network:` address such as `http://192.168.1.20:5173` – open it on the phone.
3. "Take photo" opens the phone camera directly. To install the app, use **Add to Home Screen** in the browser menu.
   (If Windows Firewall asks, allow Node.js on private networks.)

### 5. Production mode (single server)
```bash
npm run build     # builds the app into dist/
npm start         # serves app + API on http://localhost:3001
```
Set `JWT_SECRET` (see `.env.example` – copy it to `.env`) before deploying anywhere public.

---

## Testing

### Automated tests
```bash
npm test
```
19 tests cover the expiry rules (3-day / expiry-day logic, statuses), the receipt parser (English, Hebrew, garbled OCR output) and the API (registration, login, user separation, inventory, receipts, alerts, notification preference).

### Manual test scenario
1. **Register** a new account (try a short password and a duplicate email to see validation).
2. **Scan a receipt** – tap the green button in the middle of the bottom bar.
   No real receipt at hand? Use the demo receipt: open `http://localhost:5173/samples/sample-receipt.svg` on another screen and photograph it, or choose `public/samples/sample-receipt.svg` with **Choose image**.
3. On the review screen: remove *Dish soap* (not food), fix a name, add expiry dates – e.g. **today**, **in 2 days** and **in 10 days** – and switch one product to "Best before". Confirm.
4. **Dashboard**: the counters and "Needs your attention" now show the product expiring today (**Needs check**) and the one in 2 days (**Expiring soon**). The bell shows unread alerts.
5. **Alerts**: open an alert → the product page asks **"How much is left?"**. Lower the quantity and confirm.
6. Set a quantity to **0** → choose **Used it** or **Threw it away** (reason optional). Check **Inventory → History**.
7. **Add manually** a product without a date → it appears under "Missing expiry dates".
8. **Settings**: turn expiry alerts off/on, enable phone notifications, switch to **עברית**.

---

## Uploading to GitHub

1. Create a new **empty** repository on <https://github.com/new> (for example `freshloop`) – don't add a README there.
2. In this folder run:
   ```bash
   git init
   git add .
   git commit -m "FRESHLOOP MVP"
   git branch -M main
   git remote add origin https://github.com/<your-username>/freshloop.git
   git push -u origin main
   ```
`node_modules/`, `dist/`, the database (`data/`) and `.env` are excluded by `.gitignore`, so no personal data or secrets are uploaded.

---

## Notes and current limitations

- **Alerts** are created by the server (3 days before / on the expiry date) and appear in the Alerts screen and on the bell. Phone notifications are shown while the app is open or in the background tab; real push notifications when the app is fully closed need a push service and are a later step.
- **OCR accuracy** depends on photo quality. That is why every scan goes through the review step, and products can always be added or corrected manually.
- **Prices** from receipts are saved per product, ready for the statistics stage.
- Dates are calculated in the server's local time zone.
