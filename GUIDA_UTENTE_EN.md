# 🧭 Tabi — User Guide

A practical, illustrated, step-by-step guide to using the app — not a technical
document. For architecture/stack details, see the [README](README.md). Versione in
italiano: [GUIDA_UTENTE.md](GUIDA_UTENTE.md).

Screenshots are taken in mobile mode (the app is mobile-only by design) with sample
data, in light theme for readability — the app always follows your system theme, see
[§13](#13-lightdark-theme).

---

## Table of contents

1. [First launch](#1-first-launch)
2. [Main navigation](#2-main-navigation)
3. [The Map](#3-the-map)
4. [Place detail](#4-place-detail)
5. [Building an itinerary](#5-building-an-itinerary)
6. [Gluten-free guide](#6-gluten-free-guide)
7. [The ⚙️ menu](#7-the-menu)
8. [Group and collaboration](#8-group-and-collaboration)
9. [Budget, tickets and bookings](#9-budget-tickets-and-bookings)
10. [Discovery and organization](#10-discovery-and-organization)
11. [Practical tools](#11-practical-tools)
12. [Offline and installing as an app](#12-offline-and-installing-as-an-app)
13. [Light/dark theme](#13-lightdark-theme)
14. [FAQ](#14-faq)

---

## 1. First launch

On the very first launch you see a welcome screen with two choices:

<img src="docs/guide-images/00-onboarding-choice.png" width="360" alt="Welcome screen with the Create my trip or Join a trip choices">

- **✏️ Create my trip** — starts the creation wizard: trip name, dates, who you're
  traveling with (solo/couple/group), interests, any dietary constraints (including
  "gluten-free" — see [§6](#6-gluten-free-guide)), an indicative daily budget, and
  destination (Japan by default, but any country works: it's a global planner).
- **👥 Join a trip** — if someone in your group already created the trip, join their
  room directly with the code they gave you, skipping the wizard.

<img src="docs/guide-images/01-onboarding-wizard.png" width="360" alt="First wizard step: choosing the day">

No account needed: everything stays saved on your phone/browser. You can always redo
this step later from **Menu → ✏️ I want to create my trip**.

## 2. Main navigation

At the bottom you'll always find 4 tabs, the most-used part of the app:

| Icon | Name | What it shows |
|---|---|---|
| 🗺️ | **Map** | places to visit, filters, today's weather |
| 📅 | **Itinerary** | your day-by-day plan |
| 💚 | **GF Guide** | gluten-free search (can be hidden, [§6](#6-gluten-free-guide)) |
| ⚙️ | **Menu** | every other feature, listed in [§7](#7-the-menu) |

## 3. The Map

The opening view. Chips at the top filter what you see (Local, GF Places, category by
category); bottom-left, a weather card for the current day, always visible.

<img src="docs/guide-images/02-map.png" width="360" alt="Map view with place markers and weather card">

Tap a marker to open its detail. Green markers indicate places with positive
gluten-free data (when the GF guide is enabled).

## 4. Place detail

Tapping a marker (or a search result) opens the full card: photos, category, opening
hours (with a warning if the place will be closed at the time you planned), a
gluten-free analysis where relevant, a star rating, and — if you're in a group — a
"Group feedback" section where anyone can confirm or flag an issue with that place.

<img src="docs/guide-images/03-poi-detail.png" width="360" alt="Place detail with photo, category, and group feedback">

The **"➕ Add to itinerary"** button at the top of the card starts the wizard
described in the next section.

## 5. Building an itinerary

From a place's detail, **Add to itinerary** opens a 4-step wizard: day → time →
duration/cost/note → summary and confirm.

<img src="docs/guide-images/04-add-to-itinerary-wizard.png" width="360" alt="Add-to-itinerary wizard, step 1 of 4: choose the day">

From the **📅 Itinerary** tab you see every day of the trip as expandable cards, with
KPIs (stops, visit hours, cost, km) for each:

<img src="docs/guide-images/05-itinerary.png" width="360" alt="Itinerary view with expandable days, costs, and Undo/Redo buttons">

- **Drag** a stop to manually reorder it.
- **⬅️ Undo / Redo ➡️** undo/redo the last change (also works with Ctrl+Z /
  Ctrl+Shift+Z on keyboard).
- **🧭 Optimize** (with 3+ stops in a day) reorders stops to minimize travel.
- **✨ Suggestions** proposes nearby places for whatever free time is left in a day.
- **⏮ History** shows the change log — useful in a group itinerary to see who changed
  what.
- Every day shows a **visits-vs-travel** bar: if the total load exceeds 12 hours, a
  "⚠️ Very packed day" warning appears — it doesn't block anything, it's just meant to
  surface a problem *before* you're on the ground, not after.
- At the bottom you'll find **export/share** buttons (print, calendar .ics, WhatsApp,
  shareable link, share with group) — details in
  [§8](#8-group-and-collaboration).

## 6. Gluten-free guide

Tabi started as a guide for celiac travelers in Japan, and stayed as an **optional**
feature, no longer the app's core: find it in onboarding among the dietary
constraints, or anytime from **Menu → 🌾 Gluten-Free Guide** (on/off toggle, on by
default). If you don't need it, turn it off: it disappears from the bottom navigation
and from the map filters.

<img src="docs/guide-images/06-gf-guide.png" width="360" alt="Gluten-Free Guide with name search and zone filter">

When on, the **💚 GF Guide** tab searches gluten-free restaurants/shops by zone (the
"cities" shown are derived from your itinerary's stops, not a fixed list — consistent
with it being a global planner) and shows an explicit safety badge, always text plus
color:

- 🟢 **SAFE** — verified safe place
- 🟡 **CAUTION** — caution, verify on site
- 🔴 **DANGER** — place flagged as risky
- ⚪ **Unverified safety** — no data collected yet

## 7. The ⚙️ menu

Tap the **Menu** tab at the bottom to open the panel with every feature not in the
main navigation, plus the language and destination selectors at the top:

<img src="docs/guide-images/07-menu-drawer.png" width="360" alt="Menu panel listing every feature">

The sections below describe each item, grouped by topic.

## 8. Group and collaboration

From **Menu → 👥 Group**: create a room (generates an 8-character code) or join an
existing room with a friend's code. From here you see online members and the GPS
sharing toggle.

<img src="docs/guide-images/13-group.png" width="360" alt="Group panel with room code, online members, and GPS sharing">

**Common questions about group and sharing:**

**Can I share the itinerary outside the app (WhatsApp, email...)?** Yes. From the
Itinerary view, the share button generates a **link** that has the entire itinerary
encoded inside it — no account needed, the recipient doesn't need to be in your group.
The link is copied to your clipboard: paste it anywhere. Whoever opens it can import
those stops into their own itinerary with a tap. Practical limit: for a very long
itinerary the link can get too large — the app flags this and you can share with a
group instead, or export a calendar file (.ics).

**Can I share it internally, with a group I'm part of?** Yes. Once you're in a room,
you can share your personal itinerary with that group: from that point it becomes a
"group itinerary" visible to every member.

**Can every member view and edit the shared itinerary?** Yes, both, with no role
restrictions. There's no "read-only" concept. If two people edit at the same moment,
the app resolves conflicts on its own, field by field: if you change a stop's time
and another member changes its note at the same instant, both edits win. Only when
*two people touch the exact same field* at the same moment does the most recent one
win — and the discarded one is still recorded in a conflict-review panel. Members
don't need to be online together: offline changes sync once everyone reconnects.

**Do I see other members' GPS? Do they see mine?** It's reciprocal, but only for
whoever turns it on ("📍 GPS sharing" toggle in the Group panel, off by default). Each
person decides for themselves: if you turn it on but a travel companion doesn't,
you're visible to them but you don't see their position.

**How does it work technically?** There's no proprietary server: group, chat, GPS,
and shared editing all travel over a P2P protocol (MQTT) on a free public broker.
Zero accounts, zero infrastructure cost — but if that broker has an outage, group
sync stops temporarily (your personal itinerary and already-saved data stay on your
phone).

### Group chat

Inside the Group panel, the chat button opens a real-time chat with every member of
the room:

<img src="docs/guide-images/30-group-chat.png" width="360" alt="Group chat">

### Group expenses

From **Menu → 💴 Group expenses**: log a shared expense, the app computes balances
between members (who owes whom).

<img src="docs/guide-images/15-group-expenses.png" width="360" alt="Group expenses panel">

### Group checklist

From **Menu → 📋 Group checklist**: a shared list of things to do/pack before
departure (JR Pass, adapters, eSIM...), checkable by anyone in the group.

<img src="docs/guide-images/16-group-checklist.png" width="360" alt="Group checklist with checkable items">

### Group GF wishlist

From **Menu → 🗳️ Group GF wishlist**: propose a gluten-free place to the group,
other members can vote on it. If you're not in a group yet, the app tells you
honestly (local save only) instead of faking a share that isn't happening.

<img src="docs/guide-images/09-gf-wishlist.png" width="360" alt="Group GF wishlist">

## 9. Budget, tickets and bookings

### Budget

From **Menu → 💰 Budget**: set a total budget, choose the currency to view amounts in
(automatic conversion from the current exchange rate), log expenses as you make them.

<img src="docs/guide-images/14-budget.png" width="360" alt="Budget panel with total, spent, and currency">

Every expense also keeps **the original currency and amount you entered it in**, so
if you later change the display currency you don't lose track of what you actually
paid. The screen shows: total spent vs budget, breakdown by category (food,
transport, lodging, shopping, activities, other), planned days (days with at least
one itinerary stop), and the most recent expenses.

### Tickets

From **Menu → 🎫 Tickets**: save already-purchased tickets/bookings with type
(transport, entry, lodging, event), title, provider, code/PNR, date and time, price,
notes, and an updatable status (booked → paid → used, or expired/cancelled).

<img src="docs/guide-images/10-tickets.png" width="360" alt="Ticket vault with one saved ticket and the add-new form">

It's separate from **📅 Book**, which is where you find direct booking links
(TableCheck, Tabelog, website, phone) for restaurants/POIs that have them — two
different things: ready-to-use external links vs. tickets you've already bought.

<img src="docs/guide-images/11-bookings.png" width="360" alt="Book panel with booking links for POIs">

### Shopping

From **Menu → 🛍️ Shopping**: a list of shops (regular and vintage/second-hand) near
your stops, with a direct link to Google Maps (and Apple Maps on iPhone).

<img src="docs/guide-images/12-shopping.png" width="360" alt="Shopping panel with a list of shops">

## 10. Discovery and organization

### Trip timeline

From **Menu → 🗓️ Trip timeline**: every day in chronological order, with a "TODAY"
badge on the current day and a countdown to the next stop — meant to be checked
quickly while you're out and about.

<img src="docs/guide-images/20-timeline.png" width="360" alt="Day-by-day trip timeline">

### Free-time suggestions

From **Menu → ✨ Free-time suggestions**: analyzes gaps in your itinerary and
proposes nearby POIs to fill them.

<img src="docs/guide-images/21-itin-suggest.png" width="360" alt="Free-time suggestions">

### Search anywhere

**The way to add a place whose name you know but you don't know where it is
geographically.** From **Menu → 🔍 Search anywhere**: a single search field across
every available place (by name, category, city), to jump straight to its detail
without having to scroll/zoom the map to find it. From there the flow is the same as
[§4](#4-place-detail)/[§5](#5-building-an-itinerary): the card opens with any
available photos, and **➕ Add to itinerary** puts it in your personal itinerary — to
have it show up in the group one too, share it from there
([§8](#8-group-and-collaboration)).

<img src="docs/guide-images/22-global-search.png" width="360" alt="Global search">

### GF Heatmap

From **Menu → 🔥 GF Heatmap**: shows on the map where reported gluten-free places are
concentrated, useful for choosing which area to head to.

<img src="docs/guide-images/19-gf-heatmap.png" width="360" alt="Gluten-free places heatmap">

### Suggest places

From **Menu → 💡 Suggest places**: propose a new gluten-free place not yet in the
database, with automatic analysis if you have a photo of the menu.

<img src="docs/guide-images/27-gf-suggest.png" width="360" alt="Suggest a new gluten-free place">

### Gallery

From **Menu → 📸 Gallery**: trip photos saved on-device (not uploaded anywhere),
organizable with captions. Tap a photo to zoom in.

<img src="docs/guide-images/17-gallery.png" width="360" alt="Trip photo gallery">

### Trip tips

From **Menu → 🌸 Trip tips**: general practical trip advice.

<img src="docs/guide-images/18-tips.png" width="360" alt="Trip tips">

## 11. Practical tools

### 🆘 SOS

From **Menu → 🆘 SOS** (at the top of the menu, not by accident: it's meant to be
found fast in an emergency): local emergency number with quick copy, a pre-translated
emergency phrase to show a waiter or doctor ("I'm celiac, I can't eat bread/wheat"),
a downloadable multilingual allergy card, and the address/phone of the area's main
hospital.

<img src="docs/guide-images/08-sos.png" width="360" alt="SOS screen with emergency number, multilingual phrase, and hospital">

### Is the JR Pass worth it?

From **Menu → 🚄 Is the JR Pass worth it?** (Japan trips only): based on the routes
already in your itinerary, calculates whether buying the Japan Rail Pass or
individual tickets is cheaper — with a savings/extra-cost estimate for each pass
duration.

<img src="docs/guide-images/24-jr-pass.png" width="360" alt="JR Pass calculator with cost comparison">

### Japan calendar

From **Menu → 📅 Japan calendar** (Japan trips only): holidays and notable days
falling within your trip dates (e.g. Golden Week), useful for anticipating crowds and
closures.

<img src="docs/guide-images/25-japan-cal.png" width="360" alt="Japan holiday calendar">

### AI Assistant

From **Menu → 🤖 AI Assistant**: AI-assisted analysis of a menu or a gluten-free
question, for when automatic search isn't enough.

<img src="docs/guide-images/26-groq-ai.png" width="360" alt="AI assistant for gluten-free analysis">

### Stop reminders

From **Menu → 🔔 Stop reminders**: turns on notifications that alert you a bit before
each planned stop's time.

<img src="docs/guide-images/23-reminders.png" width="360" alt="Reminders for itinerary stops">

### Backup & Restore

From **Menu → 📦 Backup & Restore**: export all your data (itinerary, budget,
tickets, checklist, expenses) to a file — essential if you switch phones.

<img src="docs/guide-images/28-backup.png" width="360" alt="Data backup and restore">

### Download for offline

From **Menu → 📥 Download for offline**: pre-download a region's map tiles so you can
view them without a connection.

<img src="docs/guide-images/29-offline.png" width="360" alt="Download a region for offline use">

### Battery saver

From **Menu → 🔋 Battery saver**: a toggle that turns off animations and heavy visual
effects to save battery during the trip — useful on long days away from a charger.

## 12. Offline and installing as an app

Tabi is a PWA: you can install it on your Home Screen (Safari on iPhone: Share → "Add
to Home Screen"; Chrome on Android: menu → "Install app"). Once installed, it also
works **offline** for anything you've already planned (itinerary, budget, saved
tickets) — useful on a plane or in areas without coverage. Searching new places,
photos, and gluten-free analysis require a connection (they depend on external
services).

## 13. Light/dark theme

The app **has no in-app theme switch**: it always follows your phone/browser's
setting (light or dark). To change it, use your system settings, not Tabi.

## 14. FAQ

**Do I need to create an account?** No, never. Everything stays on your device.

**What happens if I switch phones?** From **Menu → 📦 Backup & Restore** you export
all your data to a file, then import it on the new device.

**Are the travel times reliable?** They're estimates (based on straight-line distance
and average speed for the chosen mode, or Google Maps when available) — useful for
gauging whether a day holds together, not an official public-transit schedule.

**Does the app cost anything?** The app itself is free. Some features (place search,
photos, gluten-free AI analysis) depend on paid external services managed
server-side by the app's operator — if the quota runs out, those features degrade to
local estimates instead of disappearing entirely.

**Why does an "Errors (debug)" menu item never show up?** It's a development-only
feature, visible only with `window.DEBUG` on — not meant for normal use.
