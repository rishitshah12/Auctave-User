import { BaseService, ServiceResponse } from './base.service';
import { Factory } from './types';
import { supabase } from './supabaseClient';

// Database uses snake_case, but the app uses camelCase
interface FactoryDB {
    id: string;
    name: string;
    location: string;
    description: string;
    rating: number;
    turnaround: string;
    minimum_order_quantity: number;
    offer: string | null;
    cover_image_url: string;
    gallery: string[];
    tags: string[];
    certifications: string[];
    specialties: string[];
    machine_slots: any;
    catalog: any;
    created_at?: string;
    updated_at?: string;
}

export class FactoryService extends BaseService<Factory> {
    constructor() {
        super({
            tableName: 'factories',
            permissions: {
                read: 'factories.read',
                write: 'factories.write',
                delete: 'factories.delete'
            }
        });
    }

    // Map camelCase (App) to snake_case (DB)
    private toDatabase(factory: Partial<Factory>): Partial<FactoryDB> {
        const dbFactory: any = { ...factory };

        if (factory.minimumOrderQuantity !== undefined) {
            dbFactory.minimum_order_quantity = factory.minimumOrderQuantity;
            delete dbFactory.minimumOrderQuantity;
        }

        if (factory.imageUrl !== undefined) {
            dbFactory.cover_image_url = factory.imageUrl;
            delete dbFactory.imageUrl;
        }

        if (factory.machineSlots !== undefined) {
            dbFactory.machine_slots = factory.machineSlots;
            delete dbFactory.machineSlots;
        }

        return dbFactory;
    }

    // Map snake_case (DB) to camelCase (App)
    private fromDatabase(dbFactory: FactoryDB): Factory {
        return {
            id: dbFactory.id,
            name: dbFactory.name,
            location: dbFactory.location,
            description: dbFactory.description,
            rating: dbFactory.rating,
            turnaround: dbFactory.turnaround,
            minimumOrderQuantity: dbFactory.minimum_order_quantity,
            offer: dbFactory.offer,
            imageUrl: dbFactory.cover_image_url,
            gallery: dbFactory.gallery || [],
            tags: dbFactory.tags || [],
            certifications: dbFactory.certifications || [],
            specialties: dbFactory.specialties || [],
            machineSlots: dbFactory.machine_slots || [],
            catalog: dbFactory.catalog || { productCategories: [], fabricOptions: [] }
        };
    }

    async getAll(select: string = '*'): Promise<ServiceResponse<Factory[]>> {
        const result = await super.getAll(select);
        if (result.data) {
            return {
                data: result.data.map(dbFactory => this.fromDatabase(dbFactory as unknown as FactoryDB)),
                error: null
            };
        }
        return result;
    }

    async getById(id: string, select: string = '*'): Promise<ServiceResponse<Factory>> {
        const result = await super.getById(id, select);
        if (result.data) {
            return {
                data: this.fromDatabase(result.data as unknown as FactoryDB),
                error: null
            };
        }
        return result;
    }

    async create(payload: Partial<Factory>): Promise<ServiceResponse<Factory>> {
        const dbPayload = this.toDatabase(payload);
        const result = await super.create(dbPayload as Partial<Factory>);
        if (result.data) {
            return {
                data: this.fromDatabase(result.data as unknown as FactoryDB),
                error: null
            };
        }
        return result;
    }

    async update(id: string, payload: Partial<Factory>): Promise<ServiceResponse<Factory>> {
        const dbPayload = this.toDatabase(payload);
        const result = await super.update(id, dbPayload as Partial<Factory>);
        if (result.data) {
            return {
                data: this.fromDatabase(result.data as unknown as FactoryDB),
                error: null
            };
        }
        return result;
    }

    // Upload image to Supabase Storage
    async uploadImage(file: File): Promise<string> {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `factory-images/${fileName}`;

            const { error } = await supabase.storage
                .from('factories')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw new Error(`Upload failed: ${error.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('factories')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            throw new Error(`Image upload failed: ${error.message}`);
        }
    }
}

export const factoryService = new FactoryService();
