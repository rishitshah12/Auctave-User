import { PostgrestError } from '@supabase/supabase-js';

export class AppError extends Error {
    constructor(public message: string, public originalError?: any) {
        super(message);
        this.name = 'AppError';
    }
}

export const mapSupabaseError = (error: PostgrestError | Error | any): AppError => {
    const message = error?.message || 'An unknown error occurred';
    return new AppError(message, error);
};