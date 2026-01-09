// Import the base service class which provides common functionality for all services
import { BaseService, ServiceResponse } from './base.service';
// Import the Supabase client to interact with the database
import { supabase } from './supabaseClient';

// Define the CRMService class which handles all Customer Relationship Management (CRM) data operations
// It extends BaseService to inherit standard create, read, update, delete methods
export class CRMService extends BaseService<any> {
    // Constructor initializes the service with specific configuration for CRM orders
    constructor() {
        // Call the parent constructor with the table name and permission requirements
        super({
            tableName: 'crm_orders', // The database table this service interacts with
            permissions: {
                read: 'crm.read',     // Permission required to view orders
                write: 'crm.write',   // Permission required to create/update orders
                delete: 'crm.delete'  // Permission required to delete orders
            }
        });
    }

    // Custom function to fetch all orders belonging to a specific client
    // Takes the client's ID as input and returns a list of orders
    async getOrdersByClient(clientId: string): Promise<ServiceResponse<any[]>> {
        try {
            // Check if the user is an admin OR if they are fetching their own orders
            const { data: { user } } = await supabase.auth.getUser();
            const isOwnData = user?.id === clientId;

            // Only enforce strict permission check (via MasterController) if not accessing own data
            if (!isOwnData) {
                await this.checkPermission(this.config.permissions?.read);
            }
            
            // Query the database table defined in config (crm_orders)
            const { data, error } = await supabase
                .from(this.config.tableName)
                .select('*, factories(name, cover_image_url)') // Select all order fields AND fetch related factory details (name, image)
                .eq('client_id', clientId) // Filter results to match the specific client ID
                .order('created_at', { ascending: false }); // Sort the results so the newest orders appear first

            // If the database returns an error, throw it to be caught below
            if (error) throw error;
            
            // Return the successful data wrapped in a standard response format
            return { data, error: null };
        } catch (err: any) {
            // If any error occurs (permission or database), handle it gracefully and return the error info
            return { data: null, error: this.handleError(err) };
        }
    }
}

// Create and export a single instance of the service to be used throughout the app
export const crmService = new CRMService();