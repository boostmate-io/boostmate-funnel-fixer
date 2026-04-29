// =============================================================================
// Shared currency helpers. Currency is stored per workspace in
// workspace_settings.currency (ISO-4217 code, e.g. "EUR", "USD", "GBP").
// =============================================================================

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc (CHF)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (C$)" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar (NZ$)" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona (kr)" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone (kr)" },
  { code: "DKK", symbol: "kr", label: "Danish Krone (kr)" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (¥)" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan (¥)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (₹)" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real (R$)" },
  { code: "MXN", symbol: "Mex$", label: "Mexican Peso (Mex$)" },
  { code: "ZAR", symbol: "R", label: "South African Rand (R)" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)" },
  { code: "HKD", symbol: "HK$", label: "Hong Kong Dollar (HK$)" },
  { code: "PLN", symbol: "zł", label: "Polish Złoty (zł)" },
];

export const getCurrencySymbol = (code?: string | null): string => {
  if (!code) return "€";
  return CURRENCIES.find((c) => c.code === code.toUpperCase())?.symbol ?? code;
};

export const formatCurrency = (
  amount: number | string | null | undefined,
  code?: string | null,
): string => {
  const symbol = getCurrencySymbol(code);
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return symbol;
  return `${symbol}${n.toLocaleString()}`;
};
