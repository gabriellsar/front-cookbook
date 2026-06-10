import type { Recipe, Ingredient } from '../../core/models/Recipe';
import type { User } from '../../core/models/User';

export class RecipeService {
    private baseUrl = 'http://localhost:8000/api';

    // Exemplo de como a regra de negócio do "Fork" é protegida no Front-end
    async forkRecipe(originalRecipe: Recipe, currentUser: User, affectiveNote: string): Promise<Recipe> {
        
        // 1. Clonamos os ingredientes, mantendo o status de 'locked'
        const forkedIngredients = originalRecipe.ingredients.map(ing => ({
            ...ing,
            // Apenas para garantir tipagem limpa num clone profundo
        }));

        // 2. Montamos o Payload (Dicionário/Objeto) para enviar ao backend
        const newRecipePayload: Omit<Recipe, 'id' | 'createdAt'> = {
            title: `${originalRecipe.title} (Versão de ${currentUser.name})`,
            authorId: currentUser.id,
            parentRecipeId: originalRecipe.id, // O "Git link"
            ingredients: forkedIngredients,
            steps: originalRecipe.steps,
            affectiveNotes: affectiveNote
        };

        // 3. Chamada para o Backend Django (Simulada aqui)
        /*
        const response = await fetch(`${this.baseUrl}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecipePayload)
        });
        return await response.json();
        */

        console.log("Enviando para o Django:", newRecipePayload);
        
        return {
            id: 'novo-id-gerado-pelo-banco',
            createdAt: new Date().toISOString(),
            ...newRecipePayload
        } as Recipe;
    }
}
    