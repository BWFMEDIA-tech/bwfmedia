import { auth, defineMcp } from "@lovable.dev/mcp-js";
import aboutTool from "./tools/about";
import listArtistsTool from "./tools/list-artists";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tunevio-mcp",
  title: "Tunevio / BWF Network",
  version: "0.1.0",
  instructions:
    "Authenticated tools for the Tunevio (BWF Network) platform. Sign in as a Tunevio user to use `about_tunevio` and `list_artists`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [aboutTool, listArtistsTool],
});