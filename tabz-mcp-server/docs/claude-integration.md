# Claude Integration

Tools for terminal profiles and Claude Code plugins.

*Part of the [Tabz MCP Tools](../MCP_TOOLS.md) reference.*

---

## tabz_list_profiles

**Purpose:** List terminal profiles configured in TabzChrome.

**Trigger phrases:**
- [List profiles](tabz:paste?text=List%20profiles)
- [What profiles are available?](tabz:paste?text=What%20profiles%20are%20available%3F)
- [Show AI assistant profiles](tabz:paste?text=Show%20AI%20assistant%20profiles)

**Parameters:**
- `category` (optional): Filter by category name (e.g., "AI Assistants", "TUI Tools")
- `response_format`: `markdown` (default) or `json`

**Returns (JSON format):**
```json
{
  "total": 62,
  "filtered": 11,
  "defaultProfileId": "claude",
  "globalWorkingDir": "~/projects",
  "profiles": [
    {
      "id": "claude-worker",
      "name": "Claude Worker",
      "category": "AI Assistants",
      "command": "claude",
      "themeName": "matrix"
    }
  ]
}
```

**Examples:**
```javascript
// List all profiles
{}

// Filter by category
{ category: "AI Assistants" }

// Get JSON format
{ response_format: "json" }
```

**Notes:**
- Use `tabz_list_categories` first to see available category names
- Profile IDs can be used with `/api/agents` endpoint for spawning

---

## tabz_list_categories

**Purpose:** List all profile categories in TabzChrome.

**Trigger phrases:**
- [List categories](tabz:paste?text=List%20categories)
- [What profile categories exist?](tabz:paste?text=What%20profile%20categories%20exist%3F)

**Parameters:**
- `response_format`: `markdown` (default) or `json`

**Returns (JSON format):**
```json
{
  "total": 62,
  "categories": [
    "AI Assistants",
    "TUI Tools",
    "Git Tools",
    "NoCommand"
  ]
}
```

**Notes:**
- Use categories with `tabz_list_profiles` to filter profiles
- Categories are user-defined in profile settings

---

## tabz_list_plugins

**Purpose:** List installed Claude Code plugins with their status.

**Trigger phrases:**
- [List plugins](tabz:paste?text=List%20plugins)
- [Show installed plugins](tabz:paste?text=Show%20installed%20plugins)
- [What plugins are enabled?](tabz:paste?text=What%20plugins%20are%20enabled%3F)

**Parameters:**
- `marketplace` (optional): Filter by marketplace name (e.g., "my-plugins")
- `enabled` (optional): Filter by enabled status (true/false)

**Returns:**
- Plugins grouped by marketplace with enabled status, version, and components

---

## tabz_list_skills

**Purpose:** List available skills from enabled plugins.

**Trigger phrases:**
- [List skills](tabz:paste?text=List%20skills)
- [What skills are available?](tabz:paste?text=What%20skills%20are%20available%3F)
- [Find browser skills](tabz:paste?text=Find%20browser%20skills)

**Parameters:**
- `plugin` (optional): Filter by plugin name (e.g., "conductor")
- `search` (optional): Search skills by name/description

**Returns:**
- Skills with ID, name, description, and source plugin

---

## tabz_get_skill

**Purpose:** Get full details and SKILL.md content for a specific skill.

**Trigger phrases:**
- [Show skill details](tabz:paste?text=Show%20skill%20details)
- [Get conductor:brainstorm skill](tabz:paste?text=Get%20conductor%3Abrainstorm%20skill)

**Parameters:**
- `skillId` (required): Skill ID in format "/pluginName:skillName"

**Returns:**
- Skill metadata and full SKILL.md content

---

## tabz_plugins_health

**Purpose:** Check plugin health: outdated versions, cache size, marketplace status.

**Trigger phrases:**
- [Check plugin health](tabz:paste?text=Check%20plugin%20health)
- [Are any plugins outdated?](tabz:paste?text=Are%20any%20plugins%20outdated%3F)

**Parameters:** None

**Returns:**
- List of outdated plugins, cache size, and marketplace connectivity

---

## tabz_toggle_plugin

**Purpose:** Enable or disable a Claude Code plugin.

**Trigger phrases:**
- [Disable plugin](tabz:paste?text=Disable%20plugin)
- [Enable conductor plugin](tabz:paste?text=Enable%20conductor%20plugin)

**Parameters:**
- `pluginId` (required): Plugin ID in format "pluginName@marketplace"
- `enabled` (required): true to enable, false to disable

**Returns:**
- Success/failure with message to run /restart

---
