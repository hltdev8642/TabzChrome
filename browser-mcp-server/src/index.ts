#!/usr/bin/env node
/**
 * Browser MCP Server
 *
 * Provides tools for Claude to interact with browser console and pages
 * via the TabzChrome extension and Chrome DevTools Protocol (CDP).
 *
 * Tools:
 * - browser_get_console_logs: Get console logs from browser
 * - browser_execute_script: Execute JavaScript in browser tab
 * - browser_get_page_info: Get current page URL and title
 * - browser_screenshot: Capture screenshots to local disk
 * - browser_download_image: Download images from pages
 * - browser_list_tabs: List all open browser tabs
 * - browser_switch_tab: Switch to a specific tab
 * - browser_click: Click an element on the page
 * - browser_fill: Fill an input field with text
 * - browser_get_element: Get element HTML, styles, bounds for CSS debugging
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerConsoleTools } from "./tools/console.js";
import { registerScriptTools } from "./tools/script.js";
import { registerPageTools } from "./tools/page.js";
import { registerScreenshotTools } from "./tools/screenshot.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerInteractionTools } from "./tools/interaction.js";
import { registerInspectionTools } from "./tools/inspection.js";

// Backend URL (TabzChrome backend running in WSL)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8129";

// Create MCP server instance
const server = new McpServer({
  name: "browser-mcp-server",
  version: "1.0.0"
});

// Register all tools
registerConsoleTools(server, BACKEND_URL);
registerScriptTools(server, BACKEND_URL);
registerPageTools(server, BACKEND_URL);
registerScreenshotTools(server);
registerTabTools(server);
registerInteractionTools(server);
registerInspectionTools(server);

// Main function
async function main() {
  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("Browser MCP server running via stdio");
  console.error(`Backend URL: ${BACKEND_URL}`);
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
