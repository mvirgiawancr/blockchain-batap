export interface User {
    userID: string;
    username: string;
    role: 'UniversityAdmin' | 'Assessor' | 'SuperAdmin';
}

export interface LoginCredentials {
    username: string;
    password: string;
    role: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
}