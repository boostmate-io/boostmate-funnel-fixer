// =============================================================================
// useCurrency — exposes the active workspace currency code & symbol.
// Falls back to EUR when no workspace setting is loaded yet.
// =============================================================================

import { useWorkspaceSettings } from "@/components/business-blueprint/useWorkspaceSettings";
import { getCurrencySymbol } from "@/lib/currency";

export function useCurrency() {
  const { settings } = useWorkspaceSettings();
  const code = settings?.currency || "EUR";
  return {
    code,
    symbol: getCurrencySymbol(code),
  };
}
