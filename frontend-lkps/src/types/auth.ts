export interface User {
    id?: string;
    userID: string;
    username: string;
    role: 'UniversityAdmin' | 'Assessor' | 'SuperAdmin' | 'upps' | 'asesor' | 'admin';
    name?: string;
    university?: string;
    program?: string;
    specialization?: string;
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