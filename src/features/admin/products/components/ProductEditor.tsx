"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCategoriesQuery } from "@/features/menu/hooks/useCategoriesQuery";
import { ApiError } from "@/lib/api-errors";
import type { ProductDto } from "@/lib/catalog-types";

import { useProductMutations } from "../hooks/useProductMutations";
import { formatCategoryCode } from "../lib/formatCategoryCode";

const STATUS_VARIANT: Record<ProductDto["status"], "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

interface ProductEditorProps {
  product: ProductDto;
}

/**
 * One component, several independent sections — each maps to exactly one `ProductEndpoints.cs`
 * mutation (`UpdateProduct`, `UpdatePricing`, `AssignCategory`, `UpdateAvailability`,
 * `Publish`/`Archive`/`Restore`/`Delete`, `AddImage`/`RemoveImage`). Season/Temperature/Type are
 * shown read-only: no `UpdateSeasonCommand` (or equivalent) exists — they're set once at
 * creation and immutable after, per `CreateProductCommand`'s own real, implemented surface, not
 * an oversight here.
 */
export function ProductEditor({ product }: ProductEditorProps) {
  const isArchived = product.status === "archived";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">{product.name}</h1>
          <p className="text-muted-foreground font-mono text-xs">{product.sku}</p>
        </div>
        <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
      </div>

      <StatusActions product={product} />

      <Separator />
      <DetailsSection product={product} />

      <Separator />
      <PricingSection product={product} />

      <Separator />
      <CategorySection product={product} />

      <Separator />
      <AvailabilitySection product={product} />

      <Separator />
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Season</p>
          <p>{product.season}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Temperature</p>
          <p>{product.temperature}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p>{product.type}</p>
        </div>
      </div>

      <Separator />
      <ImagesSection product={product} />

      {product.status === "draft" && (
        <>
          <Separator />
          <DangerZone product={product} />
        </>
      )}

      {isArchived && <p className="text-muted-foreground text-sm">This product is archived — restore it before editing details, pricing, or category.</p>}
    </div>
  );
}

function StatusActions({ product }: { product: ProductDto }) {
  const mutations = useProductMutations();

  return (
    <div className="flex gap-2">
      {product.status === "draft" && (
        <Button onClick={() => mutations.publishProduct.mutate(product.id)} disabled={mutations.publishProduct.isPending}>
          Publish
        </Button>
      )}
      {product.status !== "archived" && (
        <Button variant="outline" onClick={() => mutations.archiveProduct.mutate(product.id)} disabled={mutations.archiveProduct.isPending}>
          Archive
        </Button>
      )}
      {product.status === "archived" && (
        <Button onClick={() => mutations.restoreProduct.mutate(product.id)} disabled={mutations.restoreProduct.isPending}>
          Restore
        </Button>
      )}
    </div>
  );
}

function DetailsSection({ product }: { product: ProductDto }) {
  const { updateProduct } = useProductMutations();
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline);
  const [description, setDescription] = useState(product.description);
  const [tags, setTags] = useState(product.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const disabled = product.status === "archived";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        input: {
          name,
          tagline,
          description,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save details.");
    }
  }

  return (
    <Card>
      <CardHeader className="font-medium">Details</CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" required disabled={disabled} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-tagline">Tagline</Label>
            <Input id="edit-tagline" required disabled={disabled} value={tagline} onChange={(event) => setTagline(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" required disabled={disabled} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input id="edit-tags" disabled={disabled} value={tags} onChange={(event) => setTags(event.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={disabled || updateProduct.isPending} className="self-start">
            {updateProduct.isPending ? "Saving…" : "Save details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PricingSection({ product }: { product: ProductDto }) {
  const { updatePricing } = useProductMutations();
  const [price, setPrice] = useState(String(product.price));
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice != null ? String(product.compareAtPrice) : "");
  const [error, setError] = useState<string | null>(null);
  const disabled = product.status === "archived";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updatePricing.mutateAsync({
        id: product.id,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save pricing.");
    }
  }

  return (
    <Card>
      <CardHeader className="font-medium">Pricing</CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-price">Price</Label>
              <Input id="edit-price" type="number" step="0.01" min="0.01" required disabled={disabled} value={price} onChange={(event) => setPrice(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-compare-at">Compare-at price (optional)</Label>
              <Input id="edit-compare-at" type="number" step="0.01" disabled={disabled} value={compareAtPrice} onChange={(event) => setCompareAtPrice(event.target.value)} />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={disabled || updatePricing.isPending} className="self-start">
            {updatePricing.isPending ? "Saving…" : "Save pricing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CategorySection({ product }: { product: ProductDto }) {
  const { data: categories } = useCategoriesQuery();
  const { assignCategory } = useProductMutations();
  const [categoryCode, setCategoryCode] = useState(product.category);
  const disabled = product.status === "archived";

  return (
    <Card>
      <CardHeader className="font-medium">Category</CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="edit-category">Category</Label>
          <Select value={categoryCode} onValueChange={(value) => value && setCategoryCode(value)} disabled={disabled}>
            <SelectTrigger id="edit-category" className="w-full">
              <SelectValue>{formatCategoryCode(categoryCode)}</SelectValue>
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
        <Button
          disabled={disabled || categoryCode === product.category || assignCategory.isPending}
          onClick={() => assignCategory.mutate({ id: product.id, categoryCode })}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function AvailabilitySection({ product }: { product: ProductDto }) {
  const { updateAvailability } = useProductMutations();
  const disabled = product.status === "archived";

  return (
    <Card>
      <CardHeader className="font-medium">Availability</CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{product.isAvailable ? "Customers can order this today." : "Hidden from ordering, even if published."}</p>
        <Button
          variant="outline"
          disabled={disabled || updateAvailability.isPending}
          onClick={() => updateAvailability.mutate({ id: product.id, isAvailable: !product.isAvailable })}
        >
          {product.isAvailable ? "Mark unavailable" : "Mark available"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ImagesSection({ product }: { product: ProductDto }) {
  const { addImage, removeImage } = useProductMutations();
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addImage.mutateAsync({ id: product.id, url, altText: altText || null, isPrimary: product.images.length === 0 });
      setUrl("");
      setAltText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that image.");
    }
  }

  return (
    <Card>
      <CardHeader className="font-medium">Images</CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/*
          By URL, not a file picker — the real backend surface here is `AddImageRequest(Url,
          AltText, IsPrimary)`; no blob/object storage exists in this architecture (see
          docs/29_COMMERCE_ARCHITECTURE_FREEZE.md), so a fake upload button with nothing behind
          it would be exactly the "placeholder implementation" this sprint's brief forbids.
        */}
        {product.images.length === 0 ? (
          <p className="text-muted-foreground text-sm">No images yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {product.images.map((image) => (
              <li key={image.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  {image.url} {image.isPrimary && <Badge variant="outline">primary</Badge>}
                </span>
                <Button size="sm" variant="ghost" onClick={() => removeImage.mutate({ id: product.id, imageId: image.id })} disabled={removeImage.isPending}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-image-url">Image URL</Label>
            <Input id="edit-image-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-image-alt">Alt text (optional)</Label>
            <Input id="edit-image-alt" value={altText} onChange={(event) => setAltText(event.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={addImage.isPending} className="self-start">
            {addImage.isPending ? "Adding…" : "Add image"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZone({ product }: { product: ProductDto }) {
  const { deleteProduct } = useProductMutations();
  const router = useRouter();

  return (
    <div className="border-destructive/30 flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Delete this draft</p>
        <p className="text-muted-foreground text-sm">Permanent — only possible while still a draft (see `DeleteProductCommand`&apos;s own guard).</p>
      </div>
      <Button
        variant="destructive"
        disabled={deleteProduct.isPending}
        onClick={async () => {
          await deleteProduct.mutateAsync(product.id);
          router.push("/admin/products");
        }}
      >
        Delete
      </Button>
    </div>
  );
}
