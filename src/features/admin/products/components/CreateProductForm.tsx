"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategoriesQuery } from "@/features/menu/hooks/useCategoriesQuery";
import { ApiError } from "@/lib/api-errors";

import { useProductMutations } from "../hooks/useProductMutations";

const SEASONS = ["AllYear", "Spring", "Summer", "Fall", "Winter"] as const;
const TEMPERATURES = ["Hot", "Iced", "Both"] as const;

/** `ProductType` has exactly one real member (`Beverage`) today — see `Enums.cs`'s own doc comment for why — so there's no picker for it, just the fixed value every `CreateProductCommand` call already sends. */
const PRODUCT_TYPE = "Beverage";

export function CreateProductForm() {
  const router = useRouter();
  const { data: categories } = useCategoriesQuery();
  const { createProduct } = useProductMutations();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [price, setPrice] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [season, setSeason] = useState<(typeof SEASONS)[number]>("AllYear");
  const [temperature, setTemperature] = useState<(typeof TEMPERATURES)[number]>("Hot");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!categoryCode) {
      setError("Choose a category.");
      return;
    }

    try {
      const product = await createProduct.mutateAsync({
        sku,
        name,
        categoryCode,
        price: Number(price),
        tagline,
        description,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        season,
        temperature,
        type: PRODUCT_TYPE,
      });
      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong creating the product.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-sku">SKU</Label>
          <Input id="new-product-sku" required value={sku} onChange={(event) => setSku(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-name">Name</Label>
          <Input id="new-product-name" required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-category">Category</Label>
          <Select value={categoryCode} onValueChange={(value) => setCategoryCode(value ?? "")}>
            <SelectTrigger id="new-product-category" className="w-full">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-price">Price</Label>
          <Input id="new-product-price" type="number" step="0.01" min="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-season">Season</Label>
          <Select value={season} onValueChange={(value) => value && setSeason(value as (typeof SEASONS)[number])}>
            <SelectTrigger id="new-product-season" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-product-temperature">Temperature</Label>
          <Select value={temperature} onValueChange={(value) => value && setTemperature(value as (typeof TEMPERATURES)[number])}>
            <SelectTrigger id="new-product-temperature" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPERATURES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="new-product-tagline">Tagline</Label>
        <Input id="new-product-tagline" required value={tagline} onChange={(event) => setTagline(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="new-product-description">Description</Label>
        <Textarea id="new-product-description" required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="new-product-tags">Tags (comma-separated)</Label>
        <Input id="new-product-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="strong, smooth, low acid" />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={createProduct.isPending} className="self-start">
        {createProduct.isPending ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}
