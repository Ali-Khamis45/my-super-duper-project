import { CategoryManager } from "@/features/admin/categories/components/CategoryManager";

export default function AdminCategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">Categories</h1>
        <p className="text-muted-foreground text-sm">Codes are immutable once created — name and sort order can change.</p>
      </div>
      <CategoryManager />
    </div>
  );
}
