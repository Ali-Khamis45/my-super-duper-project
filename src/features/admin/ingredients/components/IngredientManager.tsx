"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminCategoriesQuery } from "@/features/admin/categories/hooks/useAdminCategoriesQuery";
import { ApiError } from "@/lib/api-errors";
import type { IngredientDto } from "@/lib/catalog-types";

import { useAdminIngredientsQuery } from "../hooks/useAdminIngredientsQuery";
import { useIngredientCategoriesQuery } from "../hooks/useIngredientCategoriesQuery";
import { useIngredientMutations } from "../hooks/useIngredientMutations";

const SHAPES = ["ring", "sprinkles", "ice"] as const;

export function IngredientManager() {
  const { data: ingredients, isLoading } = useAdminIngredientsQuery();
  const { data: productCategories } = useAdminCategoriesQuery();
  const { data: ingredientCategories } = useIngredientCategoriesQuery();
  const { create } = useIngredientMutations();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ingredientCategoryId, setIngredientCategoryId] = useState("");
  const [priceModifier, setPriceModifier] = useState("0");
  const [color, setColor] = useState("#000000");
  const [shape, setShape] = useState<(typeof SHAPES)[number]>("ring");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!ingredientCategoryId) {
      setError("Choose an ingredient category.");
      return;
    }

    try {
      await create.mutateAsync({
        code,
        name,
        ingredientCategoryId,
        priceModifier: Number(priceModifier),
        compatibleCategoryCodes: [],
        isUniversallyCompatible: true,
        color,
        shape,
        sortOrder: (ingredients?.length ?? 0) * 10,
      });
      setCode("");
      setName("");
      setIngredientCategoryId("");
      setPriceModifier("0");
      setColor("#000000");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that ingredient.");
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price +</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Universal</TableHead>
              <TableHead>Compatible with</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ingredients ?? []).map((ingredient) => (
              <IngredientRow key={ingredient.id} ingredient={ingredient} productCategoryCodes={(productCategories ?? []).map((c) => c.code)} />
            ))}
          </TableBody>
        </Table>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3 border-t pt-4">
        <h2 className="font-medium">New ingredient</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-code">Code</Label>
            <Input id="new-ingredient-code" required value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. oat-milk" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-name">Name</Label>
            <Input id="new-ingredient-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-category">Ingredient category</Label>
            <Select value={ingredientCategoryId} onValueChange={(value) => setIngredientCategoryId(value ?? "")}>
              <SelectTrigger id="new-ingredient-category" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {(ingredientCategories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-shape">Shape</Label>
            <Select value={shape} onValueChange={(value) => value && setShape(value as (typeof SHAPES)[number])}>
              <SelectTrigger id="new-ingredient-shape" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-price">Price modifier</Label>
            <Input id="new-ingredient-price" type="number" step="0.01" min="0" value={priceModifier} onChange={(event) => setPriceModifier(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-ingredient-color">Color</Label>
            <Input id="new-ingredient-color" type="text" value={color} onChange={(event) => setColor(event.target.value)} placeholder="#hex or transparent" />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">Starts universally compatible — narrow it to specific categories below after creating it.</p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={create.isPending} className="self-start">
          {create.isPending ? "Creating…" : "Create ingredient"}
        </Button>
      </form>
    </div>
  );
}

function IngredientRow({ ingredient, productCategoryCodes }: { ingredient: IngredientDto; productCategoryCodes: string[] }) {
  const { update } = useIngredientMutations();
  const [name, setName] = useState(ingredient.name);
  const [priceModifier, setPriceModifier] = useState(String(ingredient.priceModifier));
  const [color, setColor] = useState(ingredient.color);
  const [sortOrder, setSortOrder] = useState(String(ingredient.sortOrder));
  const [isUniversal, setIsUniversal] = useState(ingredient.compatibleWith === "all");
  const [compatible, setCompatible] = useState<Set<string>>(new Set(ingredient.compatibleWith === "all" ? [] : ingredient.compatibleWith));

  function toggleCompatible(code: string) {
    setCompatible((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function save() {
    update.mutate({
      code: ingredient.id,
      input: {
        name,
        priceModifier: Number(priceModifier),
        color,
        sortOrder: Number(sortOrder),
        isUniversallyCompatible: isUniversal,
        compatibleCategoryCodes: isUniversal ? [] : [...compatible],
      },
    });
  }

  return (
    <TableRow>
      <TableCell className="text-muted-foreground font-mono text-xs">{ingredient.id}</TableCell>
      <TableCell>
        <Input value={name} onChange={(event) => setName(event.target.value)} className="w-32" aria-label={`Name for ${ingredient.id}`} />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={priceModifier} onChange={(event) => setPriceModifier(event.target.value)} className="w-20" aria-label={`Price modifier for ${ingredient.id}`} />
      </TableCell>
      <TableCell>
        <Input value={color} onChange={(event) => setColor(event.target.value)} className="w-24" aria-label={`Color for ${ingredient.id}`} />
      </TableCell>
      <TableCell>
        <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="w-16" aria-label={`Sort order for ${ingredient.id}`} />
      </TableCell>
      <TableCell>
        <Checkbox checked={isUniversal} onCheckedChange={(checked) => setIsUniversal(checked === true)} aria-label={`Universally compatible: ${ingredient.id}`} />
      </TableCell>
      <TableCell>
        {isUniversal ? (
          <span className="text-muted-foreground text-xs">All categories</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {productCategoryCodes.map((code) => (
              <label key={code} className="flex items-center gap-1 text-xs">
                <Checkbox checked={compatible.has(code)} onCheckedChange={() => toggleCompatible(code)} aria-label={`${ingredient.id} compatible with ${code}`} />
                {code}
              </label>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" disabled={update.isPending} onClick={save}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
