# SafeEats - Travel Companion App for Japan

![SafeEats](https://img.shields.io/badge/version-2.0.0--mobile--beta-blue) ![Status](https://img.shields.io/badge/status-in%20development-orange) ![Platform](https://img.shields.io/badge/platform-web--mobile-green)

---

## 📱 Overview

**SafeEats** is a progressive web app (PWA) designed to help travelers explore and discover food stops during road trips in Japan. Features real-time map, GPS-based weather, budget tracking, photo gallery, and group chat functionality.

**Deployed:** https://one-2027-b9p9be0qd-moriconzs-projects.vercel.app/

---

## ✨ Key Features

### 🗺️ Interactive Map
- Real-time OpenLayers map with markers
- Filter by category: Bar, Panetterie, Consegna cibo, Asporto
- Zoom controls, location indicator
- Responsive design for mobile

### 🌡️ Weather Widget (GPS)
- Real-time location-based weather
- Open-Meteo API integration
- Hourly forecast data
- Fallback messages for permission denied/GPS unavailable
- *[In Progress: Redesign to match card-based UI]*

### 📲 PWA Installation
- "Aggiungi a schermata iniziale" button
- Works on Android, iOS, Desktop browsers
- beforeinstallprompt support
- Fallback instructions for manual installation
- Service Worker for offline support

### 💬 Group Chat
- Real-time messaging with group members
- Push notifications
- User-friendly UI with message history
- Avatar support

### 💰 Budget Tracker
- Trip-based budget management
- Expense tracking
- Currency support (JPY, EUR, USD, etc.)
- Per-person cost calculation

### 🖼️ Photo Gallery
- Upload/view travel photos
- Organized by location/date
- Responsive grid layout

### 📍 Navigation
- 8 main tabs: Mappa, Tappe, Prenota, Shopping, Gruppo, GF, Groq, Posti GF
- Quick access buttons: Budget, Galleria
- Mobile-optimized bottom nav

---

## 🛠️ Tech Stack

| Layer | Technology | Files |
|-------|-----------|-------|
| **Frontend** | HTML5, CSS3, JavaScript ES6+ | index.html, *.css |
| **Map** | OpenLayers 8.x | integrated via CDN |
| **Weather API** | Open-Meteo (free, no key required) | weather functions in index.html |
| **Styling** | CSS Variables, Flexbox, Media Queries | y2k-override.css |
| **PWA** | Service Worker, manifest | sw.js, manifest.json |
| **Notifications** | Push API | index.html notification handler |
| **Deployment** | Vercel | automatic from git |

---

## 📂 Project Structure

```
Giappone-2027-main-2/
├── index.html              # Main app (HTML + inline JS)
├── y2k-override.css        # All styling
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest (if exists)
├── js/
│   └── y2k-windows.js      # Window UI library
├── README_SAFEATS.md       # This file
├── DEVELOPMENT_STATUS.md   # Development tracking
└── docs/
    └── API_REFERENCE.md    # (Planned)
```

---

## 🚀 Getting Started

### Development Setup
```bash
# Clone repo
git clone <repo-url>
cd Giappone-2027-main-2

# Local development (requires http-server or similar)
npx http-server
# Open http://localhost:8080

# Or use Live Server in VS Code
```

### Browser Requirements
- **Desktop:** Chrome 90+, Edge 90+, Firefox 88+, Safari 14+
- **Mobile:** Chrome (Android), Safari (iOS 12+)
- **HTTPS required** for: geolocation, Service Worker, notifications

### Installation Instructions for Users

#### Android
1. Open app in Chrome
2. Tap ⋮ menu → "Installa" or "Aggiungi a schermata iniziale"
3. Tap "Aggiungi" button in app header (alternative)

#### iOS
1. Open app in Safari
2. Tap Share → "Aggiungi a Schermata Iniziale"
3. Confirm installation

#### Desktop
1. Open app in Chrome/Edge
2. Click button in top-right address bar (automatic prompt)
3. Or use "Aggiungi" button in app (manual fallback)

---

## 📊 Current Version Status

| Component | Status | Notes |
|-----------|--------|-------|
| Header/UI | ✅ Complete | Redesigned with SafeEats branding |
| Filter Bar | ✅ Complete | Responsive, 4 categories |
| Map | ✅ Complete | OpenLayers, responsive layout |
| Navigation | ✅ Complete | 8 tabs + 2 quick buttons |
| Weather Widget | 🟨 In Progress | HTML/CSS redesign needed |
| PWA Install | ✅ 95% | Tested on desktop, needs mobile verification |
| Group Chat | ✅ Complete | Full functionality implemented |
| Budget Tracker | ✅ Complete | Multi-currency support |
| Photo Gallery | ✅ Complete | Responsive grid layout |
| Service Worker | ⚠️ Partial | Exists, needs verification |

---

## 🎨 Design System

### Colors
- **Primary:** Blue-Violet gradient (#4A5BA8 → #2D3B7D)
- **Accent:** Hot Pink (#FF1493)
- **Success:** Neon Green (#00FF88)
- **Background:** Light Gray (#f0f0f0)
- **Text:** Dark Navy (#1A2560)

### Spacing (Mobile-First)
- Header: 72px min-height (responsive)
- Filters: 56px height (≤480px)
- Bottom nav: 60px height
- Standard padding: 12px-16px

### Responsive Breakpoints
- `≤480px`: Mobile optimization (current focus)
- `≤768px`: Tablet adjustments
- `>768px`: Desktop layout
- Fold devices: Special media queries

---

## 🔧 Configuration

### Weather API
```javascript
// Open-Meteo (free, no authentication required)
// Location: Japan, timezone: Asia/Tokyo
// Updates: Every 10 minutes after first geolocation
API: https://api.open-meteo.com/v1/forecast
```

### Push Notifications
```javascript
// Triggered when group chat receives messages
// Permission: "default" → user can grant
// Desktop: Browser native notifications
// Mobile: Service Worker notifications
```

### Service Worker
```javascript
// File: ./sw.js
// Scope: Root (/)
// Cache strategy: Network-first for dynamic, cache-first for static
// Required for: PWA install, offline support, push notifications
```

---

## 🧪 Testing Checklist

### ✅ Tested & Working
- [x] Header rendering and styling
- [x] Filter bar positioning
- [x] Map display and responsiveness
- [x] Tasto "Aggiungi" click detection
- [x] Toast notification (install fallback)
- [x] Weather widget HTML rendering
- [x] Navigation tabs visibility

### ⚠️ Partially Tested
- [ ] Geolocation permission flow (needs real device)
- [ ] Weather API response (pending geolocation success)
- [ ] beforeinstallprompt event (null on desktop)
- [ ] Service Worker registration (verify in DevTools)
- [ ] Push notifications (permission scope)

### ❌ Not Yet Tested
- [ ] PWA install on Android/iOS
- [ ] Offline functionality
- [ ] Group chat messaging
- [ ] Budget calculations
- [ ] Photo upload
- [ ] All map interactions

---

## 📝 Known Issues

### High Priority
1. **Weather Widget Styling**
   - Currently shows bare "⏳ Caricamento..." text
   - Needs redesign to match card-based reference image
   - Location: `index.html` lines 226-228, `y2k-override.css` lines 118-128

2. **PWA Install on Mobile**
   - beforeinstallprompt may not fire on all browsers
   - Requires Service Worker + HTTPS + criteria met
   - Fallback manual instructions provided

### Medium Priority
3. **Weather Widget Data**
   - Geolocation requires user permission
   - API fetch may fail without proper headers/CORS
   - Error states not yet visually styled

4. **Browser Detection**
   - User agent detection improved but may have edge cases
   - Fallback uses `navigator.maxTouchPoints` detection

---

## 🔗 API Documentation

### Geolocation API
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Fetch weather for these coordinates
  },
  (error) => {
    // Handle permission denied, GPS unavailable, etc.
  }
);
```

### Open-Meteo Weather API
```
GET https://api.open-meteo.com/v1/forecast?
  latitude=LAT&longitude=LON&
  hourly=temperature_2m,weathercode,windspeed_10m&
  daily=temperature_2m_max,temperature_2m_min&
  temperature_unit=celsius&
  timezone=Asia/Tokyo

Response: {
  hourly: {
    temperature_2m: [array],
    weathercode: [array],  // WMO codes
    ...
  }
}
```

### WMO Weather Codes
- 0-1: Clear
- 2-3: Partly cloudy
- 45-48: Foggy
- 51-67: Drizzle/Rain
- 71-85: Snow
- 80-82: Showers
- 85-86: Snow showers
- 95-99: Thunderstorm

---

## 🚀 Deployment

### Automatic (GitHub → Vercel)
```bash
# Push to main branch
git push origin main
# Vercel automatically builds & deploys
# Live at: https://one-2027-b9p9be0qd-moriconzs-projects.vercel.app/
```

### Manual Build
```bash
# No build step required (pure frontend)
# Just serve index.html + supporting files
# HTTPS required for geolocation + PWA
```

### Environment Requirements
- HTTPS (required for PWA)
- CORS enabled for weather API (handled by Open-Meteo)
- Service Worker scope: /
- manifest.json for PWA metadata

---

## 📞 Support & Contributions

### Issues
Found a bug? [Create an issue with:]
- Device/Browser: (e.g., Chrome 120, Android 13)
- Steps to reproduce
- Expected vs. actual behavior
- Console errors (if any)

### Development
1. Create feature branch: `git checkout -b feature/weather-redesign`
2. Make changes
3. Test thoroughly
4. Submit PR with description

---

## 📋 Changelog

### v2.0.0 (Current - In Progress)
- ✨ Header redesign with SafeEats branding
- ✨ Responsive filter bar
- ✨ Dynamic map positioning system
- ✨ PWA install system improvements
- 🐛 Fixed overlay issues (filters covering map)
- 🎨 Weather widget (design phase)
- 📱 Mobile-first approach (≤480px focus)

### v1.0.0 (Previous)
- Initial app launch
- Core features (map, chat, budget, gallery)
- Basic UI

---

## 📖 Additional Resources

- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Detailed development tracking
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)
- [OpenLayers Documentation](https://openlayers.org/doc/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## 👤 Author
**Riccardo Moriconz**  
Email: riccardo.moriconz@gmail.com

---

## 📄 License
[Specify your license here]

---

**Last Updated:** 7 Maggio 2026  
**Next Review:** After weather widget completion + mobile PWA testing
