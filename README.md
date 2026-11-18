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

## 📁 Project Structure

```text
elevatorfinder/
├── src/
│   ├── api/
│   │   ├── kakaoMaps.js
│   │   └── routeApi.js
│   ├── navigationMain.jsx
│   ├── StationSearch.jsx
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
- Better mobile experience
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

## 🌏 The Bigger Idea

This project started with one simple problem:

**"Where should I get on the train so I'm closest to the elevator when I get off?"**

The long-term goal is to make that answer easy to find — first in Korea, and eventually anywhere public transportation can be made a little easier to navigate.

---

Made with 💛 for easier, more accessible journeys.
