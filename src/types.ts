export interface ApiIngredient {
  id: number;
  name: string;
  quantity: string;
  is_locked: boolean;
}

export interface ApiStep {
  id: number;
  step_number: number;
  instruction: string;
  is_locked: boolean;
}

export interface ApiRecipe {
  id: number;
  title: string;
  description: string | null;
  author: number;
  author_name: string;
  created_at: string;
  forked_from: number | null;
  forked_from_title: string | null;
  affectionate_note: string | null;
  prep_time: number | null;
  servings: number | null;
  video_url: string | null;
  tags: string[];
  average_rating: number;
  rating_count: number;
  forks_count: number;
  my_rating: number | null;
  ingredients: ApiIngredient[];
  steps: ApiStep[];
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
}

export interface AuthState {
  access: string;
  refresh: string;
  username: string;
  userId: number;
  role: 'GUARDIAN' | 'HEIR' | null;
}


// Metadados puramente visuais guardados no localStorage (ícone e cor de capa).
// Tags agora vêm do backend (campo ApiRecipe.tags).
export interface RecipeUIMetadata {
  icon: string;
  backgroundColor: string;
}

export interface RecipeViewModel extends ApiRecipe {
  icon: string;
  backgroundColor: string;
  isFork: boolean;
}

export type ToastType = 'ok' | 'inf';
