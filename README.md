# Personal Appointment Diary PWA

**Copyright © 2026 Balaji Venkatachary. All Rights Reserved.**

---

## Overview

**Personal Appointment Diary PWA** is a lightweight, mobile-first Progressive Web Application designed for structured appointment tracking rather than full calendar management.

The application enables users to create custom categories and manage activities under each category with associated metadata such as date, time, venue, contact details, and attachments — all stored locally for complete privacy and offline access.

This project follows an **offline-first**, **client-side only** architecture with no backend dependency.

---

## Key Features

### Category-Based Organization

* Create unlimited custom categories
* Edit or delete categories
* Flexible structure adaptable to professional workflows

Example categories:

* Classes
* Proctor Meetings
* Conferences
* Events
* Research Discussions
* Administration

---

### Activity Management

Each activity supports:

* Title
* Date
* Time
* Venue
* Contact Person
* Contact Information
* Notes
* File Attachments:

  * PDF
  * Images
  * Audio files

---

### Local Data Persistence

* All information stored locally in browser storage
* Data survives:

  * Page refresh
  * Browser restart
  * Device restart
* Fully offline capable

No cloud storage.
No account creation.
No tracking.

---

### Query & Reporting System

Users can query appointments by:

* Category
* Activity name
* Date or date range
* Time
* Venue
* Contact person

Results are displayed in tabular format and can be exported to **PDF**.

---

### Progressive Web App (PWA)

* Installable on mobile devices
* Offline-first architecture
* Fast loading
* App-like experience
* Service worker caching enabled

---

## Technology Stack

* Vite
* TypeScript
* Vanilla JavaScript modules
* HTML5
* CSS3
* IndexedDB (Local Database)
* Service Workers
* PWA Manifest

---

## Project Structure

```
.
├── public/              # Static public assets
├── src/                 # Application source code
│   ├── components/
│   ├── services/
│   ├── db/
│   └── main.ts
│
├── index.html           # Application entry point
├── package.json         # Project dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── metadata.json        # App metadata
├── .env.example         # Environment template
└── README.md
```

---

## Installation

### 1. Clone Repository

```
git clone <repository-url>
cd diary-pwa
```

---

### 2. Install Dependencies

```
npm install
```

---

### 3. Run Development Server

```
npm run dev
```

Open:

```
http://localhost:5173
```

---

### 4. Build Production Version

```
npm run build
```

---

### 5. Preview Production Build

```
npm run preview
```

---

## Usage Workflow

1. Launch application.
2. Create a category.
3. Add activities inside category.
4. Attach supporting files if required.
5. Use Query window to filter appointments.
6. Export filtered results as PDF.

---

## Offline Capability

The application uses:

* IndexedDB for persistent structured data
* Service Worker for asset caching
* Local storage for UI preferences

Internet connection is **not required** after installation.

---

## Data Privacy

* All data remains on the user's device.
* No server communication.
* No telemetry or analytics.
* User retains complete ownership of information.

---

## PWA Installation

On mobile browser:

1. Open app URL.
2. Select **Add to Home Screen**.
3. Launch like a native application.

---

## Development Notes

* Designed for mobile-first interaction.
* Minimal dependency footprint.
* Modular architecture for future extensions.

Possible future enhancements:

* Recurring activities
* Category color coding
* Backup/Restore JSON export
* Multi-device sync (optional future module)

---

## License & Copyright

**Copyright © 2026 Balaji Venkatachary.
All rights reserved.**

Unauthorized copying, modification, distribution, or commercial use without explicit permission is prohibited.

---

## Author

**Dr. Balaji Venkatachary**
Architectural Conservation Researcher
Educator | Heritage Specialist | Digital Tool Developer

---

## Acknowledgment

This application was developed as a personal productivity system emphasizing:

* simplicity
* privacy
* structured academic workflow management
* offline digital autonomy

---
