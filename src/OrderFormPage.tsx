// Import necessary React tools: FC (Functional Component type), ReactNode (for rendering children), useRef (for accessing DOM elements), and useState (for managing data).
import React, { FC, ReactNode, useRef, useState, useEffect } from 'react';
// Import specific icons from the 'lucide-react' library to use in the form UI.
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft, Ruler, Scissors, Image as ImageIcon, FileText, Upload, AlertCircle, Globe, Anchor, Plus, Trash2, Copy, X
} from 'lucide-react';
// Import the main layout wrapper which provides the sidebar and header structure.
import { MainLayout } from '../src/MainLayout';
// Import the TypeScript definition for the order form data structure.
import { OrderFormData } from '../src/types';

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
    handleSubmitOrderForm: (formData: OrderFormData, files: File[]) => void; 
}

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

// --- Helper Component ---
// A small reusable component to render a form field with a label and an icon.
const FormField: FC<{ icon: ReactNode; label: string; children: ReactNode; required?: boolean }> = ({ icon, label, children, required }) => (
    <div>
        {/* Render the label text above the input */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {/* Position the icon inside the input area on the left side */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {icon}
            </div>
            {/* Render the actual input element (passed as children) */}
            {children}
        </div>
    </div>
);

// Define the OrderFormPage component using the props interface defined above.
export const OrderFormPage: FC<OrderFormPageProps> = (props) => {
    // Destructure (extract) specific functions we need from the props object.
    const { handleSetCurrentPage, handleSubmitOrderForm } = props;

    // --- State Management ---
    // Initialize the form state with default values so the fields aren't empty when the user arrives.
    const [formState, setFormState] = useState<OrderFormData>({
        lineItems: [{
            id: Date.now(),
            category: 'T-shirt',
            qty: '',
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
            trimsAndAccessories: '',
            specialInstructions: '',
            quantityType: 'units'
        }],
        shippingCountry: '',
        shippingPort: ''
    });

    const [activeItemIndex, setActiveItemIndex] = useState(0);

    // State to hold the list of files uploaded by the user.
    const [sampleFiles, setSampleFiles] = useState<File[]>([]);
    const [docFiles, setDocFiles] = useState<File[]>([]);
    const [availablePorts, setAvailablePorts] = useState<string[]>([]);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

    const containerOptions = ["20ft FCL", "40ft FCL", "20ft HC FCL", "40ft HC FCL"];

    useEffect(() => {
        if (formState.shippingCountry) {
            fetchPortsForCountry(formState.shippingCountry).then(setAvailablePorts);
        } else {
            setAvailablePorts([]);
        }
    }, [formState.shippingCountry]);

    // Create a reference to the hidden file input element so we can reset it if needed.
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                return { ...prev, [name]: value, shippingPort: '' };
            }
            if (name === 'shippingPort') {
                return { ...prev, [name]: value };
            }
            // Update active line item
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...newItems[activeItemIndex], [name]: value };
            return { ...prev, lineItems: newItems };
        }); 
    };

    const handleSizeCheckbox = (size: string) => {
        setFormState(prev => {
            const currentItem = prev.lineItems[activeItemIndex];
            const newRange = currentItem.sizeRange.includes(size)
                ? currentItem.sizeRange.filter(s => s !== size)
                : [...currentItem.sizeRange, size];
            
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...currentItem, sizeRange: newRange };
            return { ...prev, lineItems: newItems };
        });
    };

    const handleSampleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSampleFiles(Array.from(e.target.files));
        }
    };

    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setDocFiles(Array.from(e.target.files));
        }
    };

    const handleAddItem = () => {
        setFormState(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, {
                id: Date.now(),
                category: 'T-shirt',
                qty: '',
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
                trimsAndAccessories: '',
                specialInstructions: '',
                quantityType: 'units'
            }]
        }));
        setActiveItemIndex(formState.lineItems.length);
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
        const itemToDuplicate = formState.lineItems[index];
        const newItem = {
            ...JSON.parse(JSON.stringify(itemToDuplicate)), // Deep copy to avoid reference issues
            id: Date.now(),
        };

        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems.splice(index + 1, 0, newItem);
            return { ...prev, lineItems: newItems };
        });
        setActiveItemIndex(index + 1);
    };

    // Function called when the user clicks the "Submit" button.
    const onFormSubmit = (e: React.FormEvent) => { 
        // Prevent the default browser behavior (which would reload the page).
        e.preventDefault(); 

        // --- Line Item Validation ---
        const lineItemRequiredFields = [
            { key: 'category', label: 'Product Category' },
            { key: 'qty', label: 'Quantity' },
            { key: 'weightGSM', label: 'Fabric Weight (GSM)' },
            { key: 'fabricQuality', label: 'Fabric Quality' },
            { key: 'packagingReqs', label: 'Packaging Option' },
        ];

        for (let i = 0; i < formState.lineItems.length; i++) {
            const item = formState.lineItems[i];
            for (const field of lineItemRequiredFields) {
                const value = (item as any)[field.key];
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    if (window.showToast) window.showToast(`Product ${i + 1}: ${field.label} is required.`, 'error');
                    return;
                }
            }
            if (item.sizeRange.length === 0) {
                if (window.showToast) window.showToast(`Product ${i + 1}: Size Range is required.`, 'error');
                return;
            }
        }

        // --- Main Form Validation ---
        if (!formState.shippingCountry || formState.shippingCountry.trim() === '') {
             if (window.showToast) window.showToast(`Destination Country is required.`, 'error');
             return;
        }
        if (!formState.shippingPort || formState.shippingPort.trim() === '') {
             if (window.showToast) window.showToast(`Destination Port is required.`, 'error');
             return;
        }

        if (formState.shippingCountry && availablePorts.length > 0 && !availablePorts.includes(formState.shippingPort)) {
            if (window.showToast) window.showToast('The selected Destination Port is not valid for the chosen country.', 'error');
            return;
        }

        // Open summary modal instead of submitting directly
        setIsSummaryModalOpen(true);
    };

    const handleConfirmSubmit = () => {
        // Call the parent function passed via props to process the data.
        handleSubmitOrderForm(formState, [...sampleFiles, ...docFiles]); 
        setIsSummaryModalOpen(false);
    };

    const handleResetForm = () => {
        if (window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
            setFormState({
                lineItems: [{
                    id: Date.now(),
                    category: 'T-shirt',
                    qty: '',
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
                    trimsAndAccessories: '',
                    specialInstructions: ''
                }],
                shippingCountry: '',
                shippingPort: ''
            });
            setSampleFiles([]);
            setDocFiles([]);
            setAvailablePorts([]);
            setActiveItemIndex(0);
            if (window.showToast) window.showToast('Form reset successfully.');
        }
    };

    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const activeItem = formState.lineItems[activeItemIndex];
    const isUpperBody = ['T-shirt', 'Polo Shirt', 'Hoodies', 'Jackets', 'Shirts', 'Casual Shirts'].includes(activeItem.category);

    const setQuantityType = (type: 'units' | 'container') => {
        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems[activeItemIndex] = { ...newItems[activeItemIndex], quantityType: type, qty: '' };
            return { ...prev, lineItems: newItems };
        });
    };

    // --- Main Render ---
    return (
        // Wrap the page content in the MainLayout to ensure consistent navigation and styling.
        <MainLayout {...props}>
            <div className="max-w-4xl mx-auto">
                {/* Main Card Container */}
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    {/* Header Section: Title and Back Button */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Garment Sourcing Requirements</h2>
                            <p className="text-gray-500">Fill out your order details to find matching factories.</p>
                        </div>
                        {/* Button to navigate back to the main sourcing page */}
                        <button onClick={() => handleSetCurrentPage('sourcing')} className="text-sm text-[#c20c0b] font-semibold flex items-center hover:underline whitespace-nowrap">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Sourcing
                        </button>
                    </div>

                    {/* The Form Element */}
                    <form onSubmit={onFormSubmit} className="space-y-8">
                        
                        {/* Line Item Tabs */}
                        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                            {formState.lineItems.map((item, index) => (
                                <div key={item.id} className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveItemIndex(index)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                            activeItemIndex === index
                                                ? 'bg-[#c20c0b] text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        Product {index + 1}
                                    </button>
                                    {activeItemIndex === index && (
                                        <div className="flex items-center ml-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDuplicateItem(index); }}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Duplicate Product"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            {formState.lineItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveItem(index); }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Remove Product"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-[#c20c0b] hover:bg-red-100 border border-red-200 border-dashed flex items-center gap-2 transition-colors whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Product
                            </button>
                        </div>

                        {/* Section 1: Basic Details */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Basic Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Category Dropdown */}
                                <FormField label="Product Category" icon={<Shirt className="h-5 w-5 text-gray-400" />} required>
                                    <select name="category" value={activeItem.category} onChange={handleFormChange} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white appearance-none">
                                        <option>T-shirt</option> <option>Polo Shirt</option> <option>Hoodies</option> <option>Jeans</option> <option>Jackets</option> <option>Shirts</option> <option>Casual Shirts</option> <option>Trousers</option>
                                    </select>
                                </FormField>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Type <span className="text-red-500">*</span></label>
                                    <div className="flex p-1 bg-gray-100 rounded-lg mb-2">
                                        <button type="button" onClick={() => setQuantityType('units')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${activeItem.quantityType === 'units' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                                            By Units
                                        </button>
                                        <button type="button" onClick={() => setQuantityType('container')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${activeItem.quantityType === 'container' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                                            By Container
                                        </button>
                                    </div>
                                    {activeItem.quantityType === 'units' ? (
                                        <FormField label="Order Quantity (Units)" icon={<Package className="h-5 w-5 text-gray-400" />} required>
                                            <input type="number" min="0" name="qty" value={activeItem.qty} onChange={handleFormChange} placeholder="e.g., 5000" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                        </FormField>
                                    ) : (
                                        <FormField label="Container Load" icon={<Package className="h-5 w-5 text-gray-400" />} required>
                                            <select name="qty" value={activeItem.qty} onChange={handleFormChange} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white appearance-none">
                                                <option value="">Select Container Type</option>
                                                {containerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </FormField>
                                    )}
                                </div>
                                {/* Fabric Weight Input */}
                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />} required>
                                    <input type="number" min="0" name="weightGSM" value={activeItem.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                </FormField>
                                {/* Fabric Quality Input */}
                                <FormField label="Fabric Quality/Composition" icon={<Award className="h-5 w-5 text-gray-400" />} required>
                                    <input type="text" name="fabricQuality" value={activeItem.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                </FormField>
                            </div>
                        </fieldset>

                        {/* Section 2: Specifications */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Specifications</legend>
                            <div className="space-y-6">
                                {/* 1. Size Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Size Range <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-3">
                                        {sizeOptions.map(size => (
                                            <label key={size} className="inline-flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                                                <input 
                                                    type="checkbox" 
                                                    checked={activeItem.sizeRange.includes(size)} 
                                                    onChange={() => handleSizeCheckbox(size)}
                                                    className="rounded text-[#c20c0b] focus:ring-[#c20c0b] mr-2" 
                                                />
                                                <span className="text-sm text-gray-700">{size}</span>
                                            </label>
                                        ))}
                                        <label className="inline-flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                                            <input 
                                                type="checkbox" 
                                                checked={activeItem.sizeRange.includes('Custom')} 
                                                onChange={() => handleSizeCheckbox('Custom')}
                                                className="rounded text-[#c20c0b] focus:ring-[#c20c0b] mr-2" 
                                            />
                                            <span className="text-sm text-gray-700">Custom</span>
                                        </label>
                                    </div>
                                    {activeItem.sizeRange.includes('Custom') && (
                                        <div className="mt-3">
                                            <input type="text" name="customSize" value={activeItem.customSize} onChange={handleFormChange} placeholder="Enter custom sizes (e.g., 4XL, 5XL)" className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] text-sm" />
                                        </div>
                                    )}
                                </div>

                                {/* 2. Size Ratio */}
                                {activeItem.sizeRange.length > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center"><Ruler className="w-4 h-4 mr-1"/> Size Ratio / Breakdown</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                            {activeItem.sizeRange.map(size => (
                                                <div key={size}>
                                                    <label className="block text-xs text-gray-500 mb-1">{size}</label>
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
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] text-sm" 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Sleeve Options (Upper Body Only) */}
                                {isUpperBody && (
                                    <FormField label="Sleeve Options" icon={<Shirt className="h-5 w-5 text-gray-400" />}>
                                        <select name="sleeveOption" value={activeItem.sleeveOption} onChange={handleFormChange} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white">
                                            <option value="">Select Sleeve Type</option>
                                            <option>Short Sleeve</option>
                                            <option>Long Sleeve</option>
                                            <option>Sleeveless</option>
                                            <option>3/4 Sleeve</option>
                                            <option>Raglan</option>
                                        </select>
                                    </FormField>
                                )}

                                {/* 4. Packaging Option */}
                                <FormField label="Packaging Option" icon={<Box className="h-5 w-5 text-gray-400" />} required>
                                    <input type="text" name="packagingReqs" value={activeItem.packagingReqs} onChange={handleFormChange} placeholder="e.g., Poly bag with warning text" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                </FormField>

                                {/* 5. Trims & Accessories */}
                                <FormField label="Trims & Accessories" icon={<Scissors className="h-5 w-5 text-gray-400" />}>
                                    <input type="text" name="trimsAndAccessories" value={activeItem.trimsAndAccessories} onChange={handleFormChange} placeholder="e.g., YKK Zippers, Metal Buttons" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                </FormField>

                                {/* 6. Sample Photo Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sample Photo Upload</label>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition">
                                            <ImageIcon className="h-5 w-5 text-gray-500" />
                                            <span className="text-sm text-gray-600">Choose Photos</span>
                                            <input type="file" accept="image/*" multiple onChange={handleSampleFileChange} className="hidden" />
                                        </label>
                                        <span className="text-xs text-gray-500">{sampleFiles.length} file(s) selected</span>
                                    </div>
                                </div>

                                {/* 7. Document Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Upload (Tech Pack, Size Chart)</label>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition">
                                            <FileText className="h-5 w-5 text-gray-500" />
                                            <span className="text-sm text-gray-600">Choose Documents</span>
                                            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple onChange={handleDocFileChange} className="hidden" />
                                        </label>
                                        <span className="text-xs text-gray-500">{docFiles.length} file(s) selected</span>
                                    </div>
                                </div>

                                {/* 8. Special Instructions */}
                                <div className="md:col-span-2">
                                    <FormField label="Special Instructions" icon={<AlertCircle className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="specialInstructions" value={activeItem.specialInstructions} onChange={handleFormChange} rows={3} placeholder="Any other specific requirements..." className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"></textarea>
                                    </FormField>
                                </div>

                                {/* 9. Target Price */}
                                <FormField label="Target Price per Unit (USD)" icon={<DollarSign className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" min="0" step="0.01" name="targetPrice" value={activeItem.targetPrice} onChange={handleFormChange} placeholder="e.g., 4.50" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                </FormField>
                            </div>
                        </fieldset>

                        {/* Section 3: Logistics & Commercials */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Logistics & Commercials</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Destination Country */}
                                <FormField label="Destination Country" icon={<Globe className="h-5 w-5 text-gray-400" />} required>
                                    <input type="text" name="shippingCountry" value={formState.shippingCountry} onChange={handleFormChange} list="countries" placeholder="Select Country" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                    <datalist id="countries">
                                        {COUNTRIES.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </FormField>
                                {/* Destination Port */}
                                <FormField label="Destination Port" icon={<Anchor className="h-5 w-5 text-gray-400" />} required>
                                    <input type="text" name="shippingPort" value={formState.shippingPort} onChange={handleFormChange} list="ports" placeholder="Select Port" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b]" />
                                    <datalist id="ports">
                                        {availablePorts.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </FormField>
                            </div>
                        </fieldset>
                        
                        {/* Submit Button */}
                        <div className="pt-6 border-t flex flex-col md:flex-row justify-end gap-4"> 
                            <button type="button" onClick={handleResetForm} className="w-full md:w-auto px-6 py-3 text-gray-700 font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                                Reset Form
                            </button>
                            <button type="submit" className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-semibold bg-[#c20c0b] hover:bg-[#a50a09] transition shadow-md"> 
                                Submit Quote Request 
                            </button> 
                        </div>
                    </form>
                </div>

                {/* Summary Modal */}
                {isSummaryModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-800">Review Your Order</h2>
                                <button onClick={() => setIsSummaryModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                            </div>
                            
                            <div className="p-6 space-y-8 flex-grow overflow-y-auto">
                                {/* Logistics Section */}
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><Globe size={20} className="mr-2 text-[#c20c0b]"/> Destination</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
                                            <p className="text-gray-900 font-medium">{formState.shippingCountry}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Port</p>
                                            <p className="text-gray-900 font-medium">{formState.shippingPort}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Products Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Package size={20} className="mr-2 text-[#c20c0b]"/> Products ({formState.lineItems.length})</h3>
                                    <div className="space-y-4">
                                        {formState.lineItems.map((item, idx) => (
                                            <div key={item.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-[#c20c0b] text-lg">Product {idx + 1}: {item.category}</h4>
                                                    <span className="bg-red-100 text-[#a50a09] text-xs font-bold px-2 py-1 rounded-full">
                                                        {item.qty} {item.quantityType === 'container' ? '' : 'Units'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                                    <div><span className="text-gray-500">Fabric:</span> <span className="font-medium text-gray-900">{item.fabricQuality}</span></div>
                                                    <div><span className="text-gray-500">Weight:</span> <span className="font-medium text-gray-900">{item.weightGSM} GSM</span></div>
                                                    <div><span className="text-gray-500">Target Price:</span> <span className="font-medium text-gray-900">${item.targetPrice}</span></div>
                                                    <div><span className="text-gray-500">Sizes:</span> <span className="font-medium text-gray-900">{item.sizeRange.join(', ')}</span></div>
                                                    {item.sleeveOption && <div><span className="text-gray-500">Sleeve:</span> <span className="font-medium text-gray-900">{item.sleeveOption}</span></div>}
                                                    <div className="md:col-span-2"><span className="text-gray-500">Packaging:</span> <span className="font-medium text-gray-900">{item.packagingReqs}</span></div>
                                                    {item.specialInstructions && <div className="md:col-span-2"><span className="text-gray-500">Instructions:</span> <span className="font-medium text-gray-900">{item.specialInstructions}</span></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Files Section */}
                                {(sampleFiles.length > 0 || docFiles.length > 0) && (
                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><FileText size={20} className="mr-2 text-blue-600"/> Attachments</h3>
                                        <ul className="space-y-2">
                                            {[...sampleFiles, ...docFiles].map((f, i) => (
                                                <li key={i} className="flex items-center text-sm text-gray-700 bg-white p-2 rounded border border-blue-100">
                                                    <span className="bg-blue-100 text-blue-600 p-1 rounded mr-2 text-xs font-bold">{i < sampleFiles.length ? 'IMG' : 'DOC'}</span>
                                                    {f.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 rounded-b-xl">
                                <button onClick={() => setIsSummaryModalOpen(false)} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                                    Edit Order
                                </button>
                                <button onClick={handleConfirmSubmit} className="px-8 py-3 bg-[#c20c0b] text-white font-bold rounded-xl hover:bg-[#a50a09] shadow-md transition-transform transform hover:scale-105">
                                    Confirm & Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};