import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import ThemeToggle from "@/components/layout/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "theme=; path=/; max-age=0";
  });

  it("toggles data-theme attribute when clicked", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /alternar tema/i });
    await userEvent.click(button);
    const first = document.documentElement.getAttribute("data-theme");
    expect(["light", "dark"]).toContain(first);
    await userEvent.click(button);
    const second = document.documentElement.getAttribute("data-theme");
    expect(second).not.toBe(first);
  });
});
