import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "about_tunevio",
  title: "About Tunevio / BWF Network",
  description:
    "Return a short description of Tunevio (BWF Network) — the music, media, and creator platform this MCP server exposes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: "Tunevio (BWF Network) is a music, streaming, and creator platform for artists, DJs, podcasters, and fans. This MCP server exposes public directory and discovery tools.",
      },
    ],
  }),
});