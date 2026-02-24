export interface UserProfile {
    name: string;
    companyName: string;
    phone: string;
    email: string;
    country: string;
    jobRole: string;
    categorySpecialization: string;
    yearlyEstRevenue: string;
}

export interface LineItem {
    id: number;
    category: string;
    fabricQuality: string;
    weightGSM: string;
    styleOption: string;
    qty: number;
    containerType?: string;
    targetPrice: string;
    packagingReqs: string;
    labelingReqs: string;
    sizeRange: string[];
    customSize: string;
    sizeRatio: Record<string, string>;
    sleeveOption: string;
    printOption: string;
    trimsAndAccessories: string;
    specialInstructions: string;
    quantityType?: 'units' | 'container';
}

export interface OrderFormData {
    lineItems: LineItem[];
    shippingCountry: string;
    shippingPort: string;
    draftId?: string;
}

export interface MachineSlot {
    machineType: string;
    availableSlots: number;
    totalSlots: number;
    nextAvailable: string;
}

export interface FactoryCatalog {
    productCategories: {
        name: string;
        description: string;
        imageUrl: string;
    }[];
    fabricOptions: {
        name: string;
        composition: string;
        useCases: string;
    }[];
}

export interface Factory {
    id: string;
    name: string;
    specialties: string[];
    rating: number;
    turnaround: string;
    offer: string | null;
    imageUrl: string;
    gallery: string[];
    location: string;
    tags: string[];
    description: string;
    minimumOrderQuantity: number;
    certifications: string[];
    machineSlots: MachineSlot[];
    catalog: FactoryCatalog;
}

export interface NegotiationHistoryItem {
    id: string;
    sender: 'client' | 'factory';
    message: string;
    price?: string;
    timestamp: string;
    action?: 'offer' | 'counter' | 'accept' | 'decline' | 'info';
    lineItemPrices?: { lineItemId: number; price: string }[];
    attachments?: string[];
    relatedLineItemId?: number;
}

export interface QuoteRequest {
    id: string;
    factory: any; // You can replace 'any' with 'Factory' if available
    order: OrderFormData;
    status: 'Pending' | 'Responded' | 'Accepted' | 'Declined' | 'In Negotiation' | 'Admin Accepted' | 'Client Accepted' | 'Trashed' | 'Draft';
    submittedAt: string;
    acceptedAt?: string;
    userId: string;
    files: string[];
    clientName?: string;
    companyName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientCountry?: string;
    clientJobRole?: string;
    clientRevenue?: string;
    clientSpecialization?: string;
    response_details?: {
        price: string;
        leadTime: string;
        notes: string;
        acceptedAt?: string;
        respondedAt?: string;
        lineItemResponses?: {
            lineItemId: number;
            price: string;
            notes?: string;
        }[];
    };
    negotiation_details?: {
        counterPrice?: string;
        message?: string;
        submittedAt?: string;
        lineItemNegotiations?: {
            lineItemId: number;
            counterPrice: string;
            notes?: string;
        }[];
        history?: NegotiationHistoryItem[];
        adminApprovedLineItems?: number[];
        clientApprovedLineItems?: number[];
    };
    modification_count?: number;
    modified_at?: string;
}


export interface CrmProduct {
    id: string;
    name: string;
    status?: 'Pending' | 'In Production' | 'Quality Check' | 'Shipped' | 'Completed';
    quantity?: number;
}

export interface CrmTask {
    id: number;
    name: string;
    responsible: string;
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string | null;
    actualEndDate: string | null;
    status: 'TO DO' | 'IN PROGRESS' | 'COMPLETE';
    color?: string;
    quantity?: number;
    productId?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    notes?: string;
    progress?: number;
}

export interface CrmDocument {
    name: string;
    type: string;
    lastUpdated: string;
    path?: string;
}

export interface CrmOrder {
    id?: string;
    customer: string;
    product: string;
    factoryId: string;
    status?: 'Pending' | 'In Production' | 'Quality Check' | 'Shipped' | 'Completed';
    createdAt?: string;
    destinationCountry?: string;
    shippingPort?: string;
    portOfDischarge?: string;
    documents: CrmDocument[];
    tasks: CrmTask[];
    products?: CrmProduct[];
    custom_factory_name?: string;
    custom_factory_location?: string;
}


export interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}