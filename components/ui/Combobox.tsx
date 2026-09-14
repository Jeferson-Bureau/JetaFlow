"use client";

import { useState } from "react";

interface ComboboxProps<T> {
  items: T[];
  value: T | null;
  onChange: (item: T) => void;
  getLabel: (item: T) => string;
  placeholder?: string;
}

export default function Combobox<T>({ items, value, onChange, getLabel, placeholder }: ComboboxProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query === ""
    ? items
    : items.filter((item) => getLabel(item).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : (value ? getLabel(value) : "")}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded border px-3 py-2"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 max-h-48 w-full overflow-auto rounded border bg-white shadow">
          {filtered.map((item, i) => (
            <li
              key={i}
              onMouseDown={() => { onChange(item); setOpen(false); }}
              className="cursor-pointer px-3 py-2 hover:bg-ciano hover:text-white"
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
