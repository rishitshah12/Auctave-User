import { QuoteRequest } from '../types';

/**
 * Maps a raw Supabase `quotes` table row to the app's QuoteRequest domain type.
 * Single source of truth — consumed by App.tsx and QuoteDetailPage.
 */
export function transformRawQuote(q: any): QuoteRequest {
    return {
        id: q.id,
        factory: q.factory_data,
        order: q.order_details,
        status: q.status,
        submittedAt: q.created_at,
        acceptedAt: q.accepted_at || q.response_details?.acceptedAt,
        userId: q.user_id,
        files: q.files || [],
        response_details: q.response_details,
        negotiation_details: q.negotiation_details,
        modification_count: q.modification_count || 0,
        modified_at: q.modified_at,
    };
}
