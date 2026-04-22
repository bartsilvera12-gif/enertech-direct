import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("@/services/storeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/storeService")>();
  return {
    ...actual,
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchProducts: vi.fn().mockResolvedValue([]),
    fetchHeroSliderProducts: vi.fn().mockResolvedValue([]),
    fetchCatalogFacets: vi.fn().mockResolvedValue({
      brands: [],
      suppliers: [],
      warehouses: [],
      situations: [],
      articleTypes: [],
    }),
  };
});

describe("App smoke", () => {
  it("monta la home con el hero Enertech", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /Soluciones en informática/i }, { timeout: 12_000 }),
    ).toBeInTheDocument();
  });
});
