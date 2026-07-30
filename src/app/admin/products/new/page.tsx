import { CreateProductForm } from "@/features/admin/products/components/CreateProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">New product</h1>
        <p className="text-muted-foreground text-sm">Starts as a draft — publish it once it&apos;s ready.</p>
      </div>
      <CreateProductForm />
    </div>
  );
}
