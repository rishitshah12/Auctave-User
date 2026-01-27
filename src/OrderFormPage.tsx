// Import necessary React tools: FC (Functional Component type), ReactNode (for rendering children), useRef (for accessing DOM elements), and useState (for managing data).
import React, { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Import specific icons from the 'lucide-react' library to use in the form UI.
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft, Ruler, Scissors, Image as ImageIcon, FileText, Upload, AlertCircle, Globe, Anchor, Plus, Trash2, Copy, X, ChevronRight
} from 'lucide-react';
// Import the main layout wrapper which provides the sidebar and header structure.
import { MainLayout } from '../src/MainLayout';
// Import the TypeScript definition for the order form data structure.
import { OrderFormData, QuoteRequest } from '../src/types';

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
    handleAddToQuoteRequest: (quoteId: string, formData: OrderFormData, files: File[]) => void;
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
}> = ({ label, accept, multiple, onFilesSelected, icon, selectedFiles, previews }) => {
    const [isDragging, setIsDragging] = useState(false);

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

        if (invalidFiles.length > 0 && window.showToast) {
            window.showToast(`File(s) too large (max 50MB): ${invalidFiles.join(', ')}`, 'error');
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
                            <Trash2 size={12} /> Clear
                        </button>
                    </div>
                    
                    {previews && previews.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {selectedFiles.map((file, idx) => (
                                <li key={idx} className="text-xs text-gray-600 dark:text-gray-200 flex items-center bg-gray-50 dark:bg-gray-800 p-1.5 rounded border border-gray-100 dark:border-gray-700">
                                    <FileText size={12} className="mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <span className="ml-2 text-gray-400 text-[10px]">({(file.size / 1024).toFixed(0)} KB)</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Quote Selection Card Component ---
const QuoteSelectionCard: FC<{ quote: QuoteRequest, onSelect: () => void }> = ({ quote, onSelect }) => {
    // Calculate total quantity for units
    const totalUnits = quote.order?.lineItems?.reduce((sum, item) => {
        return item.quantityType === 'units' ? sum + (parseInt(item.qty) || 0) : sum;
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
                        Created on {new Date(quote.submittedAt).toLocaleDateString()}
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

    // --- State Management ---
    // Initialize the form state with default values so the fields aren't empty when the user arrives.
    const [formState, setFormState] = useState<OrderFormData>({
        lineItems: [{
            id: generateId(),
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
    const [samplePreviews, setSamplePreviews] = useState<string[]>([]);
    const [docFiles, setDocFiles] = useState<File[]>([]);
    const [availablePorts, setAvailablePorts] = useState<string[]>([]);
    const [isLoadingPorts, setIsLoadingPorts] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const tabsContainerRef = useRef<HTMLDivElement>(null);

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
            newItems[activeItemIndex] = { ...newItems[activeItemIndex], [name]: value };
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
        setErrors({});
        setSampleFiles([]);
        setDocFiles([]);
        setSamplePreviews([]);
        setActiveItemIndex(0);
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
                    category: 'T-shirt',
                    qty: '', fabricQuality: '', weightGSM: '', targetPrice: '', packagingReqs: '', labelingReqs: '', styleOption: '',
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
        }
    };

    const onSampleFilesSelected = (files: File[]) => {
        setSampleFiles(files);
        
        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setSamplePreviews(newPreviews);
    };
    
    useEffect(() => {
        return () => samplePreviews.forEach(url => URL.revokeObjectURL(url));
    }, [samplePreviews]);

    const onDocFilesSelected = (files: File[]) => {
        setDocFiles(files);
    };

    const handleAddItem = () => {
        setFormState(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, {
                id: generateId(),
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

    useEffect(() => {
        if (tabsContainerRef.current) {
            const activeTab = tabsContainerRef.current.children[activeItemIndex] as HTMLElement;
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeItemIndex]);


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

    // Function called when the user clicks the "Submit" button.
    const onFormSubmit = (e: React.FormEvent) => { 
        // Prevent the default browser behavior (which would reload the page).
        e.preventDefault(); 

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

        formState.lineItems.forEach((item, index) => {
            lineItemRequiredFields.forEach(field => {
                const val = (item as any)[field.key];
                if (!val || (typeof val === 'string' && val.trim() === '')) {
                    const key = `lineItems[${index}].${field.key}`;
                    newErrors[key] = `${field.label} is required`;
                    if (!firstErrorId) firstErrorId = key;
                }
            });

            if (item.sizeRange.length === 0) {
                const key = `lineItems[${index}].sizeRange`;
                newErrors[key] = 'Size Range is required';
                if (!firstErrorId) firstErrorId = key;
            }
        });

        // --- Main Form Validation ---
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

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            if (window.showToast) window.showToast('Please fix the errors in the form.', 'error');
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

        // Open summary modal for both new and existing RFQs
        setIsSummaryModalOpen(true);
    };

    const handleConfirmSubmit = () => {
        if (orderType === 'existing' && selectedQuoteId) {
            handleAddToQuoteRequest(selectedQuoteId, formState, [...sampleFiles, ...docFiles]);
        } else {
            handleSubmitOrderForm(formState, [...sampleFiles, ...docFiles]);
        }
        setIsSummaryModalOpen(false);
    };

    const handleResetForm = () => {
        setIsResetModalOpen(true);
    };

    const confirmReset = () => {
        setFormState({
            lineItems: [{
                id: generateId(),
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
        setErrors({});
        setSampleFiles([]);
        setSamplePreviews([]);
        setDocFiles([]);
        setAvailablePorts([]);
        setActiveItemIndex(0);
        setIsResetModalOpen(false);
        if (window.showToast) window.showToast('Form reset successfully.');
    };

    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const activeItem = formState.lineItems[activeItemIndex];
    const isUpperBody = ['T-shirt', 'Polo Shirt', 'Hoodies', 'Jackets', 'Shirts', 'Casual Shirts'].includes(activeItem.category);

    const totalEstimatedCost = formState.lineItems.reduce((sum, item) => {
        if (item.quantityType === 'units' && item.qty && item.targetPrice) {
            const qty = parseFloat(item.qty);
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
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                    
                    {/* Header Section: Title and Back Button */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Garment Sourcing Requirements</h2>
                            <p className="text-gray-500 dark:text-gray-200">Fill out your order details to find matching factories.</p>
                        </div>
                        {/* Button to navigate back to the main sourcing page */}
                        <button onClick={() => handleSetCurrentPage('sourcing')} className="text-sm text-[#c20c0b] font-semibold flex items-center hover:underline whitespace-nowrap">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Sourcing
                        </button>
                    </div>

                    <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl mb-8">
                        <button type="button" onClick={() => handleOrderTypeChange('new')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${orderType === 'new' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            <Plus size={16} />
                            Create New RFQ
                        </button>
                        <button type="button" onClick={() => handleOrderTypeChange('existing')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${orderType === 'existing' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            <Package className="h-5 w-5" />
                            Add to Existing RFQ
                        </button>
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
                        <form onSubmit={onFormSubmit} className="space-y-8 animate-fade-in">
                        
                        {/* Line Item Tabs */}
                        <div className="relative mb-6 group">
                            <div 
                                ref={tabsContainerRef}
                                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
                            >
                            {formState.lineItems.map((item, index) => (
                                <div key={item.id} className="flex items-center snap-start flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setActiveItemIndex(index)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                            activeItemIndex === index
                                                ? 'bg-[#c20c0b] text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
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
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 border-dashed flex items-center gap-2 transition-colors whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Product
                            </button>
                            </div>
                            {/* Scroll Hint Gradient */}
                            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none md:hidden"></div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 md:hidden pointer-events-none text-gray-400 opacity-50">
                                <ChevronRight size={16} />
                            </div>
                        </div>

                        {/* Section 1: Basic Details */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Basic Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Category Dropdown */}
                                <FormField label="Product Category" icon={<Shirt className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].category`]}>
                                    <select id={`lineItems[${activeItemIndex}].category`} name="category" value={activeItem.category} onChange={handleFormChange} className={`${getInputClass(errors[`lineItems[${activeItemIndex}].category`])} appearance-none`}>
                                        <option>T-shirt</option> <option>Polo Shirt</option> <option>Hoodies</option> <option>Jeans</option> <option>Jackets</option> <option>Shirts</option> <option>Casual Shirts</option> <option>Trousers</option>
                                    </select>
                                </FormField>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Quantity Type <span className="text-red-500">*</span></label>
                                    <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2">
                                        <button type="button" onClick={() => setQuantityType('units')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${activeItem.quantityType === 'units' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            By Units
                                        </button>
                                        <button type="button" onClick={() => setQuantityType('container')} className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${activeItem.quantityType === 'container' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-200'}`}>
                                            By Container
                                        </button>
                                    </div>
                                    {activeItem.quantityType === 'units' ? (
                                        <FormField label="Order Quantity (Units)" icon={<Package className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].qty`]}>
                                            <input id={`lineItems[${activeItemIndex}].qty`} type="number" min="0" name="qty" value={activeItem.qty} onChange={handleFormChange} placeholder="e.g., 5000" className={getInputClass(errors[`lineItems[${activeItemIndex}].qty`])} />
                                        </FormField>
                                    ) : (
                                        <FormField label="Container Load" icon={<Package className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].qty`]}>
                                            <select id={`lineItems[${activeItemIndex}].qty`} name="qty" value={activeItem.qty} onChange={handleFormChange} className={`${getInputClass(errors[`lineItems[${activeItemIndex}].qty`])} appearance-none`}>
                                                <option value="">Select Container Type</option>
                                                {containerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </FormField>
                                    )}
                                </div>
                                {/* Fabric Weight Input */}
                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].weightGSM`]}>
                                    <input id={`lineItems[${activeItemIndex}].weightGSM`} type="number" min="0" name="weightGSM" value={activeItem.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className={getInputClass(errors[`lineItems[${activeItemIndex}].weightGSM`])} />
                                </FormField>
                                {/* Fabric Quality Input */}
                                <FormField label="Fabric Quality/Composition" icon={<Award className="h-5 w-5 text-gray-400" />} required error={errors[`lineItems[${activeItemIndex}].fabricQuality`]}>
                                    <input id={`lineItems[${activeItemIndex}].fabricQuality`} type="text" name="fabricQuality" value={activeItem.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className={getInputClass(errors[`lineItems[${activeItemIndex}].fabricQuality`])} />
                                </FormField>
                            </div>
                        </fieldset>

                        {/* Section 2: Specifications */}
                        <fieldset className="border-t pt-6">
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

                                {/* 6. Sample Photo Upload */}
                                <div>
                                    <FileDropZone
                                        label="Sample Photo Upload"
                                        accept="image/*"
                                        multiple
                                        onFilesSelected={onSampleFilesSelected}
                                        icon={<ImageIcon className="h-8 w-8" />}
                                        selectedFiles={sampleFiles}
                                        previews={samplePreviews}
                                    />
                                </div>

                                {/* 7. Document Upload */}
                                <div>
                                    <FileDropZone
                                        label="Document Upload (Tech Pack, Size Chart)"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        multiple
                                        onFilesSelected={onDocFilesSelected}
                                        icon={<FileText className="h-8 w-8" />}
                                        selectedFiles={docFiles}
                                    />
                                </div>

                                {/* 8. Special Instructions */}
                                <div className="md:col-span-2">
                                    <FormField label="Special Instructions" icon={<AlertCircle className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].specialInstructions`]}>
                                        <textarea id={`lineItems[${activeItemIndex}].specialInstructions`} name="specialInstructions" value={activeItem.specialInstructions} onChange={handleFormChange} rows={3} placeholder="Any other specific requirements..." className={getInputClass(errors[`lineItems[${activeItemIndex}].specialInstructions`])}></textarea>
                                    </FormField>
                                </div>

                                {/* 9. Target Price */}
                                <FormField label="Target Price per Unit (USD)" icon={<DollarSign className="h-5 w-5 text-gray-400" />} error={errors[`lineItems[${activeItemIndex}].targetPrice`]}>
                                    <input id={`lineItems[${activeItemIndex}].targetPrice`} type="number" min="0" step="0.01" name="targetPrice" value={activeItem.targetPrice} onChange={handleFormChange} placeholder="e.g., 4.50" className={getInputClass(errors[`lineItems[${activeItemIndex}].targetPrice`])} />
                                </FormField>
                            </div>
                        </fieldset>

                        {/* Section 3: Logistics & Commercials */}
                        <fieldset className="border-t pt-6">
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
                        </fieldset>
                        
                        {/* Submit Button */}
                        <div className="pt-6 border-t flex flex-col md:flex-row justify-end gap-4"> 
                            <button type="button" onClick={handleResetForm} className="w-full md:w-auto px-6 py-3 text-gray-700 dark:text-white font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                                Reset Form
                            </button>
                            <button type="submit" className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-semibold bg-[#c20c0b] hover:bg-[#a50a09] transition shadow-md">
                                {orderType === 'new' ? 'Submit Quote Request' : 'Add Products to RFQ'}
                            </button> 
                        </div>
                    </form>
                    )}
                </div>

                {/* Summary Modal */}
                {isSummaryModalOpen && (
                    createPortal(<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col border border-gray-200 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{orderType === 'existing' ? 'Review Addition to RFQ' : 'Review Your Order'}</h2>
                                <button onClick={() => setIsSummaryModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                            </div>
                            
                            <div className="p-6 space-y-8 flex-grow overflow-y-auto">
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
                                                    const qty = parseFloat(item.qty);
                                                    const price = parseFloat(item.targetPrice);
                                                    if (isNaN(qty) || isNaN(price)) return null;
                                                    const itemTotal = qty * price;
                                                    return (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-gray-600 dark:text-gray-300">
                                                                {idx + 1}. {item.category} ({qty.toLocaleString()} x ${price.toFixed(2)})
                                                            </span>
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                ${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-gray-600 dark:text-gray-300">
                                                                {idx + 1}. {item.category} ({item.qty} @ ${item.targetPrice}/unit)
                                                            </span>
                                                            <span className="font-medium text-gray-500 dark:text-gray-400 italic">
                                                                N/A (Container)
                                                            </span>
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
                                                    <span className="bg-red-100 text-[#a50a09] text-xs font-bold px-2 py-1 rounded-full">
                                                        {item.qty} {item.quantityType === 'container' ? '' : 'Units'}
                                                    </span>
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

                                {/* Files Section */}
                                {(sampleFiles.length > 0 || docFiles.length > 0) && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center"><FileText size={20} className="mr-2 text-blue-600 dark:text-blue-400"/> Attachments</h3>
                                        <ul className="space-y-2">
                                            {[...sampleFiles, ...docFiles].map((f, i) => (
                                                <li key={i} className="flex items-center text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-blue-700">
                                                    <span className="bg-blue-100 text-blue-600 p-1 rounded mr-2 text-xs font-bold">{i < sampleFiles.length ? 'IMG' : 'DOC'}</span>
                                                    {f.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                                <button onClick={() => setIsSummaryModalOpen(false)} className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Edit Order
                                </button>
                                <button onClick={handleConfirmSubmit} className="px-8 py-3 bg-[#c20c0b] text-white font-bold rounded-xl hover:bg-[#a50a09] shadow-md transition-transform transform hover:scale-105">
                                    {orderType === 'existing' ? 'Confirm & Add to RFQ' : 'Confirm & Submit'}
                                </button>
                            </div>
                        </div>
                    </div>, document.body)
                )}

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
            </div>
        </MainLayout>
    );
};