import { BaseService, ServiceResponse } from './base.service';
import { supabase } from './supabaseClient';
import { PostgrestError } from '@supabase/supabase-js';

export class QuoteService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'quotes',
            permissions: {
                read: 'quotes.read',
                write: 'quotes.write',
                delete: 'quotes.delete'
            }
        });
    }

    async create(quote: any): Promise<ServiceResponse<any>> {
        try {
            const { data, error } = await supabase
                .from(this.config.tableName)
                .insert(quote)
                .select()
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    async update(id: string, updates: any): Promise<ServiceResponse<any>> {
        try {
            // Always stamp modified_at so timestamps reflect the latest activity
            const payload = { ...updates, modified_at: new Date().toISOString() };
            const { data, error } = await supabase
                .from(this.config.tableName)
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    async getQuotesByUser(userId: string): Promise<ServiceResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    async getQuoteById(quoteId: string): Promise<ServiceResponse<any>> {
        try {
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select('*')
                .eq('id', quoteId)
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    async getAllQuotes(): Promise<ServiceResponse<any[]>> {
        try {
            // Admins can see all quotes. We also join with clients to get user names.
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select('*, clients(name, company_name, avatar_url)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    // Plain SELECT * with no FK join — avoids relationship ambiguity errors
    // that occur when joining clients. Used by AdminRFQPage which handles
    // client hydration separately.
    async getAllQuotesRaw(): Promise<ServiceResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: this.handleError(err) };
        }
    }

    // Returns raw PostgrestError (not wrapped through handleError) so callers
    // can inspect error.code — e.g. '42501' = permission denied.
    async deleteById(id: string): Promise<{ error: PostgrestError | null; count: number | null }> {
        const { error, count } = await supabase
            .from(this.config.tableName)
            .delete({ count: 'exact' })
            .eq('id', id);
        return { error, count };
    }

    async deleteBulk(ids: string[]): Promise<{ error: PostgrestError | null; count: number | null }> {
        const { error, count } = await supabase
            .from(this.config.tableName)
            .delete({ count: 'exact' })
            .in('id', ids);
        return { error, count };
    }
}

export const quoteService = new QuoteService();
