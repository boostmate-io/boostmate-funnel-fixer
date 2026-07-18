// Human-readable summary of a Growth Roadmap condition tree.
//
// The evaluator vocabulary (facts, operators, structure) is code-owned; the
// Admin UI renders these summaries as read-only text so admins understand
// why a task activates or completes, without having to read raw JSON.

import type { ConditionNode, ConditionOp } from "./taskTypes";

const OP_LABEL: Record<ConditionOp, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "is one of",
  not_in: "is not one of",
  truthy: "is set",
  falsy: "is not set",
};

function formatValue(v: unknown): string {
  if (v === undefined) return "";
  if (v === null) return "null";
  if (Array.isArray(v)) return `[${v.map((x) => formatValue(x)).join(", ")}]`;
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

/**
 * Return a plain-English rendering of the condition tree.
 * Empty `all: []` → "always". Empty `any: []` → "never".
 */
export function summarizeCondition(node: ConditionNode | null | undefined): string {
  if (!node || typeof node !== "object") return "never";

  if ("all" in node) {
    if (!Array.isArray(node.all) || node.all.length === 0) return "always";
    if (node.all.length === 1) return summarizeCondition(node.all[0]);
    return node.all.map((c) => `(${summarizeCondition(c)})`).join(" AND ");
  }
  if ("any" in node) {
    if (!Array.isArray(node.any) || node.any.length === 0) return "never";
    if (node.any.length === 1) return summarizeCondition(node.any[0]);
    return node.any.map((c) => `(${summarizeCondition(c)})`).join(" OR ");
  }
  if ("not" in node) {
    return `NOT (${summarizeCondition(node.not)})`;
  }
  if ("fact" in node) {
    const op = OP_LABEL[node.op] ?? node.op;
    if (node.op === "truthy" || node.op === "falsy") {
      return `${node.fact} ${op}`;
    }
    return `${node.fact} ${op} ${formatValue(node.value)}`;
  }
  return "unknown";
}
