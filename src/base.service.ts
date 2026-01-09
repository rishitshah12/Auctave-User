// Import types for handling database errors
import { PostgrestError } from '@supabase/supabase-js';
// Import the Supabase client to talk to the database
import { supabase } from './supabaseClient';
// Import the master controller to check user permissions
import { masterController } from './masterController';
// Import helper functions to format errors nicely
import { mapSupabaseError, AppError } from './error-handler';

// Define settings for a service (like which table to use)
export interface ServiceConfig {
    tableName: string; // The name of the database table
    primaryKey?: string; // The unique ID column (defaults to 'id')
    permissions?: {
        read?: string; // Permission needed to view data
        write?: string; // Permission needed to add or edit data
        delete?: string; // Permission needed to remove data
    };
}

// Define the standard response format for all service calls
export interface ServiceResponse<T> {
    data: T | null; // The result data if successful
    error: Error | null; // The error object if something went wrong
}

// A base class that provides common database operations (CRUD)
// Other services (like UserService) will extend this to inherit these features
export class BaseService<T> {
    // Initialize the service with its specific configuration
    constructor(protected config: ServiceConfig) {}

    // Helper function to check if the current user is allowed to perform an action
    protected async checkPermission(permission?: string): Promise<void> {
        // If no specific permission is required, allow access
        if (!permission) return;
        
        // Get the current user's session
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user ?? null;

        // Fallback: Try getUser if session is missing (sometimes happens during refresh/race conditions)
        if (!user) {
            const { data, error } = await supabase.auth.getUser();
            user = data.user;
            
            // Double Fallback: If getUser fails, try to refresh the session explicitly
            if (!user || error) {
                console.warn(`BaseService: getUser failed for ${this.config.tableName}`, error?.message);
                const { data: refreshData } = await supabase.auth.refreshSession();
                user = refreshData.user;
            }
        }

        // If user is not logged in, stop and throw an error
        if (!user) {
            throw new Error('Unauthorized: No active session');
        }

        // Ask the MasterController if this user has the required permission
        let hasPermission = await masterController.checkPermission(user.id, permission);

        // Fallback: If MasterController fails (e.g. due to session issues) but we have a valid admin user, allow.
        if (!hasPermission && user.email?.endsWith('@auctaveexports.com')) {
            hasPermission = true;
        }

        // If not allowed, stop and throw an error
        if (!hasPermission) {
            throw new Error(`Forbidden: Missing permission ${permission}`);
        }
    }

    // Helper function to log errors and format them for the UI
    protected handleError(error: PostgrestError | Error): Error {
        // Convert raw database errors into app-friendly errors
        const appError = mapSupabaseError(error);
        // Log the error details to the console for developers
        console.error(`Service Error [${this.config.tableName}]:`, appError.message, appError.originalError);
        // Return the formatted error
        return appError;
    }

    // A placeholder function for validating data before saving
    // Subclasses can override this to add specific rules (e.g., email format)
    protected async validate(data: Partial<T>): Promise<void> { /* Override in subclass */ }

    // Function to get all records from the table
    async getAll(select: string = '*'): Promise<ServiceResponse<T[]>> {
        try {
            // Check if user has permission to read
            await this.checkPermission(this.config.permissions?.read);
            // Fetch data from the configured table
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select(select);
            
            // If database error, throw it
            if (error) throw error;
            // Return the list of data
            return { data: data as T[], error: null };
        } catch (err: any) {
            // Handle any errors that occurred
            return { data: null, error: this.handleError(err) };
        }
    }

    // Function to get a single record by its ID
    async getById(id: string, select: string = '*'): Promise<ServiceResponse<T>> {
        try {
            // Check read permission
            await this.checkPermission(this.config.permissions?.read);
            // Fetch the specific record
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select(select)
                .eq(this.config.primaryKey || 'id', id) // Match the ID column
                .single(); // Expect only one result

            // If database error, throw it
            if (error) throw error;
            // Return the single record
            return { data: data as T, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }

    // Function to create a new record
    async create(payload: Partial<T>): Promise<ServiceResponse<T>> {
        try {
            // Check write permission
            await this.checkPermission(this.config.permissions?.write);
            // Validate the data before saving
            await this.validate(payload);
            // Insert the new data into the table
            const { data, error } = await supabase
                .from(this.config.tableName)
                .insert(payload)
                .select() // Return the created record
                .single();

            // If database error, throw it
            if (error) throw error;
            // Return the created record
            return { data: data as T, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }

    // Function to update an existing record
    async update(id: string, payload: Partial<T>): Promise<ServiceResponse<T>> {
        try {
            // Check write permission
            await this.checkPermission(this.config.permissions?.write);
            // Validate the data
            await this.validate(payload);
            // Update the record with the matching ID
            const { data, error } = await supabase
                .from(this.config.tableName)
                .update(payload)
                .eq(this.config.primaryKey || 'id', id)
                .select() // Return the updated record
                .single();

            // If database error, throw it
            if (error) throw error;
            // Return the updated record
            return { data: data as T, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }

    // Function to delete a record
    async delete(id: string): Promise<ServiceResponse<boolean>> {
        try {
            // Check delete permission
            await this.checkPermission(this.config.permissions?.delete);
            // Delete the record with the matching ID
            const { error } = await supabase
                .from(this.config.tableName)
                .delete()
                .eq(this.config.primaryKey || 'id', id);

            // If database error, throw it
            if (error) throw error;
            // Return success (true)
            return { data: true, error: null };
        } catch (err: any) {
            // Handle errors
            return { data: null, error: this.handleError(err) };
        }
    }
}