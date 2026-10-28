import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PromptCard from "./PromptCard";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Documentation prompt copying", () => {
  it.each(["# Role\n\n**Be helpful** and *precise*.\n- First\n- Second\n\n[Link](https://boostmate.io)\n", "Existing plain text\nSecond line\n\nLast line"])("copies the original prompt unchanged: %s", async (prompt) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PromptCard title="Test prompt" prompt={prompt} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(prompt));
    fireEvent.click(screen.getByRole("button", { name: "View Prompt" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Copy Prompt" }).at(-1) as HTMLElement);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toBe(prompt);
  });
});