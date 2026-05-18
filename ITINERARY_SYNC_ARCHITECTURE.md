# Itinerary-Group Synchronization Architecture
**Status**: Design Phase | **Model**: Hybrid Bidirectional Sync with Member Attribution  
**Decisions**: Option C (Hybrid) + Option B (Any member edits) + Member tracking + In-place UI + Immediate reflect

---

## 1. State Structure Extensions

### Current Structure (What We Have)
```javascript
state.itinerary = [];              // Personal itinerary
state.groupItineraries = {};       // Group-specific itineraries by ID
state.group = {
  roomId: 'ABC123',
  myName: 'Marco',
  members: [{name, role, lastHeartbeat}],
  // ... other fields
};
```

### New Extensions Required

#### 1.1 Itinerary Sharing Metadata
```javascript
state.itinerarySharing = {
  // Track which groups have access to which itineraries
  'my_itin_id_1': {
    owner: 'Marco',           // Person who created/shared it
    sharedWith: [
      { groupId: 'ABC123', sharedAt: timestamp, sharedBy: 'Marco' },
      { groupId: 'XYZ789', sharedAt: timestamp, sharedBy: 'Marco' }
    ]
  }
};
```

#### 1.2 Extended Itinerary Object (Personal + Group)
```javascript
// state.itinerary[i] OR state.groupItineraries[groupId].pois[i]
{
  id: 'poi_uuid',
  name: 'Restaurant Name',
  lat: 35.6762,
  lng: 139.7674,
  city: 'Tokyo',
  type: 'food',
  date: '2027-05-15',
  // NEW: Audit trail
  audit: {
    createdAt: timestamp,
    createdBy: 'Marco',
    lastModifiedAt: timestamp,
    lastModifiedBy: 'Giulia',
    modificationHistory: [
      { action: 'added', by: 'Marco', at: timestamp },
      { action: 'reordered', by: 'Giulia', at: timestamp },
      { action: 'note_updated', by: 'Marco', note: 'Good gluten-free options', at: timestamp }
    ]
  }
}
```

#### 1.3 Shared Itinerary Instance (in groupItineraries)
```javascript
state.groupItineraries['group_ABC123_shared_itin'] = {
  id: 'group_ABC123_shared_itin',
  groupId: 'ABC123',
  owner: 'Marco',              // Original owner
  originItineraryId: 'my_itin_id_1',  // Link back to personal version
  pois: [/* same structure as above */],
  syncStatus: 'synced',        // 'syncing' | 'synced' | 'conflict'
  lastSyncAt: timestamp,
  lastSyncedBy: 'Giulia',
  // Sync metadata
  vectorClock: {
    'Marco': 5,
    'Giulia': 3,
    'Luca': 2
  }
};
```

---

## 2. MQTT Message Format Extensions

### Current Types
- `gps`: Location broadcast
- `group_sync`: Member list sync
- `groupchat`: Chat message

### New Types for Itinerary Sync

#### 2.1 Share Itinerary with Group
```javascript
{
  type: 'itinerary_share',
  from: 'Marco',
  ts: Date.now(),
  payload: {
    originItineraryId: 'my_itin_id_1',
    groupId: 'ABC123',
    itinerary: {
      id: 'my_itin_id_1',
      pois: [{...}, {...}],
      // All fields
    }
  }
}
// Broadcast to: giap2027v2/ABC123
```

#### 2.2 Add/Remove/Reorder Tappa in Shared Itinerary
```javascript
{
  type: 'itinerary_edit',
  from: 'Giulia',
  ts: Date.now(),
  payload: {
    groupId: 'ABC123',
    itineraryId: 'group_ABC123_shared_itin',
    originItineraryId: 'my_itin_id_1',  // Link back
    action: 'add' | 'remove' | 'reorder' | 'update_note',
    tappId: 'poi_uuid',  // Which tappa affected
    data: {
      // Varies by action
      // For 'add': { poi: {...} }
      // For 'remove': { }
      // For 'reorder': { newPosition: 3 }
      // For 'update_note': { note: 'Good food' }
    },
    vectorClock: {
      'Giulia': 4,
      'Marco': 5
    }
  }
}
// Broadcast to: giap2027v2/ABC123
```

#### 2.3 Sync Itinerary to Personal After Group Edit
```javascript
{
  type: 'itinerary_sync_personal',
  from: 'system',  // Or from the group
  ts: Date.now(),
  payload: {
    originItineraryId: 'my_itin_id_1',
    groupId: 'ABC123',
    itinerary: {/* full updated itinerary */},
    fromMember: 'Giulia'
  }
}
// Sent to: The person who owns the itinerary
```

---

## 3. Synchronization Logic

### 3.1 Bidirectional Flow

```
┌─────────────────────────────────────┐
│   Personal Itinerary (state.itinerary)       │
│   - Add tappa Marco                 │
└────────────┬────────────────────────┘
             │ (broadcast 'itinerary_edit')
             │
             ▼
┌─────────────────────────────────────┐
│  MQTT: giap2027v2/ABC123            │
│  (everyone in room receives)        │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Giulia's:    │  │ Luca's:      │
│ Group version│  │ Group version│
│ (updates)    │  │ (updates)    │
└──────────────┘  └──────────────┘
    │ (broadcast 'itinerary_edit' if Giulia edits)
    │
    ▼
┌─────────────────────────────────────┐
│   Marco's Group Version            │
│   state.groupItineraries['group...']│
└────────────┬────────────────────────┘
             │ (if origin owner: sync back)
             │
             ▼
┌─────────────────────────────────────┐
│   Marco's Personal Itinerary       │
│   (auto-updates)                    │
└─────────────────────────────────────┘
```

### 3.2 Change Propagation Strategy

**When personal itinerary is edited:**
1. Update `state.itinerary[i]`
2. Check if this itinerary is shared with any groups
3. For each shared group:
   - Update `state.groupItineraries[groupId]` matching tappa
   - Broadcast `itinerary_edit` message to room
   - Update audit trail with member name
   - Set `syncStatus = 'syncing'` → 'synced'

**When group itinerary is edited by ANY member:**
1. Update `state.groupItineraries[groupId][action]`
2. Broadcast `itinerary_edit` to all group members
3. If this itinerary was shared from someone:
   - Send `itinerary_sync_personal` back to origin owner
   - Origin owner's personal itinerary auto-updates
4. Update audit trail

**Conflict Resolution (Last-Write-Wins):**
- Vector clock per member: `{ Marco: 5, Giulia: 3, Luca: 2 }`
- On concurrent edits: Keep edit with highest timestamp
- Member tracking preserves who made the "winning" change
- Show in UI: "Last updated by Giulia 2 min ago"

---

## 4. UI/UX Changes

### 4.1 Tappe Tab: Share Controls (in itinerary display area)

**Current Location**: renderItineraryView() → Within the itinerary panel

**New Section to Add**:
```html
<!-- SHARING SECTION -->
<div style="padding:12px; background:rgba(...); border-radius:8px; margin-bottom:12px;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
    <span style="font-weight:700; color:#FF1493;">📤 Condividi con Gruppo</span>
    <span id="sync-status" style="font-size:11px; color:#888;">Sincronizzato</span>
  </div>
  
  <!-- List of groups this itinerary is shared with -->
  <div id="shared-with-list" style="margin-bottom:8px;">
    <!-- Dynamic: shows groups like "🔵 ABC123 (Marco, Giulia, Luca)" -->
  </div>
  
  <!-- Share with new group -->
  <div style="display:flex; gap:8px;">
    <select id="group-select" style="flex:1;">
      <option value="">-- Seleziona gruppo --</option>
      <!-- Populated from state.group.roomId if connected -->
    </select>
    <button id="share-btn" style="padding:8px 12px; background:#FF1493; color:white; border:none; border-radius:6px;">
      ✓ Condividi
    </button>
  </div>
  
  <!-- Audit log: Show who edited what -->
  <div id="audit-log" style="margin-top:8px; font-size:11px; max-height:120px; overflow-y:auto;">
    <!-- Marco aggiunse Tsukiji Market - 5 min fa -->
    <!-- Giulia riordinò tappe - 2 min fa -->
  </div>
</div>
```

### 4.2 Gruppo Tab: View/Edit Shared Itinerary

**New Section in renderGroupView()** (after members list):
```html
<!-- SHARED ITINERARY SECTION -->
<div style="margin-top:16px; padding:12px; background:rgba(...); border-radius:8px;">
  <h3 style="margin:0 0 8px 0; font-weight:700;">🗺️ Itinerario Condiviso</h3>
  
  <!-- If itinerary is shared -->
  <div id="group-itinerary-display">
    <!-- Shows: "Condiviso da Marco" -->
    <!-- List of tappe with member attribution -->
    <!-- Edit buttons (add, remove, reorder) -->
    <!-- Audit trail showing who did what -->
  </div>
  
  <!-- If no itinerary shared yet -->
  <div id="no-itinerary-msg" style="color:#888; font-size:13px;">
    Nessun itinerario condiviso nel gruppo
  </div>
</div>
```

### 4.3 Member Attribution in UI
```html
<!-- In both tappe and gruppo views -->
<div style="display:flex; justify-content:space-between; align-items:center; padding:8px;">
  <span>🍱 Tsukiji Market</span>
  <span style="font-size:11px; color:#888;">Aggiunto da Marco • 3 min fa</span>
</div>

<!-- Hover/click shows full audit trail -->
<div title="Cronologia: Aggiunto da Marco 3 min fa | Riordinato da Giulia 1 min fa">
  📝 Vedi storia
</div>
```

---

## 5. Implementation Sequence

### Phase 1: State & Data Structure (no UI changes yet)
1. ✅ Extend state object with `itinerarySharing` and `audit` fields
2. ✅ Update existing `mergeGroupItinerary()` to preserve audit trail
3. ✅ Create helper: `addItineraryToAudit(member, action, timestamp)`
4. ✅ Create helper: `getSharedGroups(itineraryId)` - returns list of groups
5. ✅ Create helper: `isItinerarySharedWithGroup(itineraryId, groupId)` - boolean

### Phase 2: MQTT Message Handling
1. ✅ Update firebase-rtdb.js to handle `itinerary_share` message type
2. ✅ Update firebase-rtdb.js to handle `itinerary_edit` message type
3. ✅ Update firebase-rtdb.js to handle `itinerary_sync_personal` message type
4. ✅ Implement vector clock merge in `mergeGroupItinerary()`
5. ✅ Add conflict logging to audit trail

### Phase 3: UI - Tappe Tab (Share Controls)
1. ✅ Add sharing section to `renderItineraryView()`
2. ✅ Populate group selector from open groups
3. ✅ Implement "Share" button → creates group version, broadcasts
4. ✅ Add audit log display below share controls
5. ✅ Add sync status indicator

### Phase 4: UI - Gruppo Tab (View/Edit)
1. ✅ Add "Shared Itinerary" section to `renderGroupView()`
2. ✅ Display shared itinerary with member attribution
3. ✅ Implement edit buttons (add, remove, reorder) with full sync
4. ✅ Add audit trail showing group member actions

### Phase 5: Bidirectional Sync Logic
1. ✅ When personal itinerary edited: sync to all shared groups
2. ✅ When group itinerary edited: sync back to owner's personal version
3. ✅ Implement Vector Clock for concurrent edit resolution
4. ✅ Add debouncing to prevent message spam

### Phase 6: Testing & Polish
1. ✅ Test: Create group → share itinerary → verify sync
2. ✅ Test: Edit in tappe tab → check groups see it
3. ✅ Test: Edit in gruppo tab → check personal tab updates
4. ✅ Test: Concurrent edits → verify audit trail integrity
5. ✅ Polish: Error handling, toast notifications, loading states

---

## 6. Code Integration Points

### In index.html (main renderItineraryView):
- Add `<div id="sharing-section">` with share controls
- Call `renderItineraryAuditLog()` helper
- Attach click handlers to share/edit buttons

### In index.html (renderGroupView):
- Add `<div id="group-itinerary-display">` after members list
- Render shared itinerary if `state.groupItineraries[groupId]` exists
- Attach edit handlers

### In firebase-rtdb.js (handleIncoming):
- Add case `'itinerary_share'`: create group version
- Add case `'itinerary_edit'`: apply edit with conflict resolution
- Add case `'itinerary_sync_personal'`: sync back to owner

### New helper functions (in index.html or separate):
- `shareItineraryWithGroup(itineraryId, groupId)`
- `editSharedItinerary(groupId, tappId, action, data)`
- `syncSharedChangesToPersonal(itineraryId, groupId)`
- `renderItineraryAuditLog(itinerary)` - UI for audit trail
- `mergeVectorClocks(local, remote)` - CRDT merge

---

## 7. Expected Behavior After Implementation

### User Flow 1: Share Personal Itinerary
```
Marco (in Tappe tab):
1. Has itinerary: [Tsukiji, Senso-ji, Shibuya]
2. Clicks "Condividi con Gruppo" → selects "ABC123" group
3. Clicks "✓ Condividi"
4. Toast: "✅ Itinerario condiviso con ABC123"
5. Audit log shows: "Condiviso da Marco ora"

Giulia (in Gruppo tab, same room ABC123):
1. Sees "🗺️ Itinerario Condiviso (Marco)"
2. List shows: Tsukiji, Senso-ji, Shibuya
3. Each shows: "Aggiunto da Marco 30 secondi fa"
```

### User Flow 2: Group Member Edits
```
Giulia (in Gruppo tab):
1. Clicks "+ Aggiungi" on shared itinerary
2. Adds "Tokyo Tower"
3. System broadcasts: { type: 'itinerary_edit', action: 'add', from: 'Giulia' }

Marco (auto-update):
1. His personal itinerary immediately updates: [..., Tokyo Tower]
2. Toast: "✅ Giulia ha aggiunto Tokyo Tower al vostro itinerario"
3. Audit log shows: "Tokyo Tower aggiunto da Giulia 10 secondi fa"

Luca (same group, in Gruppo tab):
1. Sees new tappa: "Tokyo Tower (Aggiunto da Giulia 5 sec fa)"
```

### User Flow 3: Concurrent Edits (Conflict)
```
Marco (Tappe tab) - Same time:
1. Adds "Meiji Shrine" to personal itinerary
2. Broadcasts to group ABC123

Giulia (Gruppo tab) - Same time:
1. Reorders tappe in shared itinerary
2. Broadcasts to group ABC123

Resolution (Vector Clock):
- Marco's edit: {Marco: 6, Giulia: 3, Luca: 1}
- Giulia's edit: {Marco: 5, Giulia: 4, Luca: 1}
- Winner: Marco's (higher clock value)
- Giulia's reorder is abandoned (can be logged as "conflict-skipped")
- Audit trail notes: "Giulia tentò riordinamento ma Marco modificava simultaneamente"
```

---

## 8. Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| Member A offline during share | Message queued in MQTT, delivered when online |
| Network split in room | Each group continues syncing. On reconnect, CRDT merge resolves |
| Owner deletes personal itinerary | Question: Keep group version? Or delete all shares? |
| Member leaves group | Keep shared itinerary; show "Left" next to their edits |
| Same itinerary shared with 2 groups | Each group has independent `groupItineraries[id]`. Edits in one DON'T sync to other |
| User modifies both personal AND group version simultaneously | CRDT resolves; whichever has highest vector clock wins |

---

## 9. Performance Considerations

- **Vector Clock**: Store only 1 entry per active group member (auto-prune after 1 hour)
- **Audit Trail**: Keep last 50 entries per itinerary (prune on save)
- **Debounce**: Don't broadcast until 500ms after last edit
- **localStorage**: Audit data compresses well; test with 150+ itineraries

---

## 10. Success Criteria

✅ User can share personal itinerary with open groups  
✅ Shared itinerary visible in group chat tab  
✅ Any group member can edit; all see changes in real-time  
✅ Personal itinerary auto-updates when group members edit  
✅ Audit trail shows WHO did WHAT and WHEN  
✅ Concurrent edits resolved via vector clock (no data loss)  
✅ Sync status indicator shows "Synced" or "Syncing"  
✅ Zero manual refresh needed (all automatic)

---

## Questions for User Before Proceeding

1. **Owner deletion**: If Marco shares itinerary with group ABC123, then deletes it from his personal itinerary, should the group version persist or be deleted too?
2. **Permission to unshare**: Can only owner unshare? Or any member?
3. **Notification**: When someone else edits, should we show a toast in their personal tab?
4. **History depth**: Keep last 50 audit entries or full history?

