"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Chip } from "../../../components/ui/chip";
import { ContentCard } from "../../../components/ui/content-card";
import { EmptyState } from "../../../components/ui/empty-state";
import { PlusIcon, SearchIcon } from "../../../components/ui/icons";
import { Input } from "../../../components/ui/input";
import { ProgressBar } from "../../../components/ui/progress-bar";
import { StatusPill } from "../../../components/ui/status-pill";
import { toast } from "../../../components/ui/toaster";
import { formatCurrency } from "../../../lib/format";

type Category = "Coffee" | "Tea" | "Snacks" | "Equipment";

interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  stock: number;
  capacity: number;
  media: "brand" | "charcoal";
}

// Mock data — replace with your own queries.
const PRODUCTS: Product[] = [
  { id: "p1", name: "Yirgacheffe beans, 1 kg", description: "Light roast with floral and citrus notes.", category: "Coffee", price: 1250, stock: 84, capacity: 120, media: "brand" },
  { id: "p2", name: "Sidamo beans, 1 kg", description: "Medium roast, sweet and full-bodied.", category: "Coffee", price: 1100, stock: 9, capacity: 120, media: "brand" },
  { id: "p3", name: "Ground coffee, 250 g", description: "Ready for the jebena or a filter.", category: "Coffee", price: 420, stock: 0, capacity: 80, media: "brand" },
  { id: "p4", name: "Spiced tea blend, 100 g", description: "Cardamom, cinnamon and clove.", category: "Tea", price: 260, stock: 61, capacity: 100, media: "charcoal" },
  { id: "p5", name: "Green tea, 50 bags", description: "Light and fresh, no added flavour.", category: "Tea", price: 340, stock: 33, capacity: 100, media: "charcoal" },
  { id: "p6", name: "Roasted barley (kolo), 500 g", description: "Salted and crunchy.", category: "Snacks", price: 180, stock: 120, capacity: 150, media: "charcoal" },
  { id: "p7", name: "Clay jebena, medium", description: "Hand made, holds six small cups.", category: "Equipment", price: 950, stock: 14, capacity: 40, media: "brand" },
  { id: "p8", name: "Manual coffee grinder", description: "Steel burrs, adjustable grind.", category: "Equipment", price: 2300, stock: 6, capacity: 30, media: "brand" },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Coffee", "Tea", "Snacks", "Equipment"];

function stockStatus(p: Product) {
  if (p.stock === 0) return "out-of-stock";
  if (p.stock / p.capacity < 0.15) return "low-stock";
  return "in-stock";
}

export default function CatalogPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => (category === "All" || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
  }, [query, category]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 m-0 text-text">Catalog</h1>
          <p className="type-body m-0 text-text-soft">What you sell, and how much is left.</p>
        </div>
        <Button className="flex-none" onClick={() => toast.info("Adding products is not set up yet", { body: "Connect your own product form here." })}>
          <PlusIcon className="size-4" />
          <span>New product</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <Input aria-label="Search products" className="pl-9" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ContentCard key={i} loading title="" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          tone="charcoal"
          title="No products found"
          description="Try another word, or clear the filters."
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((p) => (
            <ContentCard
              key={p.id}
              media={p.media}
              tag={p.category}
              title={p.name}
              description={
                <div className="flex flex-col gap-2">
                  <span>{p.description}</span>
                  <ProgressBar value={Math.min((p.stock / p.capacity) * 100, 100)} tone={p.stock === 0 ? "danger" : p.stock / p.capacity < 0.15 ? "warning" : "accent"} />
                </div>
              }
              meta={<StatusPill kind="stock" status={stockStatus(p)} />}
              footerLeft={<span className="type-body font-semibold text-text">{formatCurrency(p.price)}</span>}
              action={<span className="type-body-sm text-text-faint">{p.stock} left</span>}
              onClick={() => toast.info(p.name, { body: `${p.stock} in stock.` })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
