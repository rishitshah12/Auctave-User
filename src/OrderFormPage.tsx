// Import necessary React tools: FC (Functional Component type), ReactNode (for rendering children), useRef (for accessing DOM elements), and useState (for managing data).
import React, { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
// Import specific icons from the 'lucide-react' library to use in the form UI.
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft, Ruler, Scissors, Image as ImageIcon, FileText, Upload, AlertCircle, Globe, Anchor, Plus, Trash2, Copy, X, ChevronRight, Check, ArrowRight, SkipForward, Save, ChevronDown, Eye
} from 'lucide-react';
// Import the main layout wrapper which provides the sidebar and header structure.
import { MainLayout } from '../src/MainLayout';
// Import the TypeScript definition for the order form data structure.
import { OrderFormData, QuoteRequest } from '../src/types';
import { formatFriendlyDate } from './utils';
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
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{label}</label>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${
                    isDragging
                        ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/10'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
            >
                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                    {icon}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-200 mb-1">
                    <span className="font-semibold text-[#c20c0b]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-200 mb-4">
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
                <label
                    htmlFor={inputId}
                    className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                >
                    Select Files
                </label>
            </div>

            {/* File List / Previews */}
            {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-200">{selectedFiles.length} file(s) selected</p>
                        <button
                            type="button"
                            onClick={() => onFilesSelected([])}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                            <Trash2 size={12} /> Clear All
                        </button>
                    </div>

                    {previews && previews.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                    {/* Hover overlay with preview/delete buttons */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handlePreviewFile(selectedFiles[idx], src)}
                                            className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                                            title="Preview"
                                        >
                                            <Eye size={12} className="text-gray-700" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {selectedFiles.map((file, idx) => (
                                <li key={idx} className="text-xs text-gray-600 dark:text-gray-200 flex items-center bg-gray-50 dark:bg-gray-800 p-1.5 rounded border border-gray-100 dark:border-gray-700 group">
                                    <FileText size={12} className="mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <span className="ml-2 text-gray-400 text-[10px]">({(file.size / 1024).toFixed(0)} KB)</span>
                                    {/* Preview and delete buttons */}
                                    <div className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => handlePreviewFile(file)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                            title="Preview"
                                        >
                                            <Eye size={12} className="text-gray-500 dark:text-gray-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} className="text-red-500" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Image Preview Modal */}
            {previewModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
                    onClick={() => setPreviewModal(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-700 dark:text-white truncate max-w-md">{previewModal.name}</span>
                            <button
                                type="button"
                                onClick={() => setPreviewModal(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="p-4">
                            <img
                                src={previewModal.src}
                                alt={previewModal.name}
                                className="max-w-full max-h-[70vh] object-contain mx-auto"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- Quote Selection Card Component ---
const QuoteSelectionCard: FC<{ quote: QuoteRequest, onSelect: () => void }> = ({ quote, onSelect }) => {
    // Calculate total quantity for units
    const totalUnits = quote.order?.lineItems?.reduce((sum, item) => {
        return item.quantityType === 'units' ? sum + (item.qty || 0) : sum;
    }, 0) || 0;
    
    // Get unique categories
    const categories = Array.from(new Set(quote.order?.lineItems?.map(i => i.category) || [])).join(', ');

    return (
        <div onClick={onSelect} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 dark:text-white">RFQ #{quote.id.slice(0, 8)}</p>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            quote.status === 'Accepted' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 
                            quote.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : 
                            'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                        }`}>
                            {quote.status}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Created on {formatFriendlyDate(quote.submittedAt)}
                    </p>
                </div>
                <div className="text-right">
                     <p className="text-sm font-medium text-gray-900 dark:text-white">{quote.factory?.name || 'General Inquiry'}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">{quote.order?.shippingCountry || 'N/A'}</p>
                </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between mb-1">
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Products</span>
                    <span className="font-medium truncate max-w-[200px] text-right">{categories || 'No products'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Volume</span>
                    <span className="font-medium">{quote.order?.lineItems?.length || 0} Line Items {totalUnits > 0 ? `(${totalUnits.toLocaleString()} units)` : ''}</span>
                </div>
            </div>
        </div>
    );
};

// Define the OrderFormPage component using the props interface defined above.



// --- Helper Component ---
// A small reusable component to render a form field with a label and an icon.
const FormField: FC<{ icon: ReactNode; label: string; children: ReactNode; required?: boolean; error?: string }> = ({ icon, label, children, required, error }) => (
    <div>
        {/* Render the label text above the input */}
        <label className={`block text-sm font-medium mb-1 ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-white'}`}>
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {/* Position the icon inside the input area on the left side */}
            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${error ? 'text-red-500' : ''}`}>
                {icon}
            </div>
            {/* Render the actual input element (passed as children) */}
            {children}
        </div>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 animate-fade-in">{error}</p>}
    </div>
);

// Define the OrderFormPage component using the props interface defined above.
export const OrderFormPage: FC<OrderFormPageProps> = (props) => {
    // Destructure (extract) specific functions we need from the props object.
    const { handleSetCurrentPage, handleSubmitOrderForm, handleAddToQuoteRequest, quoteRequests } = props;

    const [orderType, setOrderType] = useState<'new' | 'existing'>('new');
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(1);
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

    const getInputClass = (error?: string) => `w-full pl-10 p-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${error ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white' : 'border-gray-300 dark:border-gray-600 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white'}`;

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
        setSelectedQuoteId(null);
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
            setFormState({
                lineItems: [{
                    id: generateId(),
                    category: 'T-shirt', qty: 0, containerType: '',
                    fabricQuality: '', weightGSM: '', targetPrice: '', packagingReqs: '', labelingReqs: '', styleOption: '',
                    sizeRange: [], customSize: '', sizeRatio: {}, sleeveOption: '', trimsAndAccessories: '', specialInstructions: '', quantityType: 'units'
                }],
                shippingCountry: quote.order.shippingCountry,
                shippingPort: quote.order.shippingPort
            });
            setErrors({});
            setSampleFiles([]);
            setDocFiles([]);
            setSamplePreviews([]);
            setActiveItemIndex(0);
            setCurrentStep(1);
        }
    };

    const onSampleFilesSelected = (files: File[]) => {
        // Revoke old preview URLs before creating new ones
        samplePreviewsRef.current.forEach(url => URL.revokeObjectURL(url));

        setSampleFiles(files);

        // Create new previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setSamplePreviews(newPreviews);
        samplePreviewsRef.current = newPreviews;
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
        setDocFiles(files);
    };

    const onDocFileRemoved = (index: number) => {
        setDocFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
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
            id: generateId(),
        };

        setFormState(prev => {
            const newItems = [...prev.lineItems];
            newItems.splice(index + 1, 0, newItem);
            return { ...prev, lineItems: newItems };
        });
        setActiveItemIndex(index + 1);
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

        // Submit the form and wait for result
        let success = false;
        try {
            if (orderType === 'existing' && selectedQuoteId) {
                success = await handleAddToQuoteRequest(selectedQuoteId, formState, [...sampleFiles, ...docFiles]);
            } else {
                success = await handleSubmitOrderForm(formState, [...sampleFiles, ...docFiles]);
            }

            if (success) {
                // Show success animation only after successful submission
                setShowSuccessAnimation(true);

                // Trigger confetti
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

                // Navigate to quotes page after animation completes
                setTimeout(() => {
                    handleSetCurrentPage('myQuotes');
                }, 2500);
            } else {
                // Reset submitting state on failure so user can try again
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Submit error:', error);
            // Reset submitting state on error so user can try again
            setIsSubmitting(false);
        }
    };

    const handleResetForm = () => {
        setIsResetModalOpen(true);
    };

    const confirmReset = () => {
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
        { id: 1, title: 'Basic Details' },
        { id: 2, title: 'Specifications' },
        { id: 3, title: 'Attachments' },
        { id: 4, title: 'Logistics' },
        { id: 5, title: 'Summary' }
    ];

    // --- Main Render ---
    return (
        // Wrap the page content in the MainLayout to ensure consistent navigation and styling.
        <MainLayout {...props}>
            <div className="max-w-4xl mx-auto">
                {/* Main Card Container */}
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                    
                    {/* Header Section: Title and Back Button */}
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                                {orderType === 'existing' ? 'Add to Existing RFQ' : 'Garment Sourcing Requirements'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-200">
                                {orderType === 'existing' 
                                    ? 'Select an active quote to add more products.' 
                                    : 'Fill out your order details to find matching factories.'}
                            </p>
                        </div>
                        {/* Button to navigate back to the main sourcing page */}
                        <button onClick={() => handleSetCurrentPage('sourcing')} className="text-sm text-[#c20c0b] font-semibold flex items-center hover:underline whitespace-nowrap">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Sourcing
                        </button>
                    </div>

                    <div className="mb-8">
                        {orderType === 'new' ? (
                            <button 
                                onClick={() => handleOrderTypeChange('existing')}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-[#c20c0b] flex items-center gap-2 transition-colors px-1"
                            >
                                <Package size={16} />
                                <span>Adding to an existing request? Click here.</span>
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleOrderTypeChange('new')}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-[#c20c0b] flex items-center gap-2 transition-colors px-1"
                            >
                                <Plus size={16} />
                                <span>Want to create a new request instead?</span>
                            </button>
                        )}
                    </div>

                    {orderType === 'existing' && selectedQuoteId === null && (
                        <div className="animate-fade-in">
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Select an existing RFQ</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {quoteRequests.filter(q => q.status !== 'Trashed').length > 0 ? (
                                    quoteRequests.filter(q => q.status !== 'Trashed').map(quote => (
                                        <QuoteSelectionCard key={quote.id} quote={quote} onSelect={() => handleSelectQuote(quote.id)} />
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-8">You have no existing RFQs to add to.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* The Form Element */}
                    {(orderType === 'new' || selectedQuoteId !== null) && ( 
                        <div className="animate-fade-in">
                        
                        {/* Stepper */}
                        <div className="mb-12 px-2">
                            <div className="flex items-center justify-between relative">
                                {/* Background Track */}
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
                                
                                {/* Animated Progress Bar */}
                                <div 
                                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[#c20c0b] -z-10 rounded-full transition-all duration-500 ease-in-out"
                                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                                ></div>

                                {steps.map((step) => (
                                    <div key={step.id} className="flex flex-col items-center relative">
                                        <div 
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 z-10 ${
                                                currentStep > step.id 
                                                    ? 'bg-[#c20c0b] border-[#c20c0b] text-white' 
                                                    : currentStep === step.id
                                                        ? 'bg-white dark:bg-gray-900 border-[#c20c0b] text-[#c20c0b] scale-110 shadow-[0_0_0_4px_rgba(194,12,11,0.15)] dark:shadow-[0_0_0_4px_rgba(194,12,11,0.3)]'
                                                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                                            }`}
                                        >
                                            {currentStep > step.id ? <Check size={20} className="animate-fade-in" /> : step.id}
                                        </div>
                                        <span className={`absolute top-12 text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                                            currentStep >= step.id ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={onFormSubmit} className="space-y-8">
                        
                        {/* Line Item Tabs */}
                        {/* Product Navigation (Numbered List) */}
                        {currentStep <= 3 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Products ({formState.lineItems.length})</label>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {formState.lineItems.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setActiveItemIndex(index)}
                                            className={`
                                                flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all
                                                ${activeItemIndex === index 
                                                    ? 'bg-[#c20c0b] text-white shadow-md scale-110 ring-2 ring-offset-2 ring-[#c20c0b] dark:ring-offset-gray-900' 
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#c20c0b] hover:text-[#c20c0b]'}
                                            `}
                                            title={`Product ${index + 1}: ${item.category}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] hover:text-[#c20c0b] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        title="Add Product"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Active Product Header & Actions */}
                        {currentStep <= 3 && (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        Product {activeItemIndex + 1}
                                        <span className="px-2 py-0.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-normal text-gray-500 dark:text-gray-300">
                                            {activeItem.category}
                                        </span>
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicateItem(activeItemIndex)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                        <Copy size={14} /> Duplicate
                                    </button>
                                    {formState.lineItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(activeItemIndex)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        >
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 1: Basic Details */}
                        {currentStep === 1 && (
                        <div className="animate-fade-in">
                            <legend className="text-lg font-semibold text-gray-700 dark:text-white mb-6">Basic Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Category Dropdown */}
                                <div className="md:col-span-2">
                                    <FormField label="Product Category" icon={<Shirt className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].category`]}>
                                        <div className="relative">
                                            <select id={`lineItems[${activeItemIndex}].category`} name="category" value={activeItem.category} onChange={handleFormChange} className={`${getInputClass(errors[`lineItems[${activeItemIndex}].category`])} appearance-none`}>
                                                <option>T-shirt</option> <option>Polo Shirt</option> <option>Hoodies</option> <option>Jeans</option> <option>Jackets</option> <option>Shirts</option> <option>Casual Shirts</option> <option>Trousers</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </FormField>
                                </div>

                                {/* Fabric Quality Input */}
                                <FormField label="Fabric Quality/Composition" icon={<Award className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].fabricQuality`]}>
                                    <input id={`lineItems[${activeItemIndex}].fabricQuality`} type="text" name="fabricQuality" value={activeItem.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className={getInputClass(errors[`lineItems[${activeItemIndex}].fabricQuality`])} />
                                </FormField>

                                {/* Fabric Weight Input */}
                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].weightGSM`]}>
                                    <input id={`lineItems[${activeItemIndex}].weightGSM`} type="number" min="0" name="weightGSM" value={activeItem.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className={getInputClass(errors[`lineItems[${activeItemIndex}].weightGSM`])} />
                                </FormField>

                                {/* Quantity Section - Redesigned */}
                                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700 mt-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-white">
                                            Quantity <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex p-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
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
                        <div className="animate-fade-in">
                            <legend className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Specifications</legend>
                            <div className="space-y-6">
                                {/* 1. Size Range */}
                                <div>
                                    <label id={`lineItems[${activeItemIndex}].sizeRange`} className={`block text-sm font-medium mb-2 ${errors[`lineItems[${activeItemIndex}].sizeRange`] ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-white'}`}>Size Range <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-3">
                                        {sizeOptions.map(size => (
                                            <label key={size} className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <input 
                                                    type="checkbox" 
                                                    checked={activeItem.sizeRange.includes(size)} 
                                                    onChange={() => handleSizeCheckbox(size)}
                                                    className="rounded text-[#c20c0b] focus:ring-[#c20c0b] mr-2" 
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200">{size}</span>
                                            </label>
                                        ))}
                                        <label className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <input 
                                                type="checkbox" 
                                                checked={activeItem.sizeRange.includes('Custom')} 
                                                onChange={() => handleSizeCheckbox('Custom')}
                                                className="rounded text-[#c20c0b] focus:ring-[#c20c0b] mr-2" 
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-200">Custom</span>
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
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
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
                                    <FormField label="Sleeve Options" icon={<Shirt className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].sleeveOption`]}>
                                        <select id={`lineItems[${activeItemIndex}].sleeveOption`} name="sleeveOption" value={activeItem.sleeveOption} onChange={handleFormChange} className={getInputClass(errors[`lineItems[${activeItemIndex}].sleeveOption`])}>
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
                                <FormField label="Packaging Option" icon={<Box className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].packagingReqs`]}>
                                    <input id={`lineItems[${activeItemIndex}].packagingReqs`} type="text" name="packagingReqs" value={activeItem.packagingReqs} onChange={handleFormChange} placeholder="e.g., Poly bag with warning text" className={getInputClass(errors[`lineItems[${activeItemIndex}].packagingReqs`])} />
                                </FormField>

                                {/* 5. Trims & Accessories */}
                                <FormField label="Trims & Accessories" icon={<Scissors className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].trimsAndAccessories`]}>
                                    <input id={`lineItems[${activeItemIndex}].trimsAndAccessories`} type="text" name="trimsAndAccessories" value={activeItem.trimsAndAccessories} onChange={handleFormChange} placeholder="e.g., YKK Zippers, Metal Buttons" className={getInputClass(errors[`lineItems[${activeItemIndex}].trimsAndAccessories`])} />
                                </FormField>
                            </div>
                        </div>
                        )}

                        {/* Section 3: Attachments */}
                        {currentStep === 3 && (
                        <div className="animate-fade-in">
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
                        </div>
                        )}

                        {/* Section 3: Logistics & Commercials */}
                        {currentStep === 4 && (
                        <div className="animate-fade-in">
                            <legend className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Logistics & Commercials</legend>
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
                        {currentStep === 5 && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Order Summary</h3>
                                
                                {/* Logistics Section */}
                                <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center"><Globe size={20} className="mr-2 text-[#c20c0b]"/> Destination</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-200 uppercase font-semibold">Country</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{formState.shippingCountry}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-200 uppercase font-semibold">Port</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{formState.shippingPort}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cost Breakdown Section */}
                                {(totalEstimatedCost > 0 || hasContainerItems) && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center">
                                            <DollarSign size={20} className="mr-2 text-green-600 dark:text-green-400"/> Estimated Cost Breakdown
                                        </h3>
                                        <div className="space-y-2">
                                            {formState.lineItems.map((item, idx) => {
                                                if (!item.targetPrice) return null;
                                                if (item.quantityType === 'units') {
                                                    if (!item.qty) return null;
                                                    const qty = item.qty;
                                                    const price = parseFloat(item.targetPrice);
                                                    if (isNaN(qty) || isNaN(price)) return null;
                                                    const itemTotal = qty * price;
                                                    return (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-gray-600 dark:text-gray-300">{idx + 1}. {item.category} ({qty.toLocaleString()} x ${price.toFixed(2)})</span>
                                                            <span className="font-medium text-gray-900 dark:text-white">${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-gray-600 dark:text-gray-300">{idx + 1}. {item.category} ({item.containerType} @ ${item.targetPrice}/unit)</span>
                                                            <span className="font-medium text-gray-500 dark:text-gray-400 italic">N/A (Container)</span>
                                                        </div>
                                                    );
                                                }
                                            })}
                                            <div className="border-t border-green-200 dark:border-green-700 pt-2 mt-2 flex justify-between items-center">
                                                <span className="font-bold text-gray-800 dark:text-white">Total Estimated Target</span>
                                                <span className="font-bold text-green-700 dark:text-green-400 text-lg">
                                                    ${totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {hasContainerItems && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1"> + Container Costs</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Products Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center"><Package size={20} className="mr-2 text-[#c20c0b]"/> Products ({formState.lineItems.length})</h3>
                                    <div className="space-y-4">
                                        {formState.lineItems.map((item, idx) => (
                                            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-[#c20c0b] text-lg">Product {idx + 1}: {item.category}</h4>
                                                    <span className="bg-red-100 text-[#a50a09] text-xs font-bold px-2 py-1 rounded-full">{item.quantityType === 'container' ? item.containerType : `${item.qty} Units`}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                                    <div><span className="text-gray-500 dark:text-gray-200">Fabric:</span> <span className="font-medium text-gray-900 dark:text-white">{item.fabricQuality}</span></div>
                                                    <div><span className="text-gray-500 dark:text-gray-200">Weight:</span> <span className="font-medium text-gray-900 dark:text-white">{item.weightGSM} GSM</span></div>
                                                    <div><span className="text-gray-500 dark:text-gray-200">Target Price:</span> <span className="font-medium text-gray-900 dark:text-white">${item.targetPrice}</span></div>
                                                    <div><span className="text-gray-500 dark:text-gray-200">Sizes:</span> <span className="font-medium text-gray-900 dark:text-white">{item.sizeRange.join(', ')}</span></div>
                                                    {item.sleeveOption && <div><span className="text-gray-500 dark:text-gray-200">Sleeve:</span> <span className="font-medium text-gray-900 dark:text-white">{item.sleeveOption}</span></div>}
                                                    <div className="md:col-span-2"><span className="text-gray-500 dark:text-gray-200">Packaging:</span> <span className="font-medium text-gray-900 dark:text-white">{item.packagingReqs}</span></div>
                                                    {item.specialInstructions && <div className="md:col-span-2"><span className="text-gray-500 dark:text-gray-200">Instructions:</span> <span className="font-medium text-gray-900 dark:text-white">{item.specialInstructions}</span></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Navigation Buttons */}
                        <div className="pt-6 border-t flex flex-col md:flex-row justify-between gap-4 mt-8"> 
                            <div>
                                {currentStep === 1 && (
                                    <button type="button" onClick={handleResetForm} className="px-6 py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-red-600 transition">Reset Form</button>
                                )}
                                {currentStep > 1 && (
                                    <button type="button" onClick={handleBack} className="px-6 py-3 text-gray-700 dark:text-white font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Back</button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={handleSaveDraft} className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition flex items-center gap-2">
                                    <Save size={18} /> <span className="hidden sm:inline">Save Draft</span>
                                </button>
                                {currentStep === 3 && (
                                    <button type="button" onClick={handleNext} className="px-6 py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-[#c20c0b] transition flex items-center gap-2">
                                        Skip <SkipForward size={16} />
                                    </button>
                                )}
                                {currentStep < 5 ? (
                                    <button type="button" onClick={handleNext} className="px-8 py-3 text-white rounded-lg font-semibold bg-[#c20c0b] hover:bg-[#a50a09] transition shadow-md flex items-center gap-2">
                                        Next Step <ArrowRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onSubmitButtonClick}
                                        disabled={isSubmitting}
                                        className={`px-8 py-3 text-white rounded-lg font-bold transition shadow-md flex items-center gap-2 ${
                                            isSubmitting
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
                                        }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={18} /> {orderType === 'new' ? 'Submit Quote Request' : 'Add Products to RFQ'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                    </div>
                    )}
                </div>

                {/* Reset Confirmation Modal */}
                {isResetModalOpen && (
                    createPortal(<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reset Form?</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to reset the form? All entered data will be lost.</p>
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmReset}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Reset Form
                                </button>
                            </div>
                        </div>
                    </div>, document.body)
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
            </div>
        </MainLayout>
    );
};