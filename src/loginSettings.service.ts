import { supabase } from './supabaseClient';

export const loginSettingsService = {
    async get<T>(key: string): Promise<T | null> {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();
        return (data?.value as T) ?? null;
    },

    async upsert(key: string, value: unknown): Promise<{ error: Error | null }> {
        const { data, error } = await supabase.from('app_settings').upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        ).select('key');
        // If no error but also no data returned, RLS silently blocked the write
        if (!error && (!data || data.length === 0)) {
            return { error: new Error('Permission denied — check Supabase RLS policies') };
        }
        return { error: error as Error | null };
    },
};
