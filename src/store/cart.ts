import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

function safeItems(get: () => CartState): CartItem[] {
  const raw = get().items;
  return Array.isArray(raw) ? raw : [];
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
      add: (product, quantity = 1) => {
        if (product.stock <= 0) return;
        const items = [...safeItems(get)];
        const sku = (product.sku ?? product.code ?? "").trim();
        const idx = items.findIndex((i) => i.productId === product.id);
        if (idx >= 0) {
          const next = Math.min(items[idx].quantity + quantity, product.stock);
          items[idx] = { ...items[idx], quantity: next, sku: sku || items[idx].sku };
        } else {
          items.push({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            sku,
            price: product.price,
            imageUrl: product.mainImageUrl,
            quantity: Math.min(quantity, product.stock),
            stock: product.stock,
          });
        }
        set({ items });
      },
      remove: (productId) =>
        set({ items: safeItems(get).filter((i) => i.productId !== productId) }),
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: safeItems(get).filter((i) => i.productId !== productId) });
          return;
        }
        const items = safeItems(get).map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stock) }
            : i,
        );
        set({ items });
      },
      clear: () => set({ items: [] }),
      subtotal: () => safeItems(get).reduce((s, i) => s + i.price * i.quantity, 0),
      count: () => safeItems(get).reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: "enertech-cart-v4",
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<CartState, "items" | "isOpen">> | undefined;
        const raw = Array.isArray(p?.items) ? p.items : [];
        const items: CartItem[] = raw.map((i) => ({
          ...i,
          sku: typeof i.sku === "string" ? i.sku : "",
        }));
        return {
          ...current,
          items,
          isOpen: Boolean(p?.isOpen),
        };
      },
    },
  ),
);
