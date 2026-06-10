export type UserRole = 'GARDIAN' | 'HEIR';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
}