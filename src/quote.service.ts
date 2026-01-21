// Import the base service class and response type for consistent service structure
import { BaseService, ServiceResponse } from './base.service';
// Import the Supabase client for database interactions
import { supabase } from './supabaseClient';

// Define the QuoteService class extending BaseService for common CRUD functionality
export class QuoteService extends BaseService<any> {
    // Constructor initializes the service with table configuration
    constructor() {
        // Call the parent constructor with specific settings for the 'quotes' table
        super({
            tableName: 'quotes', // The database table name
            permissions: {
                read: 'quotes.read',   // Permission required to read quotes
                write: 'quotes.write', // Permission required to create/update quotes
                delete: 'quotes.delete' // Permission required to delete quotes
            }
        });
    }

    // Method to create a new quote record in the database
    async create(quote: any): Promise<ServiceResponse<any>> {
        try {
            // Perform the insert operation using Supabase client
            const { data, error } = await supabase
                .from(this.config.tableName) // Target the configured table
                .insert(quote)               // Insert the quote object
                .select()                    // Select the inserted record to return it
                .single();                   // Expect a single result

            // If there's an error from Supabase, throw it to be caught
            if (error) throw error;
            // Return the created data with no error
            return { data, error: null };
        } catch (err: any) {
            // Handle any errors using the base class error handler
            return { data: null, error: this.handleError(err) };
        }
    }

    // Method to update an existing quote by its ID
    async update(id: string, updates: any): Promise<ServiceResponse<any>> {
        try {
            // Perform the update operation using Supabase client
            const { data, error } = await supabase
                .from(this.config.tableName) // Target the configured table
                .update(updates)             // Apply the updates
                .eq('id', id)                // Filter by the quote ID
                .select()                    // Select the updated record
                .single();                   // Expect a single result

            // If there's an error, throw it
            if (error) throw error;
            // Return the updated data
            return { data, error: null };
        } catch (err: any) {
            // Handle errors gracefully
            return { data: null, error: this.handleError(err) };
        }
    }

    // Method to retrieve all quotes submitted by a specific user
    async getQuotesByUser(userId: string): Promise<ServiceResponse<any[]>> {
        try {
            // Query the database for quotes matching the user ID
            const { data, error } = await supabase
                .from(this.config.tableName) // Target the configured table
                .select('*')                 // Select all columns
                .eq('user_id', userId)       // Filter where user_id matches
                .order('created_at', { ascending: false }); // Sort by creation date, newest first

            // If there's an error, throw it
            if (error) throw error;
            // Return the list of quotes
            return { data, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }

    // Method to retrieve a single quote by its ID
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

    // Method to retrieve all quotes (typically for admin use)
    async getAllQuotes(): Promise<ServiceResponse<any[]>> {
        try {
            // Admins can see all quotes. We also join with clients to get user names.
            // Query the database for all quotes, including related client details
            const { data, error } = await supabase
                .from(this.config.tableName) // Target the configured table
                .select('*, clients(name, company_name)') // Select quotes and joined client info
                .order('created_at', { ascending: false }); // Sort by creation date, newest first

            // If there's an error, throw it
            if (error) throw error;
            // Return the list of all quotes
            return { data, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }
}

// Export a singleton instance of the QuoteService
export const quoteService = new QuoteService();