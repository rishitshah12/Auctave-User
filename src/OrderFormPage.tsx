// Import necessary React tools: FC (Functional Component type), ReactNode (for rendering children), useRef (for accessing DOM elements), and useState (for managing data).
import React, { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
// Import specific icons from the 'lucide-react' library to use in the form UI.
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft, Ruler, Scissors, Image as ImageIcon, FileText, Upload, AlertCircle, Globe, Anchor, Plus, Trash2, Copy, X, ChevronRight, Check, ArrowRight, SkipForward, Save, ChevronDown, Eye, Sparkles, Zap, Wand2, Edit,
    Clock, MapPin, ArrowUpDown, Info
} from 'lucide-react';
// Import the main layout wrapper which provides the sidebar and header structure.
import { MainLayout } from '../src/MainLayout';
// Import the TypeScript definition for the order form data structure.
import { OrderFormData, QuoteRequest, LineItem } from '../src/types';
import { formatFriendlyDate, getStatusColor, getStatusGradientBorder } from './utils';
import { useToast } from './ToastContext';

// Define the properties (props) that this component expects to receive from its parent (App.tsx).
interface OrderFormPageProps {
    // --- MainLayout Props ---
    // These props are passed down to the MainLayout component to control the overall app shell.
    pageKey: number; // Unique key to force re-rendering if needed.
    user: any; // The currently logged-in user object.
    currentPage: string; // The identifier for the page currently being viewed.
    isMenuOpen: boolean; // Boolean flag for mobile menu visibility.
    isSidebarCollapsed: boolean; // Boolean flag for desktop sidebar state.
    toggleMenu: () => void; // Function to toggle the mobile menu.
    setIsSidebarCollapsed: (isCollapsed: boolean) => void; // Function to toggle the sidebar.
    handleSetCurrentPage: (page: string, data?: any) => void; // Function to navigate between pages.
    handleSignOut: () => void; // Function to log the user out.
    
    // --- Page Specific Props ---
    // Function provided by App.tsx to handle the actual submission logic (saving to DB, etc.).
    // Returns a Promise that resolves to true on success, false on failure.
    handleSubmitOrderForm: (formData: OrderFormData, files: File[]) => Promise<boolean>;
    handleAddToQuoteRequest: (quoteId: string, formData: OrderFormData, files: File[]) => Promise<boolean>;
    quoteRequests: QuoteRequest[];
}

const generateId = () => Date.now() + Math.random();

// Category icons mapping for product cards
const CATEGORY_ICONS: Record<string, string> = {
    'T-Shirt': '👕',
    'Polo Shirt': '👔',
    'Hoodie': '🧥',
    'Sweatshirt': '🧥',
    'Jacket': '🧥',
    'Pants': '👖',
    'Shorts': '🩳',
    'Dress': '👗',
    'Skirt': '👗',
    'Tank Top': '🎽',
    'Sweater': '🧶',
    'Coat': '🧥',
    'default': '👚',
};

const CATEGORY_OPTIONS = [
    { id: 'T-shirt', label: 'T-Shirt', image: 'https://cpimg.tistatic.com/10767006/b/4/Plain-Cotton-Yellow-T-Shirt..jpg' },
    { id: 'Polo Shirt', label: 'Polo Shirt', image: 'https://warriorworld.in/cdn/shop/files/P3017-Black.jpg?v=1755498342' },
    { id: 'Hoodies', label: 'Hoodies', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80' },
    { id: 'Jeans', label: 'Jeans', image: 'https://www.ruff.in/cdn/shop/files/JK-12124-DENIMX_1_-min_e4ed2a01-c1f9-4685-b52b-1eb881ec1b8e.jpg?v=1739363803&width=1090://images.unsplash.com/photo--08f086302542?auto=format&fit=crop&w=400&q=80' },
    { id: 'Jackets', label: 'Jackets', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&q=80' },
    { id: 'Shirts', label: 'Formal Shirts', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&q=80' },
    { id: 'Casual Shirts', label: 'Casual Shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80' },
    { id: 'Trousers', label: 'Trousers', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=400&q=80' },
];

const FABRIC_SUGGESTIONS = [
    "100% Cotton", "100% Organic Cotton", "Polyester", "Cotton/Poly Blend", "French Terry", "Denim", "Linen", "Bamboo"
];

const SLEEVE_OPTIONS = [
    { id: 'Short Sleeve', label: 'Short Sleeve', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80' },
    { id: 'Long Sleeve', label: 'Long Sleeve', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2HAKU0Xms7S4pHBtG3X3ZNRql79EVDOW3zw&ssl=1' },
    { id: 'Sleeveless', label: 'Sleeveless', image: 'https://thebanyantee.com/cdn/shop/files/custom-vest-black.png?v=1720260429&width=1445' },
    { id: 'Raglan', label: 'Raglan', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRomomQv6-ImLcyJM4sto1ljljo9wFPGyyIKg&s' },
];

const PRINT_OPTIONS = [
    { id: 'Screen Print', label: 'Screen Print', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=300&q=80' },
    { id: 'Digital Print', label: 'Digital Print', image: 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&w=300&q=80' },
    { id: 'Embroidery', label: 'Embroidery', image: 'https://qikink.com/_next/image?url=%2Fimages%2Fcustom-embroidery%2Fcustom-embroidery.png&w=3840&q=75' },
    { id: 'Heat Transfer', label: 'Heat Transfer', image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=300&q=80' },
    { id: 'None', label: 'Solid / None', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80' },
];

const PACKAGING_OPTIONS = [
    { id: 'Individual Polybag', label: 'Polybag', image: 'https://5.imimg.com/data5/GG/PB/MY-45570512/t-shirts-packing-bags-500x500.jpg' },
    { id: 'Bulk Packed', label: 'Carton', image: 'https://www.packingsupply.in/web/templates/images/products/1523101691-Rectangle-corrugated-boxes-cartons.jpg' },
    { id: 'Custom Box', label: 'Custom Box', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsCWSiMP9EOL7LGe0qa605OaPsyDGIxMAodg&s' },
    { id: 'Hang Tag & Folded', label: 'Compressed', image: 'https://i.pinimg.com/736x/30/5d/84/305d84045ba88b0f5ee27c204696accd.jpg' },
    { id: 'Eco-friendly Packaging', label: 'Eco-Friendly', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhu7csV4WhSkWpYNLizVqx0M6MlOieScyPCA&s' },
];

// Product accent colors for visual distinction
const PRODUCT_COLORS = [
    { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500' },
    { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500' },
    { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500' },
    { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-500' },
    { bg: 'bg-pink-500', light: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-500' },
    { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500' },
];

// Calculate product completion percentage
const calculateProductCompletion = (item: any): { percentage: number; filledFields: number; totalFields: number } => {
    const requiredFields = [
        { key: 'category', check: (v: any) => v && v !== '' },
        { key: 'fabricQuality', check: (v: any) => v && v !== '' },
        { key: 'weightGSM', check: (v: any) => v && Number(v) > 0 },
        { key: 'qty', check: (v: any) => v && v > 0 },
        { key: 'sizeRange', check: (v: any) => v && v.length > 0 },
        { key: 'packagingReqs', check: (v: any) => v && v !== '' },
    ];

    let filled = 0;
    requiredFields.forEach(field => {
        if (field.check(item[field.key])) filled++;
    });

    return {
        percentage: Math.round((filled / requiredFields.length) * 100),
        filledFields: filled,
        totalFields: requiredFields.length
    };
};

const getCategoryIcon = (category: string): string => {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS['default'];
};

// --- Diff utility for modification tracking ---
type ItemModificationStatus = 'new' | 'modified' | 'unchanged' | 'removed';

interface FieldChange {
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
}

interface ItemDiff {
    status: ItemModificationStatus;
    changes: FieldChange[];
    item: LineItem;
    originalItem?: LineItem;
}

const DIFF_FIELD_LABELS: Record<string, string> = {
    category: 'Category', fabricQuality: 'Fabric', weightGSM: 'Weight (GSM)',
    qty: 'Quantity', containerType: 'Container', targetPrice: 'Target Price',
    packagingReqs: 'Packaging', labelingReqs: 'Labeling', sizeRange: 'Sizes',
    sleeveOption: 'Sleeve', printOption: 'Print', trimsAndAccessories: 'Trims',
    specialInstructions: 'Instructions', quantityType: 'Qty Type', styleOption: 'Style',
};

const computeLineItemDiffs = (currentItems: LineItem[], originalItems: LineItem[]): ItemDiff[] => {
    const diffs: ItemDiff[] = [];
    const matchedOriginalIds = new Set<number>();

    currentItems.forEach(currentItem => {
        const originalItem = originalItems.find(o => o.id === currentItem.id);
        if (!originalItem) {
            diffs.push({ status: 'new', changes: [], item: currentItem });
        } else {
            matchedOriginalIds.add(originalItem.id);
            const changes: FieldChange[] = [];
            (Object.keys(DIFF_FIELD_LABELS) as (keyof LineItem)[]).forEach(field => {
                const oldVal = originalItem[field];
                const newVal = currentItem[field];
                const oldStr = Array.isArray(oldVal) ? (oldVal as string[]).sort().join(', ') : String(oldVal ?? '');
                const newStr = Array.isArray(newVal) ? (newVal as string[]).sort().join(', ') : String(newVal ?? '');
                if (oldStr !== newStr) {
                    changes.push({ field: field as string, label: DIFF_FIELD_LABELS[field as string], oldValue: oldStr || '(empty)', newValue: newStr || '(empty)' });
                }
            });
            diffs.push(changes.length > 0
                ? { status: 'modified', changes, item: currentItem, originalItem }
                : { status: 'unchanged', changes: [], item: currentItem, originalItem }
            );
        }
    });

    originalItems.forEach(originalItem => {
        if (!matchedOriginalIds.has(originalItem.id)) {
            diffs.push({ status: 'removed', changes: [], item: originalItem, originalItem });
        }
    });

    return diffs;
};

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. 'Swaziland')", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const fetchPortsForCountry = async (country: string): Promise<string[]> => {
    // Simulated API call to fetch ports based on country
    await new Promise(resolve => setTimeout(resolve, 300));
    const portsMap: Record<string, string[]> = {
        "Afghanistan": ["Kabul (KBL)", "Hairatan (AFHIR)", "Aqina (AFAQI)"],
        "Albania": ["Durres (ALDRZ)", "Vlore (ALVOA)"],
        "Algeria": ["Algiers (DZALG)", "Oran (DZORN)", "Bejaia (DZBJA)", "Skikda (DZSKI)"],
        "Andorra": ["Andorra la Vella (ADALV)"],
        "Angola": ["Luanda (AOLAD)", "Lobito (AOLOB)", "Namibe (AOMSB)"],
        "Antigua and Barbuda": ["St. John's (AGANU)"],
        "Argentina": ["Buenos Aires (ARBUE)", "Rosario (ARROS)", "Bahia Blanca (ARBHI)"],
        "Armenia": ["Yerevan (AMEVN)"],
        "Australia": ["Sydney (AUSYD)", "Melbourne (AUMEL)", "Brisbane (AUBNE)", "Fremantle (AUFRE)"],
        "Austria": ["Vienna (ATVIE)", "Linz (ATLIN)"],
        "Azerbaijan": ["Baku (AZBAK)"],
        "Bahamas": ["Nassau (BSNAS)", "Freeport (BSFPO)"],
        "Bahrain": ["Khalifa Bin Salman (BHKBS)", "Mina Sulman (BHMIS)"],
        "Bangladesh": ["Chittagong (BDCGP)", "Mongla (BDMGL)", "Payra (BDPRA)"],
        "Barbados": ["Bridgetown (BBBGI)"],
        "Belarus": ["Minsk (BYMSQ)"],
        "Belgium": ["Antwerp (BEANR)", "Zeebrugge (BEZEE)", "Ghent (BEGNE)"],
        "Belize": ["Belize City (BZBZE)", "Big Creek (BZBCR)"],
        "Benin": ["Cotonou (BJCOO)"],
        "Bhutan": ["Phuentsholing (BTPHU)"],
        "Bolivia": ["Puerto Aguirre (BOPUA)", "Puerto Suarez (BOPSZ)"],
        "Bosnia and Herzegovina": ["Ploce (HRPLO)"],
        "Botswana": ["Gaborone (BWGBE)"],
        "Brazil": ["Santos (BRSSZ)", "Paranagua (BRPNG)", "Rio de Janeiro (BRRIO)", "Itajai (BRIOA)"],
        "Brunei": ["Muara (BNMUA)"],
        "Bulgaria": ["Varna (BGVAR)", "Burgas (BGBOJ)"],
        "Burkina Faso": ["Ouagadougou (BFOUA)"],
        "Burundi": ["Bujumbura (BIBJM)"],
        "Cabo Verde": ["Praia (CVRAI)", "Mindelo (CVMDE)"],
        "Cambodia": ["Sihanoukville (KHKOS)", "Phnom Penh (KHPNH)"],
        "Cameroon": ["Douala (CMDLA)", "Kribi (CMKRI)"],
        "Canada": ["Vancouver (CAVAN)", "Montreal (CAMTR)", "Halifax (CAHAL)", "Prince Rupert (CAPRR)"],
        "Central African Republic": ["Bangui (CFBGF)"],
        "Chad": ["N'Djamena (TDNDJ)"],
        "Chile": ["San Antonio (CLSAI)", "Valparaiso (CLVAP)", "Iquique (CLIQQ)"],
        "China": ["Shanghai (CNSHA)", "Ningbo (CNNGB)", "Shenzhen (CNSZX)", "Guangzhou (CNCAN)", "Qingdao (CNTAO)", "Tianjin (CNTSN)", "Xiamen (CNXMN)", "Dalian (CNDLC)"],
        "Colombia": ["San Buenaventura (COBUN)", "Cartagena (COCTG)", "Barranquilla (COBAQ)"],
        "Comoros": ["Moroni (KMMOR)"],
        "Congo (Congo-Brazzaville)": ["Pointe Noire (CGPNR)"],
        "Costa Rica": ["Puerto Limon (CRLIO)", "Caldera (CRCAL)"],
        "Croatia": ["Rijeka (HRRJK)", "Ploce (HRPLO)"],
        "Cuba": ["Mariel (CUMAR)", "Havana (CUHAV)"],
        "Cyprus": ["Limassol (CYLMS)", "Larnaca (CYLCA)"],
        "Czechia (Czech Republic)": ["Prague (CZPRG)"],
        "Democratic Republic of the Congo": ["Matadi (CDMAT)", "Boma (CDBOA)"],
        "Denmark": ["Aarhus (DKAAR)", "Copenhagen (DKCPH)"],
        "Djibouti": ["Djibouti (DJJIB)"],
        "Dominica": ["Roseau (DMRSU)"],
        "Dominican Republic": ["Caucedo (DOCAU)", "Rio Haina (DOHAI)"],
        "Ecuador": ["Guayaquil (ECGYQ)", "Esmeraldas (ECESM)"],
        "Egypt": ["Alexandria (EGALY)", "Damietta (EGDAM)", "Port Said (EGPSD)"],
        "El Salvador": ["Acajutla (SVACA)"],
        "Equatorial Guinea": ["Malabo (GQSSG)"],
        "Eritrea": ["Massawa (ERMSW)"],
        "Estonia": ["Tallinn (EETLL)", "Muuga (EEMUG)"],
        "Eswatini (fmr. 'Swaziland')": ["Manzini (SZMTS)"],
        "Ethiopia": ["Modjo (ETMOD)"],
        "Fiji": ["Suva (FJSUV)", "Lautoka (FJLTK)"],
        "Finland": ["Helsinki (FIHEL)", "Kotka (FIKTK)"],
        "France": ["Le Havre (FRLEH)", "Marseille (FRMRS)", "Fos-sur-Mer (FRFOS)"],
        "Gabon": ["Libreville (GALBV)", "Owendo (GAOWE)"],
        "Gambia": ["Banjul (GMBJL)"],
        "Georgia": ["Poti (GEPTI)", "Batumi (GEBUS)"],
        "Germany": ["Hamburg (DEHAM)", "Bremerhaven (DEBRV)", "Wilhelmshaven (DEWVN)"],
        "Ghana": ["Tema (GHTEM)", "Takoradi (GHTKD)"],
        "Greece": ["Piraeus (GRPIR)", "Thessaloniki (GRSKG)"],
        "Grenada": ["St. George's (GDSTG)"],
        "Guatemala": ["Puerto Quetzal (GTPRQ)", "Santo Tomas de Castilla (GTSTC)"],
        "Guinea": ["Conakry (GNCKY)"],
        "Guinea-Bissau": ["Bissau (GWBXO)"],
        "Guyana": ["Georgetown (GYGEO)"],
        "Haiti": ["Port-au-Prince (HTPAP)"],
        "Holy See": ["Vatican City (VAT)"],
        "Honduras": ["Puerto Cortes (HNPCR)"],
        "Hungary": ["Budapest (HUBUT)"],
        "Iceland": ["Reykjavik (ISREY)"],
        "India": ["Mumbai (INBOM)", "Chennai (INMAA)", "Mundra (INMUN)", "Kolkata (INCCU)", "Cochin (INCOK)", "Visakhapatnam (INVTZ)", "Krishnapatnam (INKRI)"],
        "Indonesia": ["Jakarta (IDJKT)", "Surabaya (IDSUB)", "Semarang (IDSRG)", "Belawan (IDBLW)"],
        "Iran": ["Bandar Abbas (IRBND)"],
        "Iraq": ["Umm Qasr (IQUQR)"],
        "Ireland": ["Dublin (IEDUB)", "Cork (IECORK)"],
        "Israel": ["Ashdod (ILASH)", "Haifa (ILHFA)"],
        "Italy": ["Genoa (ITGOA)", "La Spezia (ITSPE)", "Gioia Tauro (ITGIT)", "Naples (ITNAP)"],
        "Jamaica": ["Kingston (JMKIN)"],
        "Japan": ["Tokyo (JPTYO)", "Yokohama (JPYOK)", "Nagoya (JPNGO)", "Kobe (JPUKB)", "Osaka (JPOSA)"],
        "Jordan": ["Aqaba (JOAQJ)"],
        "Kazakhstan": ["Aktau (KZSCO)"],
        "Kenya": ["Mombasa (KEMBA)"],
        "Kiribati": ["Tarawa (KITRW)"],
        "Kuwait": ["Shuwaikh (KWSWK)", "Shuaiba (KWSAA)"],
        "Kyrgyzstan": ["Bishkek (KGFRU)"],
        "Laos": ["Vientiane (LAVTE)"],
        "Latvia": ["Riga (LVRIG)"],
        "Lebanon": ["Beirut (LBBEY)", "Tripoli (LBKYE)"],
        "Lesotho": ["Maseru (LSMAS)"],
        "Liberia": ["Monrovia (LRMLW)"],
        "Libya": ["Tripoli (LBKYE)", "Misurata (LBMRA)"],
        "Liechtenstein": ["Vaduz (LIVAD)"],
        "Lithuania": ["Klaipeda (LTKLJ)"],
        "Luxembourg": ["Luxembourg (LULUX)"],
        "Madagascar": ["Toamasina (MGTMM)"],
        "Malawi": ["Lilongwe (MWLLW)"],
        "Malaysia": ["Port Klang (MYPKG)", "Tanjung Pelepas (MYTPP)", "Penang (MYPEN)"],
        "Maldives": ["Male (MVMLE)"],
        "Mali": ["Bamako (BKO)"],
        "Malta": ["Marsaxlokk (MTMAR)", "Valletta (MTMLA)"],
        "Marshall Islands": ["Majuro (MHMAJ)"],
        "Mauritania": ["Nouakchott (MRNKC)"],
        "Mauritius": ["Port Louis (MPPLU)"],
        "Mexico": ["Manzanillo (MXZLO)", "Lazaro Cardenas (MXLZC)", "Veracruz (MXVER)", "Altamira (MXATM)"],
        "Micronesia": ["Pohnpei (FMPNI)"],
        "Moldova": ["Giurgiulesti (MDGIU)"],
        "Monaco": ["Monaco (MCMON)"],
        "Mongolia": ["Ulaanbaatar (MNULN)"],
        "Montenegro": ["Bar (MEBAR)"],
        "Morocco": ["Casablanca (MACAS)", "Tangier (MATNG)"],
        "Mozambique": ["Maputo (MZMPM)", "Beira (MZBEI)"],
        "Myanmar (formerly Burma)": ["Yangon (MMRGN)"],
        "Namibia": ["Walvis Bay (NAWVB)"],
        "Nauru": ["Yaren (NRINU)"],
        "Nepal": ["Kathmandu (NPKTM)"],
        "Netherlands": ["Rotterdam (NLRTM)", "Amsterdam (NLAMS)"],
        "New Zealand": ["Auckland (NZAKL)", "Tauranga (NZTRG)", "Lyttelton (NZLYT)"],
        "Nicaragua": ["Corinto (NICOR)"],
        "Niger": ["Niamey (NENIM)"],
        "Nigeria": ["Lagos (NGLOS)", "Tincan (NGTIN)", "Onne (NGONN)"],
        "North Korea": ["Nampo (KPNAM)"],
        "North Macedonia": ["Skopje (MKSKP)"],
        "Norway": ["Oslo (NOOSL)", "Bergen (NOBGO)"],
        "Oman": ["Salalah (OMSLL)", "Sohar (OMSOH)"],
        "Pakistan": ["Karachi (PKKHI)", "Port Qasim (PKBQM)"],
        "Palau": ["Koror (PWROR)"],
        "Palestine State": ["Gaza (PSGAZ)"],
        "Panama": ["Balboa (PABLB)", "Cristobal (PACTB)", "Manzanillo (PAMIT)"],
        "Papua New Guinea": ["Port Moresby (PGPOM)", "Lae (PGLAE)"],
        "Paraguay": ["Asuncion (PYASU)"],
        "Peru": ["Callao (PECLL)", "Paita (PEPAI)"],
        "Philippines": ["Manila (PHMNL)", "Subic Bay (PHSFS)", "Cebu (PHCEB)"],
        "Poland": ["Gdynia (PLGDY)", "Gdansk (PLGDN)"],
        "Portugal": ["Sines (PTSIN)", "Leixoes (PTLEI)", "Lisbon (PTLIS)"],
        "Qatar": ["Hamad Port (QAHMD)"],
        "Romania": ["Constanta (ROCND)"],
        "Russia": ["St. Petersburg (RULED)", "Novorossiysk (RUNVS)", "Vladivostok (RUVVO)", "Vostochny (RUVYP)"],
        "Rwanda": ["Kigali (RWKGL)"],
        "Saint Kitts and Nevis": ["Basseterre (KNBAS)"],
        "Saint Lucia": ["Castries (LCCAS)"],
        "Saint Vincent and the Grenadines": ["Kingstown (VCKTN)"],
        "Samoa": ["Apia (WSAPW)"],
        "San Marino": ["San Marino (SMSMR)"],
        "Sao Tome and Principe": ["Sao Tome (STTMS)"],
        "Saudi Arabia": ["Jeddah (SAJED)", "Dammam (SADMM)", "King Abdullah Port (SAKAP)"],
        "Senegal": ["Dakar (SNDKR)"],
        "Serbia": ["Belgrade (RSBEG)"],
        "Seychelles": ["Victoria (SCPOV)"],
        "Sierra Leone": ["Freetown (SLFNA)"],
        "Singapore": ["Singapore (SGSIN)"],
        "Slovakia": ["Bratislava (SKBTS)"],
        "Slovenia": ["Koper (SIKOP)"],
        "Solomon Islands": ["Honiara (SBHIR)"],
        "Somalia": ["Mogadishu (SOMGQ)", "Berbera (SOBBO)"],
        "South Africa": ["Durban (ZADUR)", "Cape Town (ZACPT)", "Ngqura (ZANGQ)", "Port Elizabeth (ZAPLZ)"],
        "South Korea": ["Busan (KRPUS)", "Incheon (KRINC)", "Gwangyang (KRKAN)"],
        "South Sudan": ["Juba (SSJUB)"],
        "Spain": ["Algeciras (ESALG)", "Valencia (ESVLC)", "Barcelona (ESBCN)"],
        "Sri Lanka": ["Colombo (LKCMB)"],
        "Sudan": ["Port Sudan (SDPZU)"],
        "Suriname": ["Paramaribo (SRPBM)"],
        "Sweden": ["Gothenburg (SEGOT)"],
        "Switzerland": ["Basel (CHBSL)"],
        "Syria": ["Latakia (SYLTK)"],
        "Tajikistan": ["Dushanbe (TJDYU)"],
        "Tanzania": ["Dar es Salaam (TZDAR)"],
        "Thailand": ["Laem Chabang (THLCH)", "Bangkok (THBKK)"],
        "Timor-Leste": ["Dili (TLDIL)"],
        "Togo": ["Lome (TGLFW)"],
        "Tonga": ["Nuku'alofa (TONUK)"],
        "Trinidad and Tobago": ["Port of Spain (TTPOS)"],
        "Tunisia": ["Rades (TNRDS)"],
        "Turkey": ["Ambarli (TRAMB)", "Mersin (TRMER)", "Izmir (TRIZM)"],
        "Turkmenistan": ["Turkmenbashi (TMKRW)"],
        "Tuvalu": ["Funafuti (TVFUN)"],
        "Uganda": ["Kampala (UGKLA)"],
        "Ukraine": ["Odessa (UAODS)"],
        "United Arab Emirates": ["Jebel Ali (AEJEA)", "Khalifa Port (AEKHL)"],
        "United Kingdom": ["Felixstowe (GBFXT)", "Southampton (GBSOU)", "London Gateway (GBLGP)", "Liverpool (GBLIV)", "Immingham (GBIMM)"],
        "United States of America": ["Los Angeles (USLAX)", "Long Beach (USLGB)", "New York (USNYC)", "Savannah (USSAV)", "Seattle (USSEA)", "Houston (USHOU)", "Norfolk (USORF)", "Oakland (USOAK)", "Miami (USMIA)"],
        "Uruguay": ["Montevideo (UYMVD)"],
        "Uzbekistan": ["Tashkent (UZTAS)"],
        "Vanuatu": ["Port Vila (VUPLI)"],
        "Venezuela": ["La Guaira (VELAG)", "Puerto Cabello (VEPBL)"],
        "Vietnam": ["Ho Chi Minh City (VNSGN)", "Hai Phong (VNHPH)", "Da Nang (VNDAD)", "Cai Mep (VNCMT)"],
        "Yemen": ["Aden (YEADE)"],
        "Zambia": ["Lusaka (ZMLUN)"],
        "Zimbabwe": ["Harare (ZWHRE)"]
    };
    return portsMap[country] || ["Main Port", "Secondary Port", "Airport Cargo"];
};

// --- File Drop Zone Component ---
const FileDropZone: FC<{
    label: string;
    accept: string;
    multiple?: boolean;
    onFilesSelected: (files: File[]) => void;
    icon: ReactNode;
    selectedFiles: File[];
    previews?: string[];
    onFileRemoved?: (index: number) => void;
}> = ({ label, accept, multiple, onFilesSelected, icon, selectedFiles, previews, onFileRemoved }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [previewModal, setPreviewModal] = useState<{ src: string; name: string } | null>(null);
    const { showToast } = useToast();

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    const validateFiles = (files: File[]) => {
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        files.forEach(file => {
            if (file.size <= MAX_FILE_SIZE) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        });

        if (invalidFiles.length > 0) {
            showToast(`File(s) too large (max 50MB): ${invalidFiles.join(', ')}`, 'error');
        }
        return validFiles;
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const validFiles = validateFiles(files);
            if (validFiles.length > 0) {
                onFilesSelected(validFiles);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const validFiles = validateFiles(files);
            if (validFiles.length > 0) {
                onFilesSelected(validFiles);
            }
            e.target.value = ''; // Reset input to allow re-selection
        }
    };

    const handleRemoveFile = (index: number) => {
        if (onFileRemoved) {
            onFileRemoved(index);
        } else {
            // Fallback: remove file from array and call onFilesSelected
            const newFiles = selectedFiles.filter((_, i) => i !== index);
            onFilesSelected(newFiles);
        }
    };

    const handlePreviewFile = (file: File, previewSrc?: string) => {
        if (previewSrc) {
            // Image file with preview
            setPreviewModal({ src: previewSrc, name: file.name });
        } else if (file.type.startsWith('image/')) {
            // Image file without preview URL - create one
            const url = URL.createObjectURL(file);
            setPreviewModal({ src: url, name: file.name });
        } else {
            // Non-image file - open in new tab
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
        }
    };

    const inputId = `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</label>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group relative ${
                    isDragging
                        ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 scale-[1.02]'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
            >
                <div className={`mb-4 p-4 rounded-full transition-colors ${isDragging ? 'bg-white text-[#c20c0b]' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:text-[#c20c0b] group-hover:bg-white'}`}>
                    {icon}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    <span className="text-[#c20c0b] underline decoration-dotted">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {accept.replace(/\./g, '').toUpperCase().split(',').join(', ')} (Max 50MB)
                </p>
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileChange}
                    className="hidden"
                    id={inputId}
                />
                <label htmlFor={inputId} className="absolute inset-0 cursor-pointer" />
            </div>

            {/* File Grid / Previews */}
            {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                    {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
                            {previews && previews[idx] ? (
                                <div className="aspect-square relative">
                                    <img src={previews[idx]} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => handlePreviewFile(file, previews[idx])} className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"><Eye size={16}/></button>
                                        <button type="button" onClick={() => handleRemoveFile(idx)} className="p-1.5 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 flex items-center gap-2">
                                    <FileText size={20} className="text-gray-400" />
                                    <span className="text-xs truncate flex-1">{file.name}</span>
                                    <button type="button" onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Image Preview Modal */}
            {previewModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewModal(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => setPreviewModal(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"><X size={20}/></button>
                        <img src={previewModal.src} alt={previewModal.name} className="max-w-full max-h-[85vh] object-contain" />
                        <div className="p-4 bg-white dark:bg-gray-900 text-center font-medium text-gray-800 dark:text-white">{previewModal.name}</div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- Quote Selection Card Component ---
const QuoteSelectionCard: FC<{ quote: QuoteRequest, onSelect: () => void }> = ({ quote, onSelect }) => {
    const totalUnits = quote.order?.lineItems?.reduce((sum, item) => item.quantityType === 'units' ? sum + (item.qty || 0) : sum, 0) || 0;
    const hasContainers = quote.order?.lineItems?.some(i => i.quantityType === 'container');
    const categories = Array.from(new Set(quote.order?.lineItems?.map(i => i.category) || []));
    const productCount = quote.order?.lineItems?.length || 0;

    return (
        <div onClick={onSelect} className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 cursor-pointer transition-all duration-300 group bg-white dark:bg-gray-800/50 hover:shadow-xl hover:-translate-y-1 hover:border-[#c20c0b] dark:hover:border-[#c20c0b]">
            {/* Status gradient top bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${getStatusGradientBorder(quote.status)}`} />

            {/* Selection check indicator */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-100 scale-75">
                <div className="bg-[#c20c0b] text-white p-1.5 rounded-full shadow-lg"><Check size={14} /></div>
            </div>

            {/* Header: ID + Status Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    #{quote.id.slice(0, 8)}
                </span>
                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(quote.status)}`}>
                    {quote.status}
                </span>
            </div>

            {/* Factory info */}
            {quote.factory && (
                <div className="flex items-center gap-2.5 mb-3">
                    <img className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600 shadow-sm" src={quote.factory.imageUrl} alt={quote.factory.name} />
                    <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-white leading-tight">{quote.factory.name}</p>
                        {quote.factory.location && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center mt-0.5">
                                <MapPin size={10} className="mr-0.5" />{quote.factory.location}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Product category chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {categories.slice(0, 3).map(cat => {
                    const catOption = CATEGORY_OPTIONS.find(c => c.id === cat);
                    const icon = getCategoryIcon(cat);
                    return (
                        <div key={cat} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1">
                            {catOption?.image ? (
                                <img src={catOption.image} alt={cat} className="w-5 h-5 rounded object-cover" />
                            ) : (
                                <span className="text-sm">{icon}</span>
                            )}
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{cat}</span>
                        </div>
                    );
                })}
                {categories.length > 3 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 self-center">+{categories.length - 3} more</span>
                )}
            </div>

            {/* Footer: Date, Product Count, Units */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                    <Clock size={12} />
                    <span>{formatFriendlyDate(quote.submittedAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                        {productCount} {productCount === 1 ? 'product' : 'products'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">
                        {totalUnits > 0 ? `${totalUnits.toLocaleString()} units` : hasContainers ? 'Container' : '0 units'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Define the OrderFormPage component using the props interface defined above.



// --- Helper Component ---
// A small reusable component to render a form field with a label and an icon.
const FormField: FC<{ icon: ReactNode; label: string; children: ReactNode; required?: boolean; error?: string }> = ({ icon, label, children, required, error }) => (
    <div className="group">
        {/* Render the label text above the input */}
        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 group-hover:text-[#c20c0b]'}`}>
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {/* Position the icon inside the input area on the left side */}
            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${error ? 'text-red-500' : 'text-gray-400 group-hover:text-[#c20c0b]'}`}>
                {icon}
            </div>
            {/* Render the actual input element (passed as children) */}
            {children}
        </div>
        {error && <p className="mt-1 text-xs text-red-500 font-medium animate-pulse">{error}</p>}
    </div>
);

// Define the OrderFormPage component using the props interface defined above.
export const OrderFormPage: FC<OrderFormPageProps> = (props) => {
    // Destructure (extract) specific functions we need from the props object.
    const { handleSetCurrentPage, handleSubmitOrderForm, handleAddToQuoteRequest, quoteRequests } = props;

    const [orderType, setOrderType] = useState<'new' | 'existing'>('new');
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
    const [originalLineItems, setOriginalLineItems] = useState<LineItem[]>([]);
    const [showLandingPage, setShowLandingPage] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Track step per product - each product maintains its own step position
    const [productSteps, setProductSteps] = useState<Record<number, number>>({ 0: 1 });
    const { showToast } = useToast();
    const DRAFT_KEY = 'garment_erp_order_draft';
    const SAVED_DRAFTS_KEY = 'garment_erp_saved_drafts';

    // --- State Management ---
    // Initialize the form state with default values so the fields aren't empty when the user arrives.
    const [formState, setFormState] = useState<OrderFormData>(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                return JSON.parse(savedDraft);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
        return {
            lineItems: [{
                id: generateId(),
                category: 'T-shirt',
                qty: 0,
                containerType: '',
                fabricQuality: '',
                weightGSM: '',
                targetPrice: '',
                packagingReqs: '',
                labelingReqs: '',
                styleOption: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }],
            shippingCountry: '',
            shippingPort: ''
        };
    });

    // Auto-save draft every 30 seconds
    useEffect(() => {
        const autoSaveTimer = setInterval(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
        }, 30000);
        return () => clearInterval(autoSaveTimer);
    }, [formState]);

    const [activeItemIndex, setActiveItemIndex] = useState(0);

    // Computed current step based on active product
    const currentStep = productSteps[activeItemIndex] || 1;

    // Helper to update step for current product only
    const setCurrentStep = (step: number | ((prev: number) => number)) => {
        setProductSteps(prev => ({
            ...prev,
            [activeItemIndex]: typeof step === 'function' ? step(prev[activeItemIndex] || 1) : step
        }));
    };

    // State to hold the list of files uploaded by the user.
    const [sampleFiles, setSampleFiles] = useState<File[]>([]);
    const [samplePreviews, setSamplePreviews] = useState<string[]>([]);
    // Ref to track preview URLs for cleanup on unmount only
    const samplePreviewsRef = useRef<string[]>([]);
    const [docFiles, setDocFiles] = useState<File[]>([]);
    const [availablePorts, setAvailablePorts] = useState<string[]>([]);
    const [isLoadingPorts, setIsLoadingPorts] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    const containerOptions = ["20ft FCL", "40ft FCL", "20ft HC FCL", "40ft HC FCL"];

    useEffect(() => {
        if (formState.shippingCountry) {
            setIsLoadingPorts(true);
            setAvailablePorts([]); // Clear previous ports to avoid confusion
            fetchPortsForCountry(formState.shippingCountry).then(ports => {
                setAvailablePorts(ports);
                setIsLoadingPorts(false);
            });
        } else {
            setAvailablePorts([]);
        }
    }, [formState.shippingCountry]);

    // Create a reference to the hidden file input element so we can reset it if needed.
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInputClass = (error?: string) => `w-full pl-10 p-3.5 bg-white dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-900 transition-all duration-200 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-[#c20c0b] focus:border-transparent'} text-gray-900 dark:text-white`;

    // --- Event Handlers ---

    // Function to handle changes in text inputs, textareas, and select dropdowns.
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { 
        // Extract the 'name' (which field changed) and 'value' (what the user typed) from the event target.
        const { name, value } = e.target; 

        // Prevent negative numbers for number inputs
        if (e.target.getAttribute('type') === 'number' && parseFloat(value) < 0) {
            return;
        }

        // Update the form state, keeping previous values (...prev) and overwriting the changed field.
        setFormState(prev => {
            if (name === 'shippingCountry') {
                if (orderType === 'existing') return prev;
                setErrors(prev => ({ ...prev, shippingCountry: '' }));
                return { ...prev, [name]: value, shippingPort: '' };
            }
            if (name === 'shippingPort') {
                if (orderType === 'existing') return prev;
                setErrors(prev => ({ ...prev, shippingPort: '' }));
                return { ...prev, [name]: value };
            }
            // Update active line item
            const newItems = [...prev.lineItems];
            // Clear error for this field
            if (errors[`lineItems[${activeItemIndex}].${name}`]) {
                setErrors(prev => ({ ...prev, [`lineItems[${activeItemIndex}].${name}`]: '' }));
            }
            if (name === 'qty') {
                newItems[activeItemIndex] = { ...newItems[activeItemIndex], [name]: value === '' ? 0 : parseFloat(value) };
            } else {
                newItems[activeItemIndex] = { ...newItems[activeItemIndex], [name]: value };
            }
            return { ...prev, lineItems: newItems };
        }); 
    };

    const handleOrderTypeChange = (type: 'new' | 'existing') => {
        setOrderType(type);
        setShowLandingPage(false);
        setSelectedQuoteId(null);
        setOriginalLineItems([]);
        // Reset form to default state
        setFormState({
            lineItems: [{
                id: generateId(),
                category: 'T-shirt',
                qty: 0,
                containerType: '',
                fabricQuality: '',
                weightGSM: '',
                targetPrice: '',
                packagingReqs: '',
                labelingReqs: '',
                styleOption: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }],
            shippingCountry: '',
            shippingPort: ''
        });
        setErrors({});
        setSampleFiles([]);
        setDocFiles([]);
        setSamplePreviews([]);
        setActiveItemIndex(0);
        setCurrentStep(1);
    };

    const handleSizeCheckbox = (size: string) => {
        setFormState(prev => {
            const currentItem = prev.lineItems[activeItemIndex];
            const newRange = currentItem.sizeRange.includes(size)
                ? currentItem.sizeRange.filter(s => s !== size)
                : [...currentItem.sizeRange, size];
            
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...currentItem, sizeRange: newRange };
            setErrors(prev => ({ ...prev, [`lineItems[${activeItemIndex}].sizeRange`]: '' }));
            return { ...prev, lineItems: newItems };
        });
    };

    const handleSelectQuote = (quoteId: string) => {
        const quote = quoteRequests.find(q => q.id === quoteId);
        if (quote) {
            setSelectedQuoteId(quoteId);

            // Deep-copy existing line items from the quote
            const existingItems: LineItem[] = (quote.order?.lineItems || []).map(item => ({
                ...JSON.parse(JSON.stringify(item)),
                id: item.id || generateId(),
            }));

            // Store originals for diff comparison
            setOriginalLineItems(JSON.parse(JSON.stringify(existingItems)));

            const lineItemsForForm = existingItems.length > 0
                ? existingItems
                : [{
                    id: generateId(),
                    category: 'T-shirt', qty: 0, containerType: '',
                    fabricQuality: '', weightGSM: '', targetPrice: '', packagingReqs: '', labelingReqs: '', styleOption: '', printOption: '',
                    sizeRange: [] as string[], customSize: '', sizeRatio: {} as Record<string, string>, sleeveOption: '', trimsAndAccessories: '', specialInstructions: '', quantityType: 'units' as const
                }];

            setFormState({
                lineItems: lineItemsForForm,
                shippingCountry: quote.order.shippingCountry,
                shippingPort: quote.order.shippingPort
            });

            // Set all loaded products to step 5 (review-ready) so user sees them first
            const steps: Record<number, number> = {};
            lineItemsForForm.forEach((_, index) => { steps[index] = 5; });
            setProductSteps(steps);

            setErrors({});
            setSampleFiles([]);
            setDocFiles([]);
            setSamplePreviews([]);
            setActiveItemIndex(0);
        }
    };

    const onSampleFilesSelected = (files: File[]) => {
        // Append new files to existing ones
        setSampleFiles(prev => [...prev, ...files]);

        // Create previews for new files and append to existing previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setSamplePreviews(prev => {
            const combined = [...prev, ...newPreviews];
            samplePreviewsRef.current = combined;
            return combined;
        });
    };

    const onSampleFileRemoved = (index: number) => {
        // Revoke the URL for the removed preview
        const urlToRevoke = samplePreviewsRef.current[index];
        if (urlToRevoke) {
            URL.revokeObjectURL(urlToRevoke);
        }

        // Update state and ref
        setSampleFiles(prev => prev.filter((_, i) => i !== index));
        setSamplePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            samplePreviewsRef.current = newPreviews;
            return newPreviews;
        });
    };

    // Clean up preview URLs only on unmount
    useEffect(() => {
        return () => {
            samplePreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const onDocFilesSelected = (files: File[]) => {
        // Append new files to existing ones
        setDocFiles(prev => [...prev, ...files]);
    };

    const onDocFileRemoved = (index: number) => {
        setDocFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Validation helper
    const validateStep = (step: number) => {

        const newErrors: Record<string, string> = {};
        let firstErrorId: string | null = null;

        // --- Line Item Validation ---
        const lineItemRequiredFields = [
            { key: 'category', label: 'Product Category' },
            { key: 'qty', label: 'Quantity' },
            { key: 'weightGSM', label: 'Fabric Weight (GSM)' },
            { key: 'fabricQuality', label: 'Fabric Quality' },
            { key: 'packagingReqs', label: 'Packaging Option' },
        ];

        if (step === 1) {
            // Validate Basic Details
            formState.lineItems.forEach((item, index) => {
                ['category', 'qty', 'weightGSM', 'fabricQuality'].forEach(key => {
                    const val = (item as any)[key];
                    if (key === 'qty') {
                        if (item.quantityType === 'units' && (val === 0 || !val)) {
                            newErrors[`lineItems[${index}].qty`] = 'Quantity is required';
                            if (!firstErrorId) firstErrorId = `lineItems[${index}].qty`;
                        }
                    } else if (!val || (typeof val === 'string' && val.trim() === '')) {
                        newErrors[`lineItems[${index}].${key}`] = 'This field is required';
                        if (!firstErrorId) firstErrorId = `lineItems[${index}].${key}`;
                    }
                });
            });
        }

        if (step === 2) {
            // Validate Specs
            formState.lineItems.forEach((item, index) => {
                if (item.sizeRange.length === 0) {
                    const key = `lineItems[${index}].sizeRange`;
                    newErrors[key] = 'Size Range is required';
                    if (!firstErrorId) firstErrorId = key;
                }
                if (!item.packagingReqs) {
                     const key = `lineItems[${index}].packagingReqs`;
                     newErrors[key] = 'Packaging is required';
                     if (!firstErrorId) firstErrorId = key;
                }
            });
        }

        if (step === 4) {
            // Validate Logistics
            if (!formState.shippingCountry || formState.shippingCountry.trim() === '') {
                newErrors['shippingCountry'] = 'Destination Country is required';
                if (!firstErrorId) firstErrorId = 'shippingCountry';
            }
            if (!formState.shippingPort || formState.shippingPort.trim() === '') {
                newErrors['shippingPort'] = 'Destination Port is required';
                if (!firstErrorId) firstErrorId = 'shippingPort';
            } else {
                const isKnownCountry = COUNTRIES.includes(formState.shippingCountry);
                if (isKnownCountry && !availablePorts.includes(formState.shippingPort)) {
                    newErrors['shippingPort'] = 'Invalid port for selected country';
                    if (!firstErrorId) firstErrorId = 'shippingPort';
                }
            }
        }

        setErrors(newErrors);
        return { isValid: Object.keys(newErrors).length === 0, firstErrorId };
    };

    const handleAddItem = () => {
        if (currentStep < 3) {
            showToast("Please complete previous product details (Basics, Specs, Files) before adding a new item.", "error");
            return;
        }
        if (currentStep === 3) {
            const { isValid } = validateStep(3);
            if (!isValid) {
                showToast("Please complete the Files section before adding a new item.", "error");
                return;
            }
        }
        const newIndex = formState.lineItems.length;
        setFormState(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, {
                id: generateId(),
                category: 'T-shirt',
                qty: 0,
                containerType: '',
                fabricQuality: '',
                weightGSM: '',
                targetPrice: '',
                packagingReqs: '',
                labelingReqs: '',
                styleOption: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }]
        }));
        // Initialize new product at Step 1 and switch to it
        setProductSteps(prev => ({ ...prev, [newIndex]: 1 }));
        setActiveItemIndex(newIndex);
    };

    const handleAddSuggestedItem = (category: string) => {
        if (currentStep < 3) {
            showToast("Please complete previous product details (Basics, Specs, Files) before adding a new item.", "error");
            return;
        }
        
        const newIndex = formState.lineItems.length;
        setFormState(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, {
                id: generateId(),
                category: category,
                qty: 0,
                containerType: '',
                fabricQuality: '',
                weightGSM: '',
                targetPrice: '',
                packagingReqs: '',
                labelingReqs: '',
                styleOption: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }]
        }));
        setProductSteps(prev => ({ ...prev, [newIndex]: 1 }));
        setActiveItemIndex(newIndex);
        showToast(`${category} added to order!`, 'success');
    };


    const handleRemoveItem = (index: number) => {
        if (formState.lineItems.length <= 1) return;
        setFormState(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter((_, i) => i !== index)
        }));
        if (activeItemIndex >= index && activeItemIndex > 0) setActiveItemIndex(activeItemIndex - 1);
    };

    const handleDuplicateItem = (index: number) => {
        if (currentStep < 3) {
            showToast("Please complete previous product details (Basics, Specs, Files) before duplicating.", "error");
            return;
        }
        if (currentStep === 3) {
            const { isValid } = validateStep(3);
            if (!isValid) {
                showToast("Please complete the Files section before duplicating.", "error");
                return;
            }
        }
        const itemToDuplicate = formState.lineItems[index];
        const newItem = {
            ...JSON.parse(JSON.stringify(itemToDuplicate)), // Deep copy to avoid reference issues
            id: generateId(),
        };

        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems.splice(index + 1, 0, newItem);
            return { ...prev, lineItems: newItems };
        });
        setActiveItemIndex(index + 1);
    };

    const handleEditItem = (index: number) => {
        setActiveItemIndex(index);
        setProductSteps(prev => ({
            ...prev,
            [index]: 1
        }));
    };

    const handleChipSelect = (field: string, value: string) => {
        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...newItems[activeItemIndex], [field]: value };
            if (errors[`lineItems[${activeItemIndex}].${field}`]) {
                setErrors(prevErr => ({ ...prevErr, [`lineItems[${activeItemIndex}].${field}`]: '' }));
            }
            return { ...prev, lineItems: newItems };
        });
    };

    const handleNext = () => {
        const { isValid, firstErrorId } = validateStep(currentStep);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, 5));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showToast('Please fix the errors before proceeding.', 'error');
            if (firstErrorId) {
                const match = firstErrorId.match(/lineItems\[(\d+)\]/);
                if (match) setActiveItemIndex(parseInt(match[1]));
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveDraft = () => {
        const draftsJson = localStorage.getItem(SAVED_DRAFTS_KEY);
        let drafts: any[] = draftsJson ? JSON.parse(draftsJson) : [];
        
        const timestamp = new Date().toISOString();
        let newDraftId = formState.draftId;

        if (newDraftId) {
            // Update existing
            const index = drafts.findIndex(d => d.id === newDraftId);
            if (index !== -1) {
                drafts[index] = { ...drafts[index], order: formState, submittedAt: timestamp };
            } else {
                // ID exists in form but not in storage (weird), treat as new
                drafts.push({ id: newDraftId, order: formState, status: 'Draft', submittedAt: timestamp });
            }
        } else {
            // Create new
            newDraftId = `draft-${Date.now()}`;
            drafts.push({
                id: newDraftId,
                order: { ...formState, draftId: newDraftId },
                status: 'Draft',
                submittedAt: timestamp,
                factory: null, // Drafts might not have a factory selected yet
                userId: 'self'
            });
        }

        setFormState(prev => ({ ...prev, draftId: newDraftId }));
        localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(drafts));
        // Also update current working copy
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...formState, draftId: newDraftId }));
        
        showToast('Draft saved successfully!', 'success');
    };

    // Function called when the form is submitted via Enter key or other form submission
    const onFormSubmit = (e: React.FormEvent) => {
        // Prevent the default browser behavior (which would reload the page).
        e.preventDefault();

        // Only advance to next step if not on summary page
        // Do NOT auto-submit when at summary - require explicit button click
        if (currentStep < 5) {
            handleNext();
        }
    };

    // Function called when the user clicks the "Submit" button on the summary page
    const onSubmitButtonClick = () => {
        // Final validation of all steps
        let allValid = true;
        let errorStep = 0;

        // Check steps in order
        for (let i = 1; i <= 4; i++) {
            const { isValid } = validateStep(i);
            if (!isValid) {
                allValid = false;
                errorStep = i;
                break;
            }
        }

        if (!allValid) {
            setCurrentStep(errorStep);
            showToast(`Please fix errors in step ${errorStep}.`, 'error');
            return;
        }

        // Submit the form
        handleConfirmSubmit();
    };

    /* 
    // Legacy validation logic removed in favor of step-based validation
    const onFormSubmitLegacy = (e: React.FormEvent) => { 
        e.preventDefault(); 
        const newErrors: Record<string, string> = {};
        let firstErrorId: string | null = null;
        // ... (legacy validation code) ...
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            showToast('Please fix the errors in the form.', 'error');
            if (firstErrorId) {
                // If error is in a line item, switch to that tab
                const match = firstErrorId.match(/lineItems\[(\d+)\]/);
                if (match) {
                    setActiveItemIndex(parseInt(match[1]));
                }
                // Scroll to the error field
                setTimeout(() => {
                    const element = document.getElementById(firstErrorId!);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.focus();
                    }
                }, 100);
            }
            return;
        }
        setIsSummaryModalOpen(true);
    }; */

    const handleConfirmSubmit = async () => {
        // Prevent duplicate submissions
        if (isSubmitting) return;

        setIsSubmitting(true);

        // Clear draft immediately
        localStorage.removeItem(DRAFT_KEY);

        // Submit the form and wait for result with timeout protection
        let success = false;
        const SUBMISSION_TIMEOUT = 60000; // 60 seconds timeout

        try {
            // Create a timeout promise to prevent hanging forever
            const timeoutPromise = new Promise<boolean>((_, reject) => {
                setTimeout(() => reject(new Error('Submission timed out. Please try again.')), SUBMISSION_TIMEOUT);
            });

            // Race between the actual submission and timeout
            const submissionPromise = orderType === 'existing' && selectedQuoteId
                ? handleAddToQuoteRequest(selectedQuoteId, formState, [...sampleFiles, ...docFiles])
                : handleSubmitOrderForm(formState, [...sampleFiles, ...docFiles]);

            success = await Promise.race([submissionPromise, timeoutPromise]);

            if (success) {
                // Show success animation only after successful submission
                setShowSuccessAnimation(true);

                // Trigger confetti (wrapped in try-catch to prevent blocking navigation)
                try {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                } catch (confettiError) {
                    console.error('Confetti error:', confettiError);
                }

                // Navigate to quotes page after animation completes
                setTimeout(() => {
                    setIsSubmitting(false);
                    handleSetCurrentPage('myQuotes');
                }, 2500);
            } else {
                // Reset submitting state on failure so user can try again
                setIsSubmitting(false);
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            showToast(error?.message || 'Submission failed. Please try again.', 'error');
            // Reset submitting state on error so user can try again
            setIsSubmitting(false);
        }
    };

    const handleResetForm = () => {
        setIsResetModalOpen(true);
    };

    const handleDeleteItemClick = (index: number) => {
        setItemToDeleteIndex(index);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = () => {
        if (itemToDeleteIndex !== null) {
            handleRemoveItem(itemToDeleteIndex);
            setItemToDeleteIndex(null);
        }
        setIsDeleteModalOpen(false);
    };

    const confirmReset = () => {
        setFormState({
            lineItems: [{
                id: generateId(),
                category: '',
                qty: 0,
                containerType: '',
                fabricQuality: '',
                weightGSM: '',
                targetPrice: '',
                packagingReqs: '',
                labelingReqs: '',
                styleOption: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }],
            shippingCountry: '',
            shippingPort: ''
        });
        setErrors({});
        setSampleFiles([]);
        setSamplePreviews([]);
        setDocFiles([]);
        setAvailablePorts([]);
        setActiveItemIndex(0);
        setCurrentStep(1);
        setOriginalLineItems([]);
        localStorage.removeItem(DRAFT_KEY);
        setIsResetModalOpen(false);
        showToast('Form reset successfully.');
    };

    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const activeItem = formState.lineItems[activeItemIndex];
    const isUpperBody = ['T-shirt', 'Polo Shirt', 'Hoodies', 'Jackets', 'Shirts', 'Casual Shirts'].includes(activeItem.category);

    const totalEstimatedCost = formState.lineItems.reduce((sum, item) => {
        if (item.quantityType === 'units' && item.qty && item.targetPrice) {
            const qty = item.qty;
            const price = parseFloat(item.targetPrice);
            if (!isNaN(qty) && !isNaN(price)) {
                return sum + (qty * price);
            }
        }
        return sum;
    }, 0);

    const hasContainerItems = formState.lineItems.some(item => item.quantityType === 'container' && item.targetPrice);

    const setQuantityType = (type: 'units' | 'container') => {
        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...newItems[activeItemIndex], quantityType: type, qty: 0, containerType: '' };
            return { ...prev, lineItems: newItems };
        });
    };

    const steps = [
        { id: 1, title: 'Basics', icon: <Shirt size={18}/> },
        { id: 2, title: 'Specs', icon: <Ruler size={18}/> },
        { id: 3, title: 'Files', icon: <Upload size={18}/> },
        { id: 4, title: 'Logistics', icon: <Globe size={18}/> },
        { id: 5, title: 'Review', icon: <Check size={18}/> }
    ];

    // --- Main Render ---
    return (
        // Wrap the page content in the MainLayout to ensure consistent navigation and styling.
        <MainLayout {...props}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Landing Page - Shown First */}
                {showLandingPage ? (
                    <div className="animate-fade-in">
                        {/* Back Button */}
                        <div className="mb-8">
                            <button onClick={() => handleSetCurrentPage('sourcing')} className="group flex items-center px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:text-[#c20c0b] dark:hover:text-[#c20c0b] transition-all">
                                <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </button>
                        </div>

                        {/* Quirky Header with Gradient */}
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-full mb-6">
                                <Sparkles className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Let's build something amazing</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                                Ready to source your{' '}
                                <span className="bg-gradient-to-r from-[#c20c0b] via-orange-500 to-amber-500 bg-clip-text text-transparent">
                                    next big thing
                                </span>
                                ?
                            </h1>
                            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                                Whether you're starting fresh or expanding your collection, we've got you covered.
                            </p>
                        </div>

                        {/* Interactive Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            {/* New Quote Card */}
                            <button
                                onClick={() => handleOrderTypeChange('new')}
                                className="group relative overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-left transition-all duration-500 hover:border-[#c20c0b] hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-2"
                            >
                                {/* Background Gradient on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Icon */}
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#c20c0b] to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                        <Plus className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#c20c0b] transition-colors">
                                        New Quote
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        Start a fresh RFQ from scratch. Define your products, specs, and shipping requirements.
                                    </p>

                                    {/* Features */}
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Multiple product types</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Custom specifications</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Global shipping options</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2 text-[#c20c0b] font-bold group-hover:gap-4 transition-all">
                                        <span>Get Started</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </button>

                            {/* Add to Existing Card */}
                            <button
                                onClick={() => handleOrderTypeChange('existing')}
                                className="group relative overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-left transition-all duration-500 hover:border-[#c20c0b] hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-2"
                            >
                                {/* Background Gradient on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Icon */}
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                                        <Box className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                        <Plus className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
                                        Add to Existing
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        Expand an existing quote with new products. Same shipping, new possibilities.
                                    </p>

                                    {/* Features */}
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Existing shipping details</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Quick product additions</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>Consolidated quotes</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2 text-purple-600 font-bold group-hover:gap-4 transition-all">
                                        <span>Select Quote</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* Badge showing number of existing quotes */}
                                {quoteRequests.filter(q => ['Pending', 'In Negotiation', 'Responded'].includes(q.status) && (q.modification_count || 0) < 1).length > 0 && (
                                    <div className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full">
                                        {quoteRequests.filter(q => ['Pending', 'In Negotiation', 'Responded'].includes(q.status) && (q.modification_count || 0) < 1).length} quotes
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Fun floating elements */}
                        <div className="relative max-w-4xl mx-auto mt-12 text-center">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <Zap className="w-5 h-5 text-amber-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Pro tip:</span> Save time by duplicating products with similar specs
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Form Page - Header Section */}
                        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                                        {orderType === 'existing' ? 'Modify Quote' : 'Create Your Order'}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        {orderType === 'existing'
                                            ? 'Edit existing products, add new items, or remove items from your quote.'
                                            : 'Tell us what you need, we\'ll find the factory.'}
                                </p>
                            </div>
                            <button onClick={() => setShowLandingPage(true)} className="group flex items-center px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:text-[#c20c0b] dark:hover:text-[#c20c0b] transition-all">
                                <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </button>
                        </div>

                <div className="space-y-8">
                    <div className="flex gap-4 p-1 bg-white dark:bg-gray-800 rounded-xl w-fit border border-gray-200 dark:border-gray-700">
                        <button onClick={() => handleOrderTypeChange('new')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'new' ? 'bg-gray-100 dark:bg-gray-700 text-[#c20c0b]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>New Request</button>
                        <button onClick={() => handleOrderTypeChange('existing')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'existing' ? 'bg-gray-100 dark:bg-gray-700 text-[#c20c0b]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Add to Existing</button>
                    </div>

                    {orderType === 'existing' && selectedQuoteId === null && (
                        <div className="animate-fade-in">
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-1">Select an existing RFQ</h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Choose a quote to modify its products, specs, or add new items.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {quoteRequests.filter(q => ['Pending', 'In Negotiation', 'Responded'].includes(q.status) && (q.modification_count || 0) < 1).length > 0 ? (
                                    quoteRequests.filter(q => ['Pending', 'In Negotiation', 'Responded'].includes(q.status) && (q.modification_count || 0) < 1).map(quote => (
                                        <QuoteSelectionCard key={quote.id} quote={quote} onSelect={() => handleSelectQuote(quote.id)} />
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-12">
                                        <Package className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No eligible RFQs to modify.</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Only Pending, Responded, or In Negotiation quotes that haven't been modified yet are eligible.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* The Form Element */}
                    {(orderType === 'new' || selectedQuoteId !== null) && ( 
                        <div className="animate-fade-in">
                        <style>{`
                            @keyframes slideIn {
                                from { opacity: 0; transform: translateX(20px); }
                                to { opacity: 1; transform: translateX(0); }
                            }
                            .animate-slide-in {
                                animation: slideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                            }
                        `}</style>
                        
                        {/* Gamified Stepper */}
                        <div className="mb-12 relative">
                            {/* Progress Bar Background */}
                            <div className="absolute top-4 left-0 w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
                            {/* Progress Bar Fill */}
                            <div className="absolute top-4 left-0 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
                            <div className="flex justify-between">
                                {steps.map((step) => (
                                    <div key={step.id} className="flex flex-col items-center group cursor-default relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 ${
                                            currentStep > step.id ? 'bg-gradient-to-br from-red-600 to-orange-500 border-white dark:border-gray-900 text-white shadow-lg' :
                                            currentStep === step.id ? 'bg-white dark:bg-gray-900 border-red-500 text-red-500 shadow-lg scale-110' :
                                            'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
                                        }`}>
                                            {currentStep > step.id ? <Check size={20} /> : step.icon}
                                        </div>
                                        <span className={`mt-2 text-xs font-bold uppercase tracking-wider transition-colors ${currentStep >= step.id ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>{step.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={onFormSubmit} className="space-y-8">
                        
                        {/* Product Cards - Vertical Grid Layout */}
                        {currentStep <= 3 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Sidebar: Product List */}
                                <div className="lg:col-span-3 lg:border-r lg:border-gray-200 lg:dark:border-gray-700 lg:pr-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <Package className="text-[#c20c0b]" size={20} /> Products
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            disabled={currentStep < 3}
                                            className={`p-2 rounded-lg transition-colors ${currentStep < 3 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                            title={currentStep < 3 ? "Complete previous steps first" : "Add Item"}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                                        {formState.lineItems.map((item, index) => {
                                            const completion = calculateProductCompletion(item);
                                            const isActive = activeItemIndex === index;
                                            const color = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
                                            const catOption = CATEGORY_OPTIONS.find(c => c.id === item.category);
                                            const image = catOption ? catOption.image : null;
                                            const icon = getCategoryIcon(item.category);

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setActiveItemIndex(index)}
                                                    className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${isActive ? `${color.border} bg-white dark:bg-gray-800 shadow-md` : 'border-transparent bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                >
                                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 border ${isActive ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                                                        {image ? (
                                                            <img src={image} alt={item.category} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xl">{icon}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-sm truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{item.category || 'New Item'}</p>
                                                        <p className="text-xs text-gray-400 truncate">{item.qty > 0 ? `${item.qty.toLocaleString()} units` : 'Qty pending'}</p>
                                                    </div>
                                                    
                                                    {/* Completion Indicator */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        {completion.percentage === 100 ? (
                                                            <div className="text-green-500"><Check size={16} /></div>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? color.light + ' ' + color.text : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{completion.percentage}%</span>
                                                        )}
                                                        {isActive && (
                                                            <div className="flex gap-1">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={(e) => { e.stopPropagation(); handleDuplicateItem(index); }} 
                                                                    disabled={currentStep < 3}
                                                                    className={`${currentStep < 3 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700'}`}
                                                                    title={currentStep < 3 ? "Complete previous steps first" : "Duplicate Item"}
                                                                ><Copy size={12} /></button>
                                                                {formState.lineItems.length > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveItem(index); }} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Content */}
                                <div className="lg:col-span-9">
                                    {/* Current Product Context Bar */}
                                    {formState.lineItems.length > 1 && (
                                        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg w-fit">
                                            <span>Editing:</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{getCategoryIcon(activeItem.category)} {activeItem.category}</span>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <span>Item {activeItemIndex + 1} of {formState.lineItems.length}</span>
                                        </div>
                                    )}

                                    {/* Section 1: Basic Details */}
                                    {currentStep === 1 && (
                                    <div className="animate-slide-in">
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">What are we making today?</h3>
                                            <p className="text-gray-500 dark:text-gray-400">Choose a product category to get started.</p>
                                        </div>

                                        {/* Gamified Category Selection */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                            {CATEGORY_OPTIONS.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => handleChipSelect('category', cat.id)}
                                                    className={`relative rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-start gap-0 group overflow-hidden ${
                                                        activeItem.category === cat.id
                                                            ? 'border-[#c20c0b] shadow-lg scale-105'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1 shadow-sm'
                                                    }`}
                                                >
                                                    <div className="w-full h-32 overflow-hidden">
                                                        <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                    <div className={`w-full py-3 px-2 text-center transition-colors ${activeItem.category === cat.id ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                                        <span className="font-bold text-sm block truncate">{cat.label}</span>
                                                    </div>
                                                    {activeItem.category === cat.id && (
                                                        <div className="absolute top-2 right-2 bg-white text-[#c20c0b] rounded-full p-1 shadow-md"><Check size={14} /></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Fabric Quality Input */}
                                            <div>
                                                <FormField label="Fabric Composition" icon={<Award className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].fabricQuality`]}>
                                                    <input id={`lineItems[${activeItemIndex}].fabricQuality`} type="text" name="fabricQuality" value={activeItem.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className={getInputClass(errors[`lineItems[${activeItemIndex}].fabricQuality`])} />
                                                </FormField>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {FABRIC_SUGGESTIONS.map(fabric => (
                                                        <button
                                                            key={fabric}
                                                            type="button"
                                                            onClick={() => handleChipSelect('fabricQuality', fabric)}
                                                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                                                activeItem.fabricQuality === fabric
                                                                    ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 shadow-sm'
                                                            }`}
                                                        >
                                                            {fabric}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Fabric Weight Input */}
                                            <div>
                                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].weightGSM`]}>
                                                    <input id={`lineItems[${activeItemIndex}].weightGSM`} type="number" min="0" name="weightGSM" value={activeItem.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className={getInputClass(errors[`lineItems[${activeItemIndex}].weightGSM`])} />
                                                </FormField>
                                                <div className="mt-3 flex gap-2">
                                                    {['160', '180', '200', '220', '240', '280', '300'].map(gsm => (
                                                        <button
                                                            key={gsm}
                                                            type="button"
                                                            onClick={() => handleChipSelect('weightGSM', gsm)}
                                                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                                                activeItem.weightGSM === gsm
                                                                    ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 shadow-sm'
                                                            }`}
                                                        >
                                                            {gsm}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Quantity Section - Redesigned */}
                                            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-white">
                                                        Total Quantity <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setQuantityType('units')} 
                                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeItem.quantityType === 'units' ? 'bg-[#c20c0b] text-white shadow-sm' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                                        >
                                                            By Units
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setQuantityType('container')} 
                                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeItem.quantityType === 'container' ? 'bg-[#c20c0b] text-white shadow-sm' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                                        >
                                                            By Container
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {activeItem.quantityType === 'units' ? (
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                        <input 
                                                            id={`lineItems[${activeItemIndex}].qty`} 
                                                            type="number" 
                                                            min="0" 
                                                            name="qty" 
                                                            value={activeItem.qty || ''} 
                                                            onChange={handleFormChange} 
                                                            placeholder="e.g., 5000" 
                                                            className={getInputClass(errors[`lineItems[${activeItemIndex}].qty`])} 
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                        <select 
                                                            id={`lineItems[${activeItemIndex}].qty`} 
                                                            name="containerType" 
                                                            value={activeItem.containerType || ''} 
                                                            onChange={handleFormChange} 
                                                            className={`${getInputClass(errors[`lineItems[${activeItemIndex}].qty`])} appearance-none`}
                                                        >
                                                            <option value="">Select Container Type</option>
                                                            {containerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                                            <ChevronDown size={16} />
                                                        </div>
                                                    </div>
                                                )}
                                                {errors[`lineItems[${activeItemIndex}].qty`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400 animate-fade-in">{errors[`lineItems[${activeItemIndex}].qty`]}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    {/* Section 2: Specifications */}
                                    {currentStep === 2 && (
                                    <div className="animate-slide-in">
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Let's size it up</h3>
                                            <p className="text-gray-500 dark:text-gray-400">Define your size range and packaging needs.</p>
                                        </div>
                                        <div className="space-y-6">
                                            {/* 1. Size Range */}
                                            <div>
                                                <label id={`lineItems[${activeItemIndex}].sizeRange`} className={`block text-sm font-bold uppercase tracking-wider mb-3 ${errors[`lineItems[${activeItemIndex}].sizeRange`] ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>Size Range <span className="text-red-500">*</span></label>
                                                <div className="flex flex-wrap gap-3">
                                                    {sizeOptions.map(size => (
                                                        <label key={size} className={`inline-flex items-center px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${activeItem.sizeRange.includes(size) ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b] font-bold shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 shadow-sm'}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={activeItem.sizeRange.includes(size)} 
                                                                onChange={() => handleSizeCheckbox(size)}
                                                                className="hidden" 
                                                            />
                                                            <span>{size}</span>
                                                        </label>
                                                    ))}
                                                    <label className={`inline-flex items-center px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${activeItem.sizeRange.includes('Custom') ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b] font-bold shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 shadow-sm'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={activeItem.sizeRange.includes('Custom')} 
                                                            onChange={() => handleSizeCheckbox('Custom')}
                                                            className="hidden" 
                                                        />
                                                        <span>Custom</span>
                                                    </label>
                                                </div>
                                                {activeItem.sizeRange.includes('Custom') && (
                                                    <div className="mt-3">
                                                        <input type="text" name="customSize" value={activeItem.customSize} onChange={handleFormChange} placeholder="Enter custom sizes (e.g., 4XL, 5XL)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                    </div>
                                                )}
                                                {errors[`lineItems[${activeItemIndex}].sizeRange`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400 animate-fade-in">{errors[`lineItems[${activeItemIndex}].sizeRange`]}</p>}
                                            </div>

                                            {/* 2. Size Ratio */}
                                            {activeItem.sizeRange.length > 0 && (
                                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 flex items-center"><Ruler className="w-4 h-4 mr-1"/> Size Ratio / Breakdown</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                                        {activeItem.sizeRange.map(size => (
                                                            <div key={size}>
                                                                <label className="block text-xs text-gray-500 dark:text-gray-200 mb-1">{size}</label>
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={activeItem.sizeRatio[size] || ''} 
                                                                    onChange={(e) => {
                                                                        if (parseInt(e.target.value) < 0) return;
                                                                        setFormState(prev => {
                                                                            const newItems = [...prev.lineItems];
                                                                            const updatedItem = {
                                                                                ...newItems[activeItemIndex],
                                                                                sizeRatio: { ...newItems[activeItemIndex].sizeRatio, [size]: e.target.value }
                                                                            };
                                                                            newItems[activeItemIndex] = updatedItem;
                                                                            return { ...prev, lineItems: newItems };
                                                                        })
                                                                    }}
                                                                    placeholder="Qty" 
                                                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3. Sleeve Options (Upper Body Only) */}
                                            {isUpperBody && (
                                                <div>
                                                    <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400">Sleeve Style</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {SLEEVE_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => handleChipSelect('sleeveOption', opt.id)}
                                                                className={`relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-0 group overflow-hidden ${
                                                                    activeItem.sleeveOption === opt.id
                                                                        ? 'border-[#c20c0b] shadow-md'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 shadow-sm'
                                                                }`}
                                                            >
                                                                <div className="w-full h-28 overflow-hidden">
                                                                    <img src={opt.image} alt={opt.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                </div>
                                                                <div className={`w-full py-2 px-1 text-center transition-colors ${activeItem.sleeveOption === opt.id ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                                    <span className="font-bold text-xs block truncate">{opt.label}</span>
                                                                </div>
                                                                {activeItem.sleeveOption === opt.id && <div className="absolute top-2 right-2 bg-white text-[#c20c0b] rounded-full p-0.5 shadow-sm"><Check size={12} /></div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    <label className="block text-sm font-bold uppercase tracking-wider mb-3 mt-6 text-gray-500 dark:text-gray-400">Print / Design</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                                        {PRINT_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => handleChipSelect('printOption', opt.id)}
                                                                className={`relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-0 group overflow-hidden ${
                                                                    activeItem.printOption === opt.id
                                                                        ? 'border-[#c20c0b] shadow-md'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 shadow-sm'
                                                                }`}
                                                            >
                                                                <div className="w-full h-24 overflow-hidden">
                                                                    <img src={opt.image} alt={opt.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                </div>
                                                                <div className={`w-full py-2 px-1 text-center transition-colors ${activeItem.printOption === opt.id ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                                    <span className="font-bold text-xs block truncate">{opt.label}</span>
                                                                </div>
                                                                {activeItem.printOption === opt.id && <div className="absolute top-2 right-2 bg-white text-[#c20c0b] rounded-full p-0.5 shadow-sm"><Check size={12} /></div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 4. Packaging Option */}
                                            <div>
                                                <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400">Packaging Preference <span className="text-red-500">*</span></label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-3">
                                                    {PACKAGING_OPTIONS.map((pkg) => (
                                                        <button
                                                            key={pkg.id}
                                                            type="button"
                                                            onClick={() => handleChipSelect('packagingReqs', pkg.id)}
                                                            className={`relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-0 group overflow-hidden ${
                                                                activeItem.packagingReqs === pkg.id
                                                                    ? 'border-[#c20c0b] shadow-md'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 shadow-sm'
                                                            }`}
                                                        >
                                                            <div className="w-full h-24 overflow-hidden">
                                                                <img src={pkg.image} alt={pkg.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            </div>
                                                            <div className={`w-full py-2 px-1 text-center transition-colors ${activeItem.packagingReqs === pkg.id ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                                <span className="font-bold text-[10px] block truncate">{pkg.label}</span>
                                                            </div>
                                                            {activeItem.packagingReqs === pkg.id && <div className="absolute top-2 right-2 bg-white text-[#c20c0b] rounded-full p-0.5 shadow-sm"><Check size={10} /></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input 
                                                    id={`lineItems[${activeItemIndex}].packagingReqs`} 
                                                    type="text" 
                                                    name="packagingReqs" 
                                                    value={activeItem.packagingReqs} 
                                                    onChange={handleFormChange} 
                                                    placeholder="Or type custom packaging requirements..." 
                                                    className={`${getInputClass(errors[`lineItems[${activeItemIndex}].packagingReqs`])} text-sm`} 
                                                />
                                            </div>

                                            {/* 5. Trims & Accessories */}
                                            <FormField label="Trims & Accessories" icon={<Scissors className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].trimsAndAccessories`]}>
                                                <input id={`lineItems[${activeItemIndex}].trimsAndAccessories`} type="text" name="trimsAndAccessories" value={activeItem.trimsAndAccessories} onChange={handleFormChange} placeholder="e.g., YKK Zippers, Metal Buttons" className={getInputClass(errors[`lineItems[${activeItemIndex}].trimsAndAccessories`])} />
                                            </FormField>
                                        </div>
                                    </div>
                                    )}

                                    {/* Section 3: Attachments */}
                                    {currentStep === 3 && (
                                    <div className="animate-slide-in">
                                            <div className="text-center mb-8">
                                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Visuals & Docs</h3>
                                                <p className="text-gray-500 dark:text-gray-400">Upload samples, tech packs, or reference images.</p>
                                            </div>
                                            {/* 6. Sample Photo Upload */}
                                            <div className="mb-6">
                                                <FileDropZone
                                                    label="Sample Photo Upload"
                                                    accept="image/*"
                                                    multiple
                                                    onFilesSelected={onSampleFilesSelected}
                                                    onFileRemoved={onSampleFileRemoved}
                                                    icon={<ImageIcon className="h-8 w-8" />}
                                                    selectedFiles={sampleFiles}
                                                    previews={samplePreviews}
                                                />
                                            </div>

                                            {/* 7. Document Upload */}
                                            <div className="mb-6">
                                                <FileDropZone
                                                    label="Document Upload (Tech Pack, Size Chart)"
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                    multiple
                                                    onFilesSelected={onDocFilesSelected}
                                                    onFileRemoved={onDocFileRemoved}
                                                    icon={<FileText className="h-8 w-8" />}
                                                    selectedFiles={docFiles}
                                                />
                                            </div>

                                            {/* 8. Special Instructions */}
                                            <div className="md:col-span-2 mb-6">
                                                <FormField label="Special Instructions" icon={<AlertCircle className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].specialInstructions`]}>
                                                    <textarea id={`lineItems[${activeItemIndex}].specialInstructions`} name="specialInstructions" value={activeItem.specialInstructions} onChange={handleFormChange} rows={3} placeholder="Any other specific requirements..." className={getInputClass(errors[`lineItems[${activeItemIndex}].specialInstructions`])}></textarea>
                                                </FormField>
                                            </div>

                                            {/* 9. Target Price */}
                                            <div className="mb-6">
                                                <FormField label="Target Price per Unit (USD)" icon={<DollarSign className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].targetPrice`]}>
                                                    <input id={`lineItems[${activeItemIndex}].targetPrice`} type="number" min="0" step="0.01" name="targetPrice" value={activeItem.targetPrice} onChange={handleFormChange} placeholder="e.g., 4.50" className={getInputClass(errors[`lineItems[${activeItemIndex}].targetPrice`])} />
                                                </FormField>
                                            </div>

                                            {/* Suggestions - Zomato Style */}
                                            <div className="mt-10 pt-6 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-gray-800 dark:text-white">Add more to your order?</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Popular additions for your collection</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    {CATEGORY_OPTIONS
                                                        .filter(cat => !formState.lineItems.some(item => item.category === cat.id))
                                                        .slice(0, 4)
                                                        .map((cat) => (
                                                        <div key={cat.id} className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
                                                            <div className="aspect-[4/3] relative overflow-hidden">
                                                                <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                                                                <span className="absolute bottom-2 left-3 text-white font-bold text-sm">{cat.label}</span>
                                                            </div>
                                                            <div className="p-3">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleAddSuggestedItem(cat.id)}
                                                                    className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 font-bold text-xs rounded-lg hover:bg-[#c20c0b] hover:text-white transition-colors flex items-center justify-center gap-1"
                                                                >
                                                                    <Plus size={14} /> Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-8 flex flex-col items-center justify-center gap-3">
                                                    <button 
                                                        type="button"
                                                        onClick={handleAddItem}
                                                        className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                                    >
                                                        <Plus size={18} /> Add More Products
                                                    </button>
                                                </div>
                                            </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Steps 4 and 5 (Logistics and Review)
                            <>
                                {/* Section 4: Logistics & Commercials */}
                                {currentStep === 4 && (
                                <div className="animate-slide-in">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Where is it going?</h3>
                                        <p className="text-gray-500 dark:text-gray-400">Set your destination and logistics preferences.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Destination Country */}
                                        <FormField label="Destination Country" icon={<Globe className="h-5 w-5 text-gray-400" />} required error={errors.shippingCountry}>
                                            <input id="shippingCountry" type="text" name="shippingCountry" value={formState.shippingCountry} onChange={handleFormChange} list="countries" placeholder="Select Country" className={getInputClass(errors.shippingCountry)} disabled={orderType === 'existing'} />
                                            <datalist id="countries">
                                                {COUNTRIES.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </FormField>
                                        {/* Destination Port */}
                                        <FormField label="Destination Port" icon={<Anchor className="h-5 w-5 text-gray-400" />} required error={errors.shippingPort}>
                                            <input id="shippingPort" type="text" name="shippingPort" value={formState.shippingPort} onChange={handleFormChange} list="ports" placeholder={isLoadingPorts ? "Loading ports..." : "Select Port"} className={getInputClass(errors.shippingPort)} disabled={orderType === 'existing'} />
                                            {isLoadingPorts && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#c20c0b]"></div>
                                                </div>
                                            )}
                                            <datalist id="ports">
                                                {availablePorts.map(p => <option key={p} value={p} />)}
                                            </datalist>
                                        </FormField>
                                    </div>
                                </div>
                                )}

                                {/* Section 5: Summary */}
                                {currentStep === 5 && (() => {
                                    const isExistingModification = orderType === 'existing' && originalLineItems.length > 0;
                                    const diffs = isExistingModification ? computeLineItemDiffs(formState.lineItems, originalLineItems) : [];
                                    const currentDiffs = diffs.filter(d => d.status !== 'removed');
                                    const removedDiffs = diffs.filter(d => d.status === 'removed');
                                    const newCount = diffs.filter(d => d.status === 'new').length;
                                    const modifiedCount = diffs.filter(d => d.status === 'modified').length;
                                    const removedCount = removedDiffs.length;
                                    const unchangedCount = diffs.filter(d => d.status === 'unchanged').length;
                                    const hasChanges = newCount > 0 || modifiedCount > 0 || removedCount > 0;

                                    return (
                                    <div className="animate-slide-in space-y-8 bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                                        {/* Invoice Header */}
                                        <div className="flex justify-between items-start pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <div>
                                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{isExistingModification ? 'Modification Review' : 'Order Review'}</h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isExistingModification ? 'Review your changes before submitting the modification.' : 'Please review your order details before submitting.'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Request Date</p>
                                                <p className="font-medium text-gray-800 dark:text-white">{new Date().toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {/* Modifications Summary Banner */}
                                        {isExistingModification && (
                                            hasChanges ? (
                                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <ArrowUpDown size={16} className="text-amber-600 dark:text-amber-400" />
                                                        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Modifications Summary</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 text-xs">
                                                        {newCount > 0 && <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold">+{newCount} New {newCount === 1 ? 'Item' : 'Items'}</span>}
                                                        {modifiedCount > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold">{modifiedCount} Modified</span>}
                                                        {removedCount > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-semibold">-{removedCount} Removed</span>}
                                                        {unchangedCount > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold">{unchangedCount} Unchanged</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-2">
                                                    <Info size={16} className="text-gray-400" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No modifications made to existing items.</p>
                                                </div>
                                            )
                                        )}

                                        {/* Shipping Details */}
                                        <div>
                                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Shipping To</h4>
                                            <p className="font-semibold text-gray-800 dark:text-white">{formState.shippingCountry}</p>
                                            <p className="text-gray-600 dark:text-gray-300">{formState.shippingPort}</p>
                                        </div>

                                        {/* Items Table */}
                                        <div className="overflow-x-auto -mx-6 sm:-mx-8">
                                            <table className="min-w-full">
                                                <thead className="border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Details</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target/Unit</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subtotal</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formState.lineItems.map((item: any, idx: number) => {
                                                        const subtotal = (item.quantityType === 'units' && item.qty && item.targetPrice) ? item.qty * parseFloat(item.targetPrice) : 0;
                                                        const diff = isExistingModification ? currentDiffs.find(d => d.item.id === item.id) : null;
                                                        const status = diff?.status || null;

                                                        return (
                                                            <tr key={item.id} className={`border-b border-gray-100 dark:border-gray-800 ${
                                                                status === 'new' ? 'bg-emerald-50/50 dark:bg-emerald-900/10' :
                                                                status === 'modified' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                                                            }`}>
                                                                <td className="px-6 py-4 align-top text-sm font-medium text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                                <td className="px-6 py-4 align-top">
                                                                    <div className="flex items-center gap-2">
                                                                        <div>
                                                                            <p className="font-bold text-gray-800 dark:text-white text-sm">{item.category}</p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.fabricQuality}</p>
                                                                        </div>
                                                                        {status === 'new' && (
                                                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">New</span>
                                                                        )}
                                                                        {status === 'modified' && (
                                                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">Modified</span>
                                                                        )}
                                                                        {status === 'unchanged' && (
                                                                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">Unchanged</span>
                                                                        )}
                                                                    </div>
                                                                    {/* Show field-level changes for modified items */}
                                                                    {status === 'modified' && diff?.changes && diff.changes.length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            {diff.changes.slice(0, 3).map(change => (
                                                                                <div key={change.field} className="text-[10px] text-amber-600 dark:text-amber-400">
                                                                                    <span className="font-medium">{change.label}:</span>{' '}
                                                                                    <span className="line-through text-gray-400">{change.oldValue}</span>{' '}
                                                                                    <ArrowRight size={8} className="inline" />{' '}
                                                                                    <span className="font-semibold">{change.newValue}</span>
                                                                                </div>
                                                                            ))}
                                                                            {diff.changes.length > 3 && (
                                                                                <p className="text-[10px] text-amber-500">+{diff.changes.length - 3} more changes</p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 align-top text-xs text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                                                    <p><strong>Weight:</strong> {item.weightGSM} GSM</p>
                                                                    <p><strong>Sizes:</strong> {item.sizeRange.join(', ')}</p>
                                                                    {item.sleeveOption && <p><strong>Sleeve:</strong> {item.sleeveOption}</p>}
                                                                    {item.printOption && <p><strong>Print:</strong> {item.printOption}</p>}
                                                                </td>
                                                                <td className="px-6 py-4 align-top text-right text-sm">{item.quantityType === 'units' ? `${item.qty.toLocaleString()} units` : item.containerType}</td>
                                                                <td className="px-6 py-4 align-top text-right text-sm">${item.targetPrice ? parseFloat(item.targetPrice).toFixed(2) : 'N/A'}</td>
                                                                <td className="px-6 py-4 align-top text-right text-sm font-semibold text-gray-800 dark:text-white">${subtotal > 0 ? subtotal.toFixed(2) : 'N/A'}</td>
                                                                <td className="px-6 py-4 align-top text-right">
                                                                    <div className="flex items-center justify-end gap-0">
                                                                        <button type="button" onClick={() => handleEditItem(idx)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit Item"><Edit size={16} /></button>
                                                                        {formState.lineItems.length > 1 && <button type="button" onClick={() => handleDeleteItemClick(idx)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Remove Item"><Trash2 size={16} /></button>}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}

                                                    {/* Removed items */}
                                                    {isExistingModification && removedDiffs.map((diff, idx) => (
                                                        <tr key={`removed-${diff.item.id}`} className="border-b border-gray-100 dark:border-gray-800 bg-red-50/30 dark:bg-red-900/10 opacity-60">
                                                            <td className="px-6 py-4 align-top text-sm font-medium text-gray-400 line-through">{formState.lineItems.length + idx + 1}</td>
                                                            <td className="px-6 py-4 align-top">
                                                                <div className="flex items-center gap-2">
                                                                    <div>
                                                                        <p className="font-bold text-gray-400 dark:text-gray-500 text-sm line-through">{diff.item.category}</p>
                                                                        <p className="text-xs text-gray-400 line-through">{diff.item.fabricQuality}</p>
                                                                    </div>
                                                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700">Removed</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 align-top text-xs text-gray-400 hidden md:table-cell line-through">
                                                                <p>Weight: {diff.item.weightGSM} GSM</p>
                                                                <p>Sizes: {diff.item.sizeRange.join(', ')}</p>
                                                            </td>
                                                            <td className="px-6 py-4 align-top text-right text-sm text-gray-400 line-through">
                                                                {diff.item.quantityType === 'units' ? `${diff.item.qty?.toLocaleString()} units` : diff.item.containerType}
                                                            </td>
                                                            <td className="px-6 py-4 align-top text-right text-sm text-gray-400 line-through">
                                                                ${diff.item.targetPrice ? parseFloat(diff.item.targetPrice).toFixed(2) : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 align-top text-right text-sm text-gray-400">-</td>
                                                            <td className="px-6 py-4"></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Add More Products Button */}
                                        <div className="flex justify-center mt-6">
                                            <button type="button" onClick={handleAddItem} className="px-6 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-semibold rounded-lg hover:border-[#c20c0b] hover:text-[#c20c0b] transition-colors flex items-center gap-2">
                                                <Plus size={16} /> Add Another Product
                                            </button>
                                        </div>

                                        {/* Totals Section */}
                                        <div className="flex justify-end mt-8">
                                            <div className="w-full max-w-xs space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                                    <span className="font-medium text-gray-800 dark:text-white">${totalEstimatedCost > 0 ? totalEstimatedCost.toFixed(2) : 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">Taxes & Fees</span>
                                                    <span className="font-medium text-gray-800 dark:text-white">Calculated at checkout</span>
                                                </div>
                                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-lg">
                                                    <span className="text-gray-900 dark:text-white">Estimated Total</span>
                                                    <span className="text-gray-900 dark:text-white">${totalEstimatedCost > 0 ? totalEstimatedCost.toFixed(2) : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })()}
                            </>
                        )}
                        
                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex gap-2">
                                {currentStep > 1 && (
                                    <button type="button" onClick={handleBack} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm">
                                        <ChevronLeft size={16}/> Back
                                    </button>
                                )}
                                <button type="button" onClick={handleSaveDraft} className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm">
                                    <Save size={16}/> Save Draft
                                </button>
                                <button type="button" onClick={handleResetForm} className="px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            {currentStep < 5 ? (
                                currentStep === 3 ? (
                                    <button 
                                        type="button"
                                        onClick={handleNext}
                                        className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors flex items-center gap-1 px-4 py-3"
                                    >
                                        Skip to next step <ArrowRight size={14} />
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleNext} className="px-6 py-3 bg-gradient-to-r from-[#c20c0b] to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                                        Continue <ArrowRight size={18}/>
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    onClick={onSubmitButtonClick}
                                    disabled={isSubmitting}
                                    className={`px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                                        isSubmitting
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Zap className="animate-spin" size={18}/> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18}/> Submit Request
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                    </div>
                    )}
                </div>

                {/* Reset Confirmation Modal */}
                {isResetModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsResetModalOpen(false)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Reset Form?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">This will clear all entered data. This action cannot be undone.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                                <button onClick={confirmReset} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Reset</button>
                            </div>
                        </div>
                    </div>, document.body
                )}

                {/* Delete Item Confirmation Modal */}
                {isDeleteModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsDeleteModalOpen(false)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Remove Item?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to remove this item from your order?</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                                <button onClick={confirmDeleteItem} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Remove</button>
                            </div>
                        </div>
                    </div>, document.body
                )}

                {/* Success Animation Overlay */}
                {showSuccessAnimation && createPortal(
                    <div className="fixed inset-0 bg-gradient-to-br from-green-500/95 to-emerald-600/95 flex items-center justify-center z-[100] animate-fade-in">
                        <div className="text-center text-white px-8">
                            {/* Animated Checkmark Circle */}
                            <div className="relative mx-auto w-32 h-32 mb-8">
                                <svg className="w-32 h-32" viewBox="0 0 100 100">
                                    {/* Background circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.3)"
                                        strokeWidth="6"
                                    />
                                    {/* Animated circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray="283"
                                        strokeDashoffset="283"
                                        style={{
                                            animation: 'drawCircle 0.6s ease-out forwards'
                                        }}
                                    />
                                    {/* Checkmark */}
                                    <path
                                        d="M30 50 L45 65 L70 35"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray="60"
                                        strokeDashoffset="60"
                                        style={{
                                            animation: 'drawCheck 0.4s ease-out 0.5s forwards'
                                        }}
                                    />
                                </svg>
                            </div>

                            {/* Success Message */}
                            <h2
                                className="text-4xl font-bold mb-4 opacity-0"
                                style={{ animation: 'fadeInUp 0.5s ease-out 0.7s forwards' }}
                            >
                                Quote Sent!
                            </h2>
                            <p
                                className="text-xl text-white/90 mb-2 opacity-0"
                                style={{ animation: 'fadeInUp 0.5s ease-out 0.9s forwards' }}
                            >
                                Your quote request has been submitted successfully.
                            </p>
                            <p
                                className="text-white/70 opacity-0"
                                style={{ animation: 'fadeInUp 0.5s ease-out 1.1s forwards' }}
                            >
                                Redirecting to your quotes...
                            </p>

                            {/* Loading dots */}
                            <div
                                className="flex justify-center gap-2 mt-6 opacity-0"
                                style={{ animation: 'fadeInUp 0.5s ease-out 1.3s forwards' }}
                            >
                                <div className="w-3 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-3 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-3 h-3 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>

                        {/* CSS Animations */}
                        <style>{`
                            @keyframes drawCircle {
                                to { stroke-dashoffset: 0; }
                            }
                            @keyframes drawCheck {
                                to { stroke-dashoffset: 0; }
                            }
                            @keyframes fadeInUp {
                                from {
                                    opacity: 0;
                                    transform: translateY(20px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                        `}</style>
                    </div>,
                    document.body
                )}
                    </>
                )}
            </div>
        </MainLayout>
    );
};