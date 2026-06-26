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


export interface RecipeUIMetadata {
  icon: string;
  backgroundColor: string;
  tags: string[];
  localRating: number;
}

export interface RecipeViewModel extends ApiRecipe {
  icon: string;
  backgroundColor: string;
  tags: string[];
  isFork: boolean;
}

export type ToastType = 'ok' | 'inf';
