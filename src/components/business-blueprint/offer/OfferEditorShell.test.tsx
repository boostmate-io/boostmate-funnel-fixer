import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { CoachProvider, useCoach } from "@/contexts/CoachContext";
import OfferEditorShell from "./OfferEditorShell";

function Companion() {
  const { open, closeCoach } = useCoach();
  return open ? <aside data-coach-panel="" aria-label="Coach companion"><input aria-label="Coach message" /><button onClick={closeCoach}>Close companion</button></aside> : null;
}
function Harness({ flush = async () => true }: { flush?: () => Promise<boolean> }) {
  const [open, setOpen] = useState(true);
  return <CoachProvider><OfferEditorShell open={open} onOpenChange={setOpen} offer={{ id: "extra", name: "Extra", category: "Core Offer", primary: false }} flushChanges={flush} tabs={[
    { id: "angle", label: "Offer Angle", content: <input aria-label="Offer name" defaultValue="Extra" /> },
    { id: "stack", label: "Offer Stack", content: <p>Deliverables</p> },
    { id: "pricing", label: "Pricing", content: <p>Payment plans</p> },
  ]} /><Companion /></CoachProvider>;
}
describe("Offer editor companion", () => {
  it("keeps state while typing in Coach, switching tabs and closing Coach", async () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Offer name"), { target: { value: "Manual edit" } });
    fireEvent.click(screen.getByLabelText("Open AI Coach"));
    const coach = screen.getByLabelText("Coach companion");
    fireEvent.pointerDown(coach);
    fireEvent.focus(screen.getByLabelText("Coach message"));
    fireEvent.change(screen.getByLabelText("Coach message"), { target: { value: "Help" } });
    fireEvent.click(screen.getByRole("tab", { name: "Offer Stack" }));
    expect(screen.getByText("Deliverables")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Pricing" }));
    expect(screen.getByText("Payment plans")).toBeVisible();
    fireEvent.click(screen.getByText("Close companion"));
    fireEvent.click(screen.getByRole("tab", { name: "Offer Angle" }));
    expect(screen.getByLabelText("Offer name")).toHaveValue("Manual edit");
  });
  it("keeps failed saves open and retries before closing", async () => {
    const flush = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Harness flush={flush} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByText("Save failed — changes kept");
    expect(screen.getByRole("dialog", { name: "Extra" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry & close" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Extra" })).toBeNull());
    expect(flush).toHaveBeenCalledTimes(2);
  });
  it("Escape closes Coach first without closing the editor", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Open AI Coach"));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Extra" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText("Coach companion")).toBeNull());
    expect(screen.getByRole("dialog", { name: "Extra" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "Extra" })).getByLabelText("Open AI Coach")).toHaveFocus();
  });
});