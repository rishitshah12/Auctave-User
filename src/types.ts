export interface UserProfile {
    name: string;
    companyName: string;
    phone: string;
    email: string;
    country: string;
    jobRole: string;
    categorySpecialization: string;
    yearlyEstRevenue: string;
    avatarUrl?: string;
    customerId?: string;
    // KYC / global trade fields
    website?: string;
    vatNumber?: string;
    businessRegNumber?: string;
    businessType?: string;
    billingAddress?: string;
    companyAddress?: string;
    // Structured billing address
    billingStreet?: string;
    billingCity?: string;
    billingState?: string;
    billingPostal?: string;
    billingCountry?: string;
    // Structured company/registered address
    companyStreet?: string;
    companyCity?: string;
    companyState?: string;
    companyPostal?: string;
    companyCountry?: string;
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
    productImageUrl?: string;
    productName?: string;
    // Fabric-specific fields
    fabricType?: 'Knitted' | 'Woven' | 'Crocheted';
    fabricWidth?: string;
    fabricWidthUOM?: 'inches' | 'cm';
    fabricWeightUOM?: 'GSM' | 'KG/m²' | 'oz/yd²' | 'GLM';
    fabricWeaveType?: string;
    fabricPrintTechnique?: string;
    fabricOrderType?: 'Ready' | 'Make To Order' | 'Custom';
    fabricOrderTypeCustom?: string;
    fabricStretch?: string;
    fabricFinish?: string;
    fabricQtyUOM?: 'meters' | 'yards' | 'kg';
    fabricColor?: string;
    fabricThreadCount?: string;
}

export interface OrderFormData {
    lineItems: LineItem[];
    shippingCountry: string;
    shippingPort: string;
    draftId?: string;
}

export interface ProductionLine {
    name: string;
    machinesCount: number;
    capacityPerMonth: number;
    status: 'vacant' | 'in-use' | 'maintenance';
    nextAvailableDate?: string; // ISO date string, relevant when in-use or maintenance
}

/** @deprecated Use ProductionLine instead */
export type MachineSlot = ProductionLine;

export interface CatalogProduct {
    id: string;
    name: string;
    description: string;
    category: string;
    subcategory?: string;
    images: string[];
    brochureUrl?: string;
    fabricComposition: string;
    availableColors: string[];
    sizeRange: string;
    moq?: number;
    priceRange?: string;
    leadTime?: string;
    tags: string[];
    featured?: boolean;
}

export interface FabricOption {
    name: string;
    composition: string;
    weightGSM?: string;
    useCases: string;
    swatchImageUrl?: string;
    pricePerMeter?: string;
}

export interface FactoryCatalog {
    products: CatalogProduct[];
    fabricOptions: FabricOption[];
    brochureUrl?: string;
    productCategories?: {
        name: string;
        description: string;
        imageUrl: string;
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
    productionLines: ProductionLine[];
    catalog: FactoryCatalog;
    trustTier?: 'unverified' | 'bronze' | 'silver' | 'gold';
    completedOrdersCount?: number;
    onTimeDeliveryRate?: number;
    qualityRejectionRate?: number;
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
    attachmentNames?: string[];
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
    clientAvatar?: string;
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
        adminLastRead?: string;   // ISO – when admin last opened this RFQ's chat
        clientLastRead?: string;  // ISO – when client last opened this RFQ's chat
    };
    modification_count?: number;
    modified_at?: string;
    sampleStatus?: 'Requested' | 'In Transit' | 'Received' | null;
}


export interface CrmProduct {
    id: string;
    name: string;
    category?: string;
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
    requiresDocument?: boolean;
    documentUrl?: string;
    documentFileName?: string;
    documentUploadedAt?: string;
    requiresBuyerConfirmation?: boolean;
    buyerConfirmedAt?: string;
    buyerDisputed?: boolean;
    disputeReason?: string;
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
    riskScore?: 'green' | 'amber' | 'red';
    riskScoreUpdatedAt?: string;
    deliveryDate?: string;
    source_quote_id?: string;
    // Shipping / logistics tracking (populated by admin when order is Shipped)
    trackingNumber?: string;
    containerNumber?: string;
    shippingCarrier?: string;
    estimatedDelivery?: string;
    // Auto-stamped by DB trigger: maps status → ISO timestamp of when it was reached
    statusChangedAt?: Partial<Record<'Pending' | 'In Production' | 'Quality Check' | 'Shipped' | 'Completed', string>>;
}


export interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}