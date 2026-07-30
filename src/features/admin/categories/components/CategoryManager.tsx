"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api-errors";
import type { CategoryDto } from "@/lib/catalog-types";

import { useAdminCategoriesQuery } from "../hooks/useAdminCategoriesQuery";
import { useCategoryMutations } from "../hooks/useCategoryMutations";

export function CategoryManager() {
  const { data: categories, isLoading } = useAdminCategoriesQuery();
  const { create } = useCategoryMutations();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ code, name, sortOrder: Number(sortOrder) });
      setCode("");
      setName("");
      setSortOrder("0");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that category.");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Sort order</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(categories ?? []).map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </TableBody>
        </Table>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3 border-t pt-4">
        <h2 className="font-medium">New category</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-category-code">Code</Label>
            <Input id="new-category-code" required value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. brunch" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-category-name">Name</Label>
            <Input id="new-category-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-category-sort">Sort order</Label>
            <Input id="new-category-sort" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={create.isPending} className="self-start">
          {create.isPending ? "Creating…" : "Create category"}
        </Button>
      </form>
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryDto }) {
  const { update } = useCategoryMutations();
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const dirty = name !== category.name || Number(sortOrder) !== category.sortOrder;

  return (
    <TableRow>
      <TableCell className="text-muted-foreground font-mono text-xs">{category.code}</TableCell>
      <TableCell>
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={`Name for ${category.code}`} />
      </TableCell>
      <TableCell>
        <Input type="number" className="w-20" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label={`Sort order for ${category.code}`} />
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" disabled={!dirty || update.isPending} onClick={() => update.mutate({ id: category.id, name, sortOrder: Number(sortOrder) })}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
