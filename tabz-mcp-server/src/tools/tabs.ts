/**
 * Tab Management Tools
 *
 * Tools for listing and switching between browser tabs
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTabs, switchTab, renameTab, getCurrentTabId } from "../client.js";
import { ResponseFormat } from "../types.js";

// Input schema for tabz_list_tabs
const ListTabsSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data")
}).strict();

type ListTabsInput = z.infer<typeof ListTabsSchema>;

// Input schema for tabz_switch_tab
const SwitchTabSchema = z.object({
  tabId: z.number()
    .int()
    .min(1)
    .describe("The Chrome tab ID to switch to. Get IDs from tabz_list_tabs (e.g., 1762556601).")
}).strict();

type SwitchTabInput = z.infer<typeof SwitchTabSchema>;

// Input schema for tabz_rename_tab
const RenameTabSchema = z.object({
  tabId: z.number()
    .int()
    .min(1)
    .describe("The Chrome tab ID to rename. Get IDs from tabz_list_tabs (e.g., 1762556601)."),
  name: z.string()
    .describe("The custom name to assign to this tab. Empty string clears the custom name.")
}).strict();

type RenameTabInput = z.infer<typeof RenameTabSchema>;

/**
 * Register tab management tools with the MCP server
 */
export function registerTabTools(server: McpServer): void {
  // List tabs tool
  server.tool(
    "tabz_list_tabs",
    `List all open browser tabs with ACCURATE active tab detection.

Returns information about all non-chrome:// tabs currently open in the browser.
Uses Chrome Extension API to detect which tab the user actually has focused.

Args:
  - response_format: 'markdown' (default) or 'json'

Returns (JSON format):
  {
    "total": 3,
    "claudeCurrentTabId": 1762556601,
    "tabs": [
      { "tabId": 1762556600, "url": "...", "title": "...", "active": false },
      { "tabId": 1762556601, "url": "...", "title": "...", "active": true }
    ]
  }

Key fields:
  - tabId: Chrome's internal tab ID (large number like 1762556601)
  - active: TRUE on whichever tab the USER has focused in Chrome right now
  - claudeCurrentTabId: Which tab Claude will target for operations

The "active" field shows the user's ACTUAL focused tab. After calling this tool,
Claude's target is synced to match the user's active tab.

Examples:
  - List all tabs: (no args needed)
  - Get JSON format: response_format="json"

Use tabz_switch_tab with the tabId to switch to a specific tab.
Use tabz_rename_tab to assign stable custom names for easier identification.

Error Handling:
  - "Extension not available": Backend/WebSocket not connected - uses CDP fallback
  - Empty list: No web pages open (only chrome:// pages)`,
    ListTabsSchema.shape,
    async (params: ListTabsInput) => {
      try {
        const result = await listTabs();

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true
          };
        }

        // Get Claude's current target tab
        const claudeCurrentTab = getCurrentTabId();

        let resultText: string;
        if (params.response_format === ResponseFormat.JSON) {
          resultText = JSON.stringify({
            total: result.tabs.length,
            claudeCurrentTabId: claudeCurrentTab,
            tabs: result.tabs
          }, null, 2);
        } else {
          if (result.tabs.length === 0) {
            resultText = `# Browser Tabs

No web pages currently open.
Only chrome:// or extension pages are present.`;
          } else {
            const lines: string[] = [`# Browser Tabs (${result.tabs.length} open)`, ""];

            // Find the user's actual focused tab (from Chrome extension API)
            const userActiveTab = result.tabs.find(t => t.active);
            if (userActiveTab) {
              lines.push(`**User's focused tab:** ${userActiveTab.tabId} (${userActiveTab.customName || userActiveTab.title})`, "");
            }

            for (const tab of result.tabs) {
              const displayName = tab.customName || tab.title || "(no title)";

              // Show marker for user's ACTUAL focused tab (from Chrome extension)
              const marker = tab.active ? " ← ACTIVE" : "";
              lines.push(`## Tab ${tab.tabId}${marker}`);
              lines.push(`**Title:** ${displayName}`);
              if (tab.customName) {
                lines.push(`**Original Title:** ${tab.title || "(no title)"}`);
              }
              lines.push(`**URL:** ${tab.url}`);
              lines.push("");
            }
            lines.push("---");
            lines.push("- Use `tabz_switch_tab` with tabId (1-based) to switch tabs.");
            lines.push("- Use `tabz_rename_tab` to assign custom names for easy identification.");
            lines.push("- **Tip:** Rename tabs before switching to avoid confusion if tab order changes.");
            resultText = lines.join("\n");
          }
        }

        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Switch tab tool
  server.tool(
    "tabz_switch_tab",
    `Switch to a specific browser tab.

Brings the specified tab to the front/focus and sets it as Claude's current target
for subsequent operations (screenshots, clicks, fills, etc.).

Use tabz_list_tabs first to get available tab IDs.

Args:
  - tabId (required): Chrome tab ID from tabz_list_tabs (e.g., 1762556601)

Returns:
  - success: Whether the switch was successful
  - error: Error message if failed

Examples:
  - Switch to tab: tabId=1762556601 (use actual ID from tabz_list_tabs)

After switching, use tabz_get_page_info to confirm the current page.

BEST PRACTICE: Before switching between multiple tabs, use tabz_rename_tab to
assign custom names (e.g., "GitHub PR", "Dev Server", "Docs"). Custom names are
stored by URL and persist even if tab IDs change.

Error Handling:
  - "Invalid tab ID": tabId doesn't exist (use tabz_list_tabs to see valid IDs)
  - "Extension not available": Uses CDP fallback (less reliable)`,
    SwitchTabSchema.shape,
    async (params: SwitchTabInput) => {
      try {
        const result = await switchTab(params.tabId);

        let resultText: string;
        if (result.success) {
          resultText = `## Tab Switched

Successfully switched to tab ${params.tabId}. This tab is now Claude's current target.

All subsequent operations (screenshot, click, fill, etc.) will target this tab by default.

Use \`tabz_get_page_info\` to see the current page details, or \`tabz_list_tabs\` to see all tabs with the "← CURRENT" marker.`;
        } else {
          resultText = `## Tab Switch Failed

**Error:** ${result.error}

Use \`tabz_list_tabs\` to see available tab IDs and which one is currently targeted.`;
        }

        return {
          content: [{ type: "text", text: resultText }],
          isError: !result.success
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Rename tab tool
  server.tool(
    "tabz_rename_tab",
    `Assign a custom name to a browser tab.

Custom names make it easier to identify tabs when working with multiple pages.
Names are stored by URL, so they persist even if tab order changes.
Names are session-based and reset when the MCP server restarts.

RECOMMENDED: When working with multiple tabs, rename them first! This provides:
1. Stable identification even if tabs are opened/closed (names stay with URLs)
2. Clear visual feedback about which tab you're targeting
3. Better communication with the user about which tab you're working on

Args:
  - tabId (required): Chrome tab ID from tabz_list_tabs (e.g., 1762556601)
  - name (required): Custom name for the tab. Empty string clears the custom name.

Returns:
  - success: Whether the rename was successful
  - error: Error message if failed

Examples:
  - Name a tab: tabId=1762556601, name="GitHub PR"
  - Name dev server: tabId=1762556602, name="Dev Server (localhost:3000)"
  - Clear custom name: tabId=1762556601, name=""

After renaming, use tabz_list_tabs to see the updated names.

Error Handling:
  - "Invalid tab ID": tabId doesn't exist (use tabz_list_tabs to see valid IDs)`,
    RenameTabSchema.shape,
    async (params: RenameTabInput) => {
      try {
        const result = await renameTab(params.tabId, params.name);

        let resultText: string;
        if (result.success) {
          if (params.name.trim() === '') {
            resultText = `## Tab Name Cleared

Successfully cleared custom name for tab ${params.tabId}.

Use \`tabz_list_tabs\` to see the updated tab list.`;
          } else {
            resultText = `## Tab Renamed

Successfully renamed tab ${params.tabId} to "${params.name}".

Use \`tabz_list_tabs\` to see the updated tab list.`;
          }
        } else {
          resultText = `## Tab Rename Failed

**Error:** ${result.error}

Use \`tabz_list_tabs\` to see available tab IDs.`;
        }

        return {
          content: [{ type: "text", text: resultText }],
          isError: !result.success
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
