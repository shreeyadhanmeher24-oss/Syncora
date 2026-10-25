# Syncora

**An offline-first task manager with reliable background synchronization.**

Syncora lets users manage tasks offline and sync changes with a backend API when connectivity is restored.

### Features
- **Offline-first:** Create, update, and delete tasks without an internet connection.
- **Local persistence:** Stores tasks using IndexedDB.
- **Sync queue:** Tracks pending operations and retries synchronization when connectivity returns.
- **Real-time connectivity status:** Detects online and offline transitions.
- **Task management:** Add, complete, search, filter, and delete tasks.
- **Progressive Web App support:** Uses a service worker for offline support.

### Tech Stack
- **Frontend:** React, JavaScript, Vite
- **Storage:** IndexedDB
- **Backend:** Node.js, Express.js
- **Networking:** REST API, Fetch API
- **Offline Support:** Service Worker

### Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/shreeyadhanmeher24-oss/Syncora.git
cd Syncora
```

**2. Start the backend**
```bash
cd server
npm install
npm run dev
```

**3. Start the frontend** in a separate terminal:
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Project Structure
```text
Syncora/
├── client/   # React frontend and offline storage
└── server/   # Express REST API
```

### Core Concept

Syncora follows an **offline-first architecture**: task changes are saved locally and recorded in a synchronization queue. When connectivity returns, queued operations are sent to the backend API.

### Future Improvements
- Persistent server-side database
- Conflict resolution for concurrent edits
- Background synchronization and sync retry controls

---

**Built to explore offline-first architecture, local data persistence, and reliable synchronization in web applications.**