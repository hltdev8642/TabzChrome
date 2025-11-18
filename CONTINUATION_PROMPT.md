# Continuation Prompt - TabzChrome Profiles System

## 📍 Current Status

You're in the middle of implementing a **Windows Terminal-style profiles system** for TabzChrome. The project is being simplified from a complex Commands panel approach to a clean, profile-based system.

### ✅ What's Done

1. **Profiles Infrastructure Complete**
   - `Profile` interface defined in `extension/components/SettingsModal.tsx`
   - `profiles.json` created with 4 default profiles (Default, Projects, Large Text, Light Mode)
   - Auto-loads default profiles on first run from `profiles.json`
   - Saves user-edited profiles to Chrome storage
   - Profile handlers implemented (add, edit, delete)
   - `manifest.json` updated to include `profiles.json` as web resource

2. **Simplified UI Complete**
   - Removed Commands panel and spawn options
   - Windows Terminal-style header with clean layout
   - Tab close buttons (X) working with hover-to-show
   - Live settings updates (no extension reload needed)

3. **Backend Running**
   - Server on port 8129
   - WebSocket communication working
   - Terminals spawning successfully

### 🚧 What's Left to Do

**You need to complete 4 tasks to finish the profiles system:**

## Task 1: Update Profiles Tab UI in Settings Modal

**File:** `extension/components/SettingsModal.tsx`

**Current State:**
- The modal still has references to "Spawn Options" tab
- Profile handlers are implemented but UI isn't rendering them
- Need to replace the entire Spawn Options JSX with Profiles JSX

**What to Do:**
1. Find the tab button that says `"Spawn Options"` and change it to `"Profiles"`
2. Update `activeTab === 'spawn-options'` checks to `activeTab === 'profiles'`
3. Replace the Spawn Options content area with:
   - Profile list (showing all profiles with edit/delete buttons)
   - "Add Profile" button
   - Profile form (when adding/editing):
     - Profile ID (text input, auto-generated from name)
     - Profile Name (text input)
     - Working Directory (text input, default: `~`)
     - Font Size (slider, 12-24px)
     - Font Family (dropdown, same as General tab)
     - Theme (toggle, dark/light)
   - Default profile selector (radio buttons or dropdown)
4. Wire up existing handlers:
   - `handleAddProfile()` - for save button
   - `handleEditProfile(index)` - for edit button
   - `handleDeleteProfile(index)` - for delete button
   - `handleCancelEdit()` - for cancel button

**Important:** The handlers are already implemented! You just need to create the JSX that calls them.

---

## Task 2: Add "+" Button in Tab Bar

**File:** `extension/sidepanel/sidepanel.tsx`

**Current State:**
- Tab bar shows tabs but no "+" button
- Tab bar is around line 307-332

**What to Do:**
1. After the `sessions.map()` that renders tabs, add a **"+" button**
2. The button should:
   - Be styled like a tab but with just a "+" icon
   - Call a new `handleSpawnDefaultProfile()` function
   - Load default profile ID from Chrome storage
   - Spawn a terminal with that profile's settings

**Example structure:**
```tsx
{sessions.map(session => (
  // existing tab code
))}
{/* ADD THIS: */}
<button
  onClick={handleSpawnDefaultProfile}
  className="flex items-center justify-center px-3 py-1.5 rounded-md..."
  title="New tab (default profile)"
>
  <Plus className="h-4 w-4" />
</button>
```

**New function to add:**
```typescript
const handleSpawnDefaultProfile = () => {
  chrome.storage.local.get(['profiles', 'defaultProfile'], (result) => {
    const defaultProfileId = result.defaultProfile || 'default'
    const profile = result.profiles?.find(p => p.id === defaultProfileId)

    if (profile) {
      sendMessage({
        type: 'SPAWN_TERMINAL',
        spawnOption: 'bash',
        name: profile.name,
        workingDir: profile.workingDir,
        profile: profile // Pass entire profile
      })
    }
  })
}
```

---

## Task 3: Add Dropdown to "New Tab" Button

**File:** `extension/sidepanel/sidepanel.tsx`

**Current State:**
- "New Tab" button is a simple button (line ~316-324)
- Just spawns hardcoded bash

**What to Do:**
1. Add state for dropdown visibility: `const [showProfileDropdown, setShowProfileDropdown] = useState(false)`
2. Load profiles from Chrome storage into state: `const [profiles, setProfiles] = useState<Profile[]>([])`
3. Change "New Tab" button to have a dropdown arrow
4. Add dropdown menu that shows all profiles
5. Clicking a profile spawns a terminal with that profile's settings

**Example structure:**
```tsx
<div className="relative">
  <button
    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
    className="flex items-center gap-1.5..."
  >
    <Plus className="h-4 w-4" />
    <span>New Tab</span>
    <ChevronDown className="h-3 w-3" />
  </button>

  {showProfileDropdown && (
    <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border rounded...">
      {profiles.map(profile => (
        <button
          key={profile.id}
          onClick={() => handleSpawnProfile(profile)}
          className="w-full px-4 py-2 text-left hover:bg-white/10..."
        >
          {profile.name}
        </button>
      ))}
    </div>
  )}
</div>
```

**New function:**
```typescript
const handleSpawnProfile = (profile: Profile) => {
  sendMessage({
    type: 'SPAWN_TERMINAL',
    spawnOption: 'bash',
    name: profile.name,
    workingDir: profile.workingDir,
    profile: profile
  })
  setShowProfileDropdown(false)
}
```

---

## Task 4: Update Terminal Component to Use Profile Settings

**File:** `extension/components/Terminal.tsx`

**Current State:**
- Receives fontSize, fontFamily, theme as props
- These come from global settings, not profile-specific

**What to Do:**
1. When spawning a terminal with a profile, pass the profile settings
2. Terminal component should use profile settings over global settings
3. Update `sidepanel.tsx` line ~338-342 where Terminal is rendered:

```tsx
<Terminal
  terminalId={session.id}
  sessionName={session.name}
  terminalType={session.type}
  fontSize={session.profile?.fontSize || terminalSettings.fontSize}
  fontFamily={session.profile?.fontFamily || terminalSettings.fontFamily}
  theme={session.profile?.theme || terminalSettings.theme}
  onClose={...}
/>
```

**Backend Update (Optional):**
If you want working directory to actually work, update `extension/background/background.ts` line ~163:

```typescript
workingDir: message.cwd || message.profile?.workingDir || '~',
```

---

## 🎯 Testing Checklist

After completing all 4 tasks:

1. ✅ Open Settings → Profiles tab shows profile list
2. ✅ Add a new profile → Saves to Chrome storage
3. ✅ Edit a profile → Updates correctly
4. ✅ Delete a profile → Removes from list
5. ✅ Set default profile → Saved correctly
6. ✅ Click "+" in tab bar → Spawns default profile terminal
7. ✅ Click "New Tab" dropdown → Shows all profiles
8. ✅ Select profile from dropdown → Spawns with correct settings
9. ✅ Terminal uses profile's font size/family/theme
10. ✅ Working directory from profile is applied (if backend updated)

---

## 📁 Key Files

- `extension/components/SettingsModal.tsx` - Profiles tab UI (Task 1)
- `extension/sidepanel/sidepanel.tsx` - Tab bar + dropdown (Tasks 2 & 3)
- `extension/components/Terminal.tsx` - Profile settings (Task 4)
- `extension/profiles.json` - Default profiles (already done)
- `extension/background/background.ts` - Backend communication (optional for working dir)

---

## 🚀 Quick Start Commands

```bash
# Rebuild extension
cd /home/matt/projects/TabzChrome-simplified
npm run build:extension

# Deploy to Windows (for Chrome)
rsync -av --delete dist-extension/ /mnt/c/Users/marci/Desktop/TabzChrome-simplified/dist-extension/

# Start backend (if not running)
cd backend
PORT=8129 node server.js
```

Then reload extension in Chrome: `chrome://extensions` → 🔄

---

## 💡 Tips

- **Test incrementally** - Complete Task 1, rebuild, test. Then Task 2, etc.
- **Check console logs** - Settings modal logs profile operations
- **Profiles in storage** - Check `chrome://extensions` → TabzChrome → Inspect views: service worker → Application → Storage → Local Storage
- **Copy existing patterns** - Look at how General tab is structured for the Profiles tab
- **Don't overthink** - The handlers are done, you're just building UI

---

## 🎨 Design Notes

Follow Windows Terminal patterns:
- Clean, minimal UI
- Profiles listed vertically with edit/delete icons
- Form below the list or in a modal
- Dropdown menus appear below buttons
- Hover states for all interactive elements

---

**Good luck! The hardest part (infrastructure) is done. Now it's just UI wiring.** 🚀
