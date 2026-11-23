# 🚇 ElevatorFinder | 내릴자리

> Find the best subway car and door to get you closer to the elevator.

ElevatorFinder is an accessibility-focused subway tool that helps riders figure out **where to board the train before arriving at their destination**.

Instead of getting off the train and walking the length of the platform looking for an elevator, ElevatorFinder helps you choose the train car and door that puts you closer to it.

## 💛 Why I Built This

Navigating the subway with a stroller completely changed the way I use public transportation.

A transfer or exit that takes only a few minutes using the stairs can become much more complicated when you're traveling with a baby, stroller, wheelchair, luggage, or anything else that makes stairs difficult.

The elevator exists — but knowing **where it is before you get off the train** can make the trip much easier.

That's the idea behind ElevatorFinder.

## ✨ What It Does

Search for a station or a trip between two places, and ElevatorFinder shows:

- 🚇 Platform elevator positions by line and travel direction, including train-door labels such as `6-3`
- ↕️ Elevator operating status and ground-level exit names
- 🔄 Transfer-station guidance for the arriving and departing lines when a route changes lines
- 📝 A station-to-station guide with street-level elevator options and service status, transfer steps, and visual station maps for the 혜화역 → 성수역 example
- ⭐ Favorite destinations for quick access

The goal is simple:

**Board smarter → get off closer → spend less time searching for the elevator.**

## 🧪 Current Prototype

ElevatorFinder is a React webapp focused on the **Seoul subway system**. It uses Kakao for place and transit searches and Seoul Metro's elevator records for station equipment. A clearly labeled fictional route preview is available without API keys.

### 2026-11-18 update

- Made station cards easier to scan, with separate platform direction, train position, and operating status.
- Moved ground-level exit elevators out of the platform list so exit names appear once.
- Removed unverified map coordinates after two markers appeared to point to escalators. Ground-level exits now come only from records identified as elevators.
- Added a visible transfer-station label to route choices and numbered guidance for the arriving and departing platforms.
- Added optional KRIC transfer-movement lookup. When a verified connecting path is unavailable, the app states that the step-free connection is unconfirmed.

### 2026-11-23 update

- Added a **Station to station** tab, prefilled with 혜화역 → 성수역. It shows the subway stops, platform elevator positions, transfer, and all reported street-level elevators at the stations on the route.
- Added four [official Seoul Metro station maps](https://www.data.go.kr/data/15004974/fileData.do) for 혜화, 동대문역사문화공원 (Lines 4 and 2), and 성수. Larger previews open a full-screen viewer with zoom controls on phones. Other stations currently use text and elevator records without a map image.
- Added illustrated elevator sign cues for boarding, transferring, and exiting. These are visual hints, not photos of the signs at those stations.
- Removed the street-level entrance picker. Each elevator option now shows its location, floors served, and whether it is in service, out of service, or unconfirmed. Records marked for repair or inspection count as out of service.
- Exact walking paths and the closest exit cannot be inferred from the current elevator records. The guide labels these gaps instead of guessing. Detailed step-free transfer instructions appear only when the optional KRIC data is configured and available.
- Tested the layout at phone width and confirmed the local Wi-Fi address responds. The phone and computer must be on the same Wi-Fi while the local server is running.

> ⚠️ Elevator locations, platform layouts, construction, and accessibility conditions can change. Always follow current station signage and staff guidance when traveling.

## 🛠️ Built With

- React
- Vite
- JavaScript
- CSS
- LocalStorage for saved stations

## 🚀 Run It Locally

### 1. Clone the repository

```bash
git clone https://github.com/chococappucino/elevatorfinder.git
cd elevatorfinder
```

### 2. Install dependencies

Using pnpm:

```bash
pnpm install
```

### 3. Start the development server

```bash
pnpm dev
```

Vite will provide a local URL where you can open the app in your browser.

To preview the page on a phone on the same Wi-Fi, run `pnpm dev --host 0.0.0.0`, then open the Network URL printed by Vite on the phone. The computer and development server must stay running.

### Install the web app

Run `pnpm build` and then `pnpm preview` to test installation and offline access on localhost. Use an HTTPS deployment to test on a phone.

- In Chrome on Android or Chrome and Edge on desktop, use **Install app** when it appears or open the browser’s install option.
- On iPhone, open the app in Safari and choose **Share → Add to Home Screen**. Turn on **Open as Web App** if shown, then tap **Add**.

After an online visit has prepared the app for offline use, you can reopen it to view your favorites and try the fictional demo. Live route searches, maps, and elevator status require a connection. Production hosting needs to serve the built files from the site root and forward `/api` requests to the backend.

## 📁 Project Structure

```text
elevatorfinder/
├── src/
│   ├── api/
│   │   ├── kakaoMaps.js
│   │   └── routeApi.js
│   ├── navigationMain.jsx
│   ├── StationSearch.jsx
│   ├── StationTrip.jsx
│   ├── TransferCard.jsx
│   └── navigation.css
├── server/
│   ├── api.js
│   ├── kakaoRoutes.js
│   └── seoulElevators.js
├── SETUP.md
├── index.html
├── package.json
└── pnpm-lock.yaml
```

## 🔌 API Integration

Use [SETUP.md](SETUP.md) and [.env.example](.env.example) to configure keys locally. `.env.local` is ignored by Git and must stay private. Kakao's JavaScript map key is exposed to the browser, so restrict its allowed domains. Kakao REST, Seoul, and optional KRIC keys are read by the local server.

**Never commit a private API key directly to the public repository.**

For production use, requests requiring private credentials should be handled through a secure backend or serverless function rather than exposing the key in client-side JavaScript.

## 🗺️ Roadmap

Future ideas for ElevatorFinder include:

- More Seoul subway stations
- Verified elevator locations
- Verify ground-level elevator coordinates against the named facilities
- Verify step-free transfer corridors across more stations
- Accessible route planning
- Community reporting for outdated information
- Expansion beyond Seoul and Korea

## ♿ Who It's For

ElevatorFinder is being designed with accessibility and convenience in mind, especially for:

- 👶 Parents with strollers
- ♿ Wheelchair users
- 🧳 Travelers with luggage
- 👵 Older passengers
- 🩼 Riders with temporary mobility limitations
- 💛 Anyone who prefers or needs an elevator

## 🤝 Contributing

ElevatorFinder is still in its early stages.

If you find incorrect station information, have accessibility data to contribute, or want to help improve the project, feel free to open an Issue or Pull Request.

### Interface languages

ElevatorFinder defaults to Korean and remembers the selected language in the current browser. English suggestions include independently matched station and tollgate labels alongside the Korean names. The station lookup accepts English station names through these suggestions. Addresses, directions, and place names without a matching English label appear as supplied by their providers.

English station names are from [Seoul Metro’s multilingual station-name data](https://data.seoul.go.kr/dataList/OA-2751/F/1/datasetView.do), November 1, 2024, licensed under [KOGL Type 1](https://www.kogl.or.kr/info/licenseType1.do). The app retains the English primary names and associates them with Korean station names and lines.

Tollgate labels are romanized from the [Korea Expressway Corporation toll office directory](https://www.data.go.kr/data/15085270/fileData.do) and matched by name and municipality. The [road operator’s directory](https://www.ksroad.co.kr/page/company/overview.php) supplies Uiwang.

To add a language, copy `src/i18n/ko.js` into a catalog named for the new locale. Translate each message, keeping its key and named placeholders such as `{station}`. For phrases that change with quantity, provide the appropriate `Intl.PluralRules` forms and an `other` form. Register the catalog and the language’s native name in `src/i18n/messages.js`, then run `node --test src/*.test.js server/*.test.js` and check the language in the demo.

## 🌏 The Bigger Idea

This project started with one simple problem:

**"Where should I get on the train so I'm closest to the elevator when I get off?"**

The long-term goal is to make that answer easy to find — first in Korea, and eventually anywhere public transportation can be made a little easier to navigate.

---

Made with 💛 for easier, more accessible journeys.
