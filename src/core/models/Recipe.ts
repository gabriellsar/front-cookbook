export interface Ingredient {
    id: string;
    name: string;
    quantity: string;
    isLocked: boolean; 
}

export interface RecipeStep {
    stepNumber: number;
    instruction: string;
    isLocked: boolean;
}

export interface Recipe {
    id: string;
    title: string;
    authorId: string;
    // Se for null, é uma Receita Raiz. Se tiver ID, é uma Derivação (Fork)
    parentRecipeId: string | null; 
    ingredients: Ingredient[];
    steps: RecipeStep[];
    affectiveNotes?: string;
    createdAt: string;
}