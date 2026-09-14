import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Combobox from "@/components/ui/Combobox";

interface Item { id: number; nome: string; }

const items: Item[] = [
  { id: 1, nome: "Papel Couché" },
  { id: 2, nome: "Lona Frontlight" },
];

describe("Combobox", () => {
  it("filters items by query and selects one", async () => {
    const onChange = vi.fn();
    render(
      <Combobox items={items} value={null} onChange={onChange} getLabel={(i) => i.nome} placeholder="Buscar..." />
    );

    const input = screen.getByPlaceholderText("Buscar...");
    await userEvent.click(input);
    await userEvent.type(input, "Lona");

    const option = await screen.findByText("Lona Frontlight");
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(items[1]);
  });
});
