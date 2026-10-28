import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LessonStepNavigation } from "./LessonStepNavigation";

const next = { href: "/docs/growth/customer-clarity", title: "Customer Clarity" };
const base = { count: 3, complete: false, onStep: vi.fn(), onToggle: vi.fn() };
const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("lesson step navigation", () => {
  it("links to the next lesson instead of a disabled Next Step on the last step", () => {
    show(<LessonStepNavigation {...base} step={3} next={next} />);
    const link = screen.getByRole("link", { name: /Go to Customer Clarity/i });
    expect(link.getAttribute("href")).toBe("/docs/growth/customer-clarity");
    expect(screen.queryByRole("button", { name: /next step/i })).toBeNull();
  });

  it("steps forward while steps remain", () => {
    show(<LessonStepNavigation {...base} step={2} next={next} />);
    expect(screen.getByRole("button", { name: /Next Step/i })).toBeEnabled();
    expect(screen.queryByRole("link", { name: /Go to/i })).toBeNull();
  });

  it("offers no forward action after the final lesson", () => {
    show(<LessonStepNavigation {...base} step={3} />);
    expect(screen.queryByRole("button", { name: /Next Step/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Go to/i })).toBeNull();
  });
});
