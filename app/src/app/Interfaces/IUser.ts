export type UserRole = 'admin' | 'cliente';

export interface IUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}