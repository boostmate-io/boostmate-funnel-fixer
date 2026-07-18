import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspaces from "./tools/list-workspaces";
import listFunnels from "./tools/list-funnels";
import listOffers from "./tools/list-offers";
import getBusinessBlueprint from "./tools/get-business-blueprint";
import listAnalyticsEntries from "./tools/list-analytics-entries";

// Build the direct Supabase issuer from the project ref. Vite inlines
// VITE_SUPABASE_PROJECT_ID at build time, so this stays import-safe (no runtime
// env read). The fallback keeps the issuer well-formed during manifest extract.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "boostmate-mcp",
  title: "Boostmate MCP",
  version: "0.1.0",
  instructions:
    "Tools for a Boostmate account. Start with list_workspaces to find the workspace (sub_account) ID, then use it to list funnels, offers, analytics entries, or fetch the business blueprint. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWorkspaces, listFunnels, listOffers, getBusinessBlueprint, listAnalyticsEntries],
});
