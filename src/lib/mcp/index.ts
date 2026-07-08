import { defineMcp } from "@lovable.dev/mcp-js";
import aboutTool from "./tools/about";
import listArtistsTool from "./tools/list-artists";

export default defineMcp({
  name: "tunevio-mcp",
  title: "Tunevio / BWF Network",
  version: "0.1.0",
  instructions:
    "Public tools for the Tunevio (BWF Network) platform. Use `about_tunevio` for context and `list_artists` to browse the public artist directory.",
  tools: [aboutTool, listArtistsTool],
});