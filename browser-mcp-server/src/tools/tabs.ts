/**
 * Tab Management Tools
 *
 * Tools for listing and switching between browser tabs
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTabs, switchTab } from "../client.js";
import { ResponseFormat } from "../types.js";

// Input schema for browser_list_tabs
const ListTabsSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data")
}).strict();

type ListTabsInput = z.infer<typeof ListTabsSchema>;

// Input schema for browser_switch_tab
const SwitchTabSchema = z.object({
  tabId: z.number()
    .int()
    .min(0)
    .describe("The tab ID to switch to. Get available IDs from browser_list_tabs.")
}).strict();

type SwitchTabInput = z.infer<typeof SwitchTabSchema>;

/**
 * Register tab management tools with the MCP server
 */
export function registerTabTools(server: McpServer): void {
  // List tabs tool
  server.tool(
    "browser_list_tabs",
    `List all open browser tabs.

Returns information about all non-chrome:// tabs currently open in the browser.
Use this to discover available tabs before switching or targeting specific tabs.

Args:
  - response_format: 'markdown' (default) or 'json'

Returns:
  Array of tabs with:
  - tabId: Numeric ID for use with other tools
  - url: Full URL of the tab
  - title: Page title
  - active: Whether this tab is currently focused

Examples:
  - List all tabs: (no args needed)
  - Get JSON format: response_format="json"

Use browser_switch_tab with the tabId to switch to a specific tab.

Error Handling:
  - "CDP not available": Chrome not running with --remote-debugging-port=9222
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

        let resultText: string;
        if (params.response_format === ResponseFormat.JSON) {
          resultText = JSON.stringify({
            total: result.tabs.length,
            tabs: result.tabs
          }, null, 2);
        } else {
          if (result.tabs.length === 0) {
            resultText = `# Browser Tabs

No web pages currently open.
Only chrome:// or extension pages are present.`;
          } else {
            const lines: string[] = [`# Browser Tabs (${result.tabs.length} open)`, ""];
            for (const tab of result.tabs) {
              const activeMarker = tab.active ? " (active)" : "";
              lines.push(`## Tab ${tab.tabId}${activeMarker}`);
              lines.push(`**Title:** ${tab.title || "(no title)"}`);
              lines.push(`**URL:** ${tab.url}`);
              lines.push("");
            }
            lines.push("Use `browser_switch_tab` with tabId to switch tabs.");
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
    "browser_switch_tab",
    `Switch to a specific browser tab.

Brings the specified tab to the front/focus. Use browser_list_tabs first
to get available tab IDs.

Args:
  - tabId (required): The numeric tab ID to switch to

Returns:
  - success: Whether the switch was successful
  - error: Error message if failed

Examples:
  - Switch to first tab: tabId=0
  - Switch to third tab: tabId=2

After switching, use browser_get_page_info to confirm the current page.

Error Handling:
  - "Invalid tab ID": tabId doesn't exist (use browser_list_tabs to see valid IDs)
  - "CDP not available": Chrome not running with --remote-debugging-port=9222`,
    SwitchTabSchema.shape,
    async (params: SwitchTabInput) => {
      try {
        const result = await switchTab(params.tabId);

        let resultText: string;
        if (result.success) {
          resultText = `## Tab Switched

Successfully switched to tab ${params.tabId}.

Use \`browser_get_page_info\` to see the current page details.`;
        } else {
          resultText = `## Tab Switch Failed

**Error:** ${result.error}

Use \`browser_list_tabs\` to see available tab IDs.`;
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
