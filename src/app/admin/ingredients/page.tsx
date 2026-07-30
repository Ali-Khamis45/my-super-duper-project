import { IngredientManager } from "@/features/admin/ingredients/components/IngredientManager";

export default function AdminIngredientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">Ingredients</h1>
        <p className="text-muted-foreground text-sm">Codes are immutable once created.</p>
      </div>
      <IngredientManager />
    </div>
  );
}
