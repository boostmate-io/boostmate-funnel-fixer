import { describe, expect, it } from "vitest";
import { formatPromptSelection } from "./promptMarkdown";

describe("prompt Markdown source editing", () => {
  it("adds bold syntax without changing surrounding source or line breaks", () => {
    expect(formatPromptSelection("# Role\n\nBe helpful\n", 11, 18, "bold").source).toBe("# Role\n\nBe **helpful**\n");
  });
  it("formats selected lines as a numbered list without losing their content", () => {
    expect(formatPromptSelection("Intro\nFirst\nSecond\nEnd", 6, 18, "ordered").source).toBe("Intro\n1. First\n2. Second\nEnd");
  });
});