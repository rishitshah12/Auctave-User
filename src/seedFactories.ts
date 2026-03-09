/**
 * Factory Seed Script
 * Inserts 10 diverse factories into Supabase with full details,
 * catalogs, product images (SVG data URIs), and factory images.
 *
 * Usage: import { seedAllFactories } from './seedFactories'; then call seedAllFactories()
 */
import { supabase } from './supabaseClient';

// ─── SVG Image Generator ───
// Generates professional gradient SVG images as data URIs

function makeSvg(
  width: number,
  height: number,
  gradFrom: string,
  gradTo: string,
  label: string,
  sublabel: string = '',
  patternType: 'dots' | 'lines' | 'grid' | 'circles' | 'waves' = 'dots',
  iconPath: string = '',
): string {
  const patterns: Record<string, string> = {
    dots: `<pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.12)"/></pattern>`,
    lines: `<pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="rgba(255,255,255,0.08)" stroke-width="2"/></pattern>`,
    grid: `<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/></pattern>`,
    circles: `<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/></pattern>`,
    waves: `<pattern id="p" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 Q10 0 20 10 T40 10" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/></pattern>`,
  };

  const escapedLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedSub = sublabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradFrom}"/>
      <stop offset="100%" style="stop-color:${gradTo}"/>
    </linearGradient>
    ${patterns[patternType]}
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#p)"/>
  ${iconPath ? `<g transform="translate(${width / 2 - 24}, ${height / 2 - 48})" fill="rgba(255,255,255,0.25)">${iconPath}</g>` : ''}
  <text x="${width / 2}" y="${height / 2 + (iconPath ? 16 : -4)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="${Math.max(14, Math.min(22, width / 20))}" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${escapedLabel}</text>
  ${escapedSub ? `<text x="${width / 2}" y="${height / 2 + (iconPath ? 36 : 18)}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="400" font-size="${Math.max(10, Math.min(14, width / 30))}" fill="rgba(255,255,255,0.75)">${escapedSub}</text>` : ''}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ─── Icon SVG paths (48x48 viewbox) ───
const ICONS = {
  factory: '<path d="M4 44V20l12 8V20l12 8V12h16v32z" stroke="white" stroke-width="2" fill="none"/>',
  tshirt: '<path d="M16 4L4 12v4h8v28h24V16h8v-4L32 4z" stroke="white" stroke-width="2" fill="none"/>',
  pants: '<path d="M12 4h24v12l-6 28h-6l-6-28-6 28h-6z" stroke="white" stroke-width="2" fill="none"/>',
  jacket: '<path d="M14 4L4 10v8h6v26h28V18h6v-8L34 4l-4 8H18z" stroke="white" stroke-width="2" fill="none"/>',
  dress: '<path d="M18 4h12l4 16-10 4-10-4z M14 24l-2 20h24l-2-20z" stroke="white" stroke-width="2" fill="none"/>',
  swim: '<path d="M8 28c4-4 8 0 12-4s8 0 12-4 8 0 12-4 M8 36c4-4 8 0 12-4s8 0 12-4 8 0 12-4" stroke="white" stroke-width="2.5" fill="none"/>',
  hoodie: '<path d="M14 4c0 6 4 10 10 10s10-4 10-10 M16 14L6 22v6h8v16h20V28h8v-6L32 14z" stroke="white" stroke-width="2" fill="none"/>',
  baby: '<path d="M16 8a8 8 0 1016 0 M10 20h28a4 4 0 014 4v12a4 4 0 01-4 4H10a4 4 0 01-4-4V24a4 4 0 014-4z" stroke="white" stroke-width="2" fill="none"/>',
  hardhat: '<path d="M8 28h32 M12 28V18a12 12 0 1124 0v10 M6 28v4a4 4 0 004 4h28a4 4 0 004-4v-4z" stroke="white" stroke-width="2" fill="none"/>',
  sweater: '<path d="M14 4L4 14v6h8v24h24V20h8v-6L34 4z M18 4v12h12V4" stroke="white" stroke-width="2" fill="none"/>',
  sport: '<circle cx="24" cy="24" r="18" stroke="white" stroke-width="2" fill="none"/><path d="M24 6v36 M6 24h36 M10 10c4 4 10 4 14 0s10-4 14 0 M10 38c4-4 10-4 14 0s10 4 14 0" stroke="white" stroke-width="1.5" fill="none"/>',
};

// ─── Factory cover images ───
function factoryImg(name: string, specialty: string, grad: [string, string], pattern: 'dots' | 'lines' | 'grid' | 'circles' | 'waves') {
  return makeSvg(800, 500, grad[0], grad[1], name, specialty, pattern, ICONS.factory);
}

function galleryImg(label: string, grad: [string, string], pattern: 'dots' | 'lines' | 'grid' | 'circles' | 'waves') {
  return makeSvg(800, 500, grad[0], grad[1], label, '', pattern);
}

// ─── Product images ───
function productImg(name: string, category: string, grad: [string, string], icon: string, variant: number = 0) {
  const patterns: Array<'dots' | 'lines' | 'grid' | 'circles' | 'waves'> = ['dots', 'lines', 'grid', 'circles', 'waves'];
  return makeSvg(600, 600, grad[0], grad[1], name, category, patterns[variant % 5], icon);
}

// ─── Color palettes per factory ───
const PALETTES = {
  dhaka:    { main: ['#1e3a5f', '#2980b9'] as [string, string], alt: ['#16a085', '#1abc9c'] as [string, string] },
  arvind:   { main: ['#1a1a2e', '#16213e'] as [string, string], alt: ['#0f3460', '#533483'] as [string, string] },
  istanbul: { main: ['#4a1942', '#8e44ad'] as [string, string], alt: ['#6c3483', '#a569bd'] as [string, string] },
  saigon:   { main: ['#0b8457', '#27ae60'] as [string, string], alt: ['#1e8449', '#58d68d'] as [string, string] },
  porto:    { main: ['#7d5a50', '#b08968'] as [string, string], alt: ['#8d6e63', '#a1887f'] as [string, string] },
  shenzhen: { main: ['#00838f', '#26c6da'] as [string, string], alt: ['#0097a7', '#4dd0e1'] as [string, string] },
  lahore:   { main: ['#e65100', '#ff9800'] as [string, string], alt: ['#bf360c', '#f57c00'] as [string, string] },
  colombo:  { main: ['#880e4f', '#e91e63'] as [string, string], alt: ['#ad1457', '#f06292'] as [string, string] },
  phnompenh:{ main: ['#37474f', '#607d8b'] as [string, string], alt: ['#455a64', '#78909c'] as [string, string] },
  addis:    { main: ['#f57f17', '#ffca28'] as [string, string], alt: ['#ff8f00', '#ffd54f'] as [string, string] },
};

// ─── 10 Factory Definitions ───
const FACTORIES = [
  // 1. Bangladesh — T-Shirts & Basics
  {
    name: 'Dhaka Stitch Works',
    location: 'Gazipur, Dhaka, Bangladesh',
    description:
      'One of Bangladesh\'s leading knitwear manufacturers with 15+ years of experience. Specializes in mass-production of basic t-shirts, polo shirts, and tank tops for global brands. LEED-certified green factory with solar-powered operations and zero-discharge water treatment.',
    rating: 4.7,
    turnaround: '4-6 weeks',
    minimum_order_quantity: 3000,
    offer: '8% off on first orders over 10,000 pcs',
    cover_image_url: factoryImg('Dhaka Stitch Works', 'Knitwear & Basics', PALETTES.dhaka.main, 'dots'),
    gallery: [
      galleryImg('Sewing Floor — 300 Machines', PALETTES.dhaka.main, 'lines'),
      galleryImg('Automated Cutting Room', PALETTES.dhaka.alt, 'grid'),
      galleryImg('Packing & Dispatch', PALETTES.dhaka.main, 'circles'),
      galleryImg('Quality Control Lab', PALETTES.dhaka.alt, 'waves'),
    ],
    tags: ['Knitwear', 'Basics', 'Bulk Orders', 'Eco-Friendly', 'LEED Certified'],
    certifications: ['GOTS', 'OEKO-TEX Standard 100', 'BSCI', 'WRAP', 'ISO 9001'],
    specialties: ['T-Shirts', 'Polo Shirts', 'Tank Tops', 'Henley Shirts'],
    trust_tier: 'gold',
    completed_orders_count: 342,
    on_time_delivery_rate: 96.5,
    quality_rejection_rate: 1.2,
    machine_slots: [
      { machineType: 'Single Needle Lockstitch', availableSlots: 40, totalSlots: 300, nextAvailable: '2026-03-20' },
      { machineType: 'Overlock 5-Thread', availableSlots: 15, totalSlots: 120, nextAvailable: '2026-03-15' },
      { machineType: 'Flatlock', availableSlots: 10, totalSlots: 60, nextAvailable: '2026-03-18' },
      { machineType: 'Heat Press', availableSlots: 5, totalSlots: 20, nextAvailable: '2026-03-22' },
    ],
    catalog: {
      products: [
        {
          id: 'dhaka-p1', name: 'Classic Crew Neck T-Shirt', description: 'Combed cotton crew neck with reinforced shoulder seams. Pre-shrunk and garment-washed for a soft hand feel.',
          category: 'T-Shirts', subcategory: 'Crew Neck',
          images: [
            productImg('Classic Crew Neck', 'T-Shirts', PALETTES.dhaka.main, ICONS.tshirt, 0),
            productImg('Crew Neck — Back', 'T-Shirts', PALETTES.dhaka.alt, ICONS.tshirt, 1),
          ],
          fabricComposition: '100% Combed Cotton', availableColors: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Royal Blue', 'Olive', 'Maroon'],
          sizeRange: 'XS - 5XL', moq: 1000, priceRange: '$2.80 - $3.50', leadTime: '4 weeks', tags: ['Bestseller', 'Eco-Friendly'], featured: true,
        },
        {
          id: 'dhaka-p2', name: 'Premium Polo Shirt', description: 'Pique knit polo with mother-of-pearl buttons. Double-stitched placket with contrast tipping option.',
          category: 'Polo Shirts', subcategory: 'Pique Knit',
          images: [
            productImg('Premium Polo', 'Polo Shirts', ['#1a5276', '#2e86c1'], ICONS.tshirt, 2),
            productImg('Polo — Detail', 'Polo Shirts', ['#1b4f72', '#5dade2'], ICONS.tshirt, 3),
          ],
          fabricComposition: '60% Cotton / 40% Polyester Pique', availableColors: ['White', 'Navy', 'Black', 'Burgundy', 'Forest Green'],
          sizeRange: 'S - 3XL', moq: 500, priceRange: '$4.20 - $5.80', leadTime: '5 weeks', tags: ['Premium', 'New'], featured: true,
        },
        {
          id: 'dhaka-p3', name: 'V-Neck Fitted Tee', description: 'Slim-fit v-neck with side-seam construction. Ring-spun cotton for durability.',
          category: 'T-Shirts', subcategory: 'V-Neck',
          images: [productImg('V-Neck Fitted Tee', 'T-Shirts', PALETTES.dhaka.alt, ICONS.tshirt, 4)],
          fabricComposition: '100% Ring-Spun Cotton 160 GSM', availableColors: ['White', 'Black', 'Charcoal', 'Heather Gray'],
          sizeRange: 'XS - 2XL', moq: 800, priceRange: '$2.50 - $3.20', leadTime: '4 weeks', tags: ['Budget'],
        },
        {
          id: 'dhaka-p4', name: 'Long Sleeve Henley', description: 'Three-button henley with ribbed cuffs. Tubular body construction.',
          category: 'T-Shirts', subcategory: 'Henley',
          images: [productImg('Long Sleeve Henley', 'T-Shirts', ['#1e3a5f', '#1abc9c'], ICONS.tshirt, 1)],
          fabricComposition: '95% Cotton / 5% Spandex', availableColors: ['Charcoal', 'Navy', 'Olive', 'Wine'],
          sizeRange: 'S - 2XL', moq: 600, priceRange: '$3.60 - $4.40', leadTime: '5 weeks', tags: [],
        },
      ],
      fabricOptions: [
        { name: 'Combed Cotton Jersey', composition: '100% Combed Cotton', weightGSM: '160', useCases: 'T-Shirts, Vests', pricePerMeter: '$2.40' },
        { name: 'CVC Pique', composition: '60/40 Cotton-Polyester', weightGSM: '220', useCases: 'Polo Shirts', pricePerMeter: '$3.10' },
        { name: 'Organic Cotton Slub', composition: '100% Organic Cotton', weightGSM: '150', useCases: 'Premium Basics', pricePerMeter: '$3.60' },
      ],
    },
  },

  // 2. India — Denim & Trousers
  {
    name: 'Arvind Denim Craft',
    location: 'Ahmedabad, Gujarat, India',
    description:
      'Premier denim manufacturer with in-house weaving, dyeing, and finishing. Known for sustainable indigo techniques and innovative stretch denim. Supplies to 20+ international brands with a fully vertical operation from fiber to finished garment.',
    rating: 4.8,
    turnaround: '6-8 weeks',
    minimum_order_quantity: 1000,
    offer: null,
    cover_image_url: factoryImg('Arvind Denim Craft', 'Denim & Trousers', PALETTES.arvind.main, 'lines'),
    gallery: [
      galleryImg('Fabric Weaving Mill', PALETTES.arvind.main, 'dots'),
      galleryImg('Indigo Dyeing Line', PALETTES.arvind.alt, 'waves'),
      galleryImg('Laser Finishing Room', PALETTES.arvind.main, 'grid'),
      galleryImg('Distribution Center', PALETTES.arvind.alt, 'circles'),
    ],
    tags: ['Denim', 'Sustainable', 'Vertical Mill', 'Premium', 'R&D'],
    certifications: ['ISO 14001', 'SA8000', 'GOTS', 'BCI (Better Cotton)', 'ZDHC'],
    specialties: ['Jeans', 'Denim Jackets', 'Chinos', 'Cargo Pants', 'Denim Shorts'],
    trust_tier: 'gold',
    completed_orders_count: 215,
    on_time_delivery_rate: 94.2,
    quality_rejection_rate: 0.8,
    machine_slots: [
      { machineType: 'Denim Loom (Sulzer)', availableSlots: 8, totalSlots: 50, nextAvailable: '2026-04-01' },
      { machineType: 'Laser Finishing', availableSlots: 3, totalSlots: 10, nextAvailable: '2026-03-25' },
      { machineType: 'Single Needle Lockstitch', availableSlots: 25, totalSlots: 200, nextAvailable: '2026-03-18' },
      { machineType: 'Bartack Machine', availableSlots: 6, totalSlots: 30, nextAvailable: '2026-03-20' },
    ],
    catalog: {
      products: [
        {
          id: 'arvind-p1', name: 'Classic Straight Fit Jeans', description: 'Five-pocket straight leg jeans with authentic selvedge denim. Rope-dyed indigo with vintage wash options.',
          category: 'Jeans', subcategory: 'Straight Fit',
          images: [
            productImg('Straight Fit Jeans', 'Jeans', PALETTES.arvind.main, ICONS.pants, 0),
            productImg('Straight Fit — Detail', 'Jeans', PALETTES.arvind.alt, ICONS.pants, 1),
          ],
          fabricComposition: '98% Cotton / 2% Elastane Denim 12oz', availableColors: ['Indigo', 'Black', 'Stone Wash', 'Raw Denim'],
          sizeRange: '28 - 42', moq: 500, priceRange: '$8.50 - $12.00', leadTime: '6 weeks', tags: ['Bestseller'], featured: true,
        },
        {
          id: 'arvind-p2', name: 'Slim Tapered Chinos', description: 'Modern slim-tapered chinos with stretch comfort. Garment-dyed with soft peach finish.',
          category: 'Trousers', subcategory: 'Chinos',
          images: [
            productImg('Slim Tapered Chinos', 'Trousers', ['#0f3460', '#e94560'], ICONS.pants, 2),
            productImg('Chinos — Colors', 'Trousers', ['#533483', '#e94560'], ICONS.pants, 3),
          ],
          fabricComposition: '97% Cotton / 3% Spandex Twill', availableColors: ['Khaki', 'Navy', 'Olive', 'Tan', 'Charcoal', 'Burgundy'],
          sizeRange: '28 - 40', moq: 500, priceRange: '$6.00 - $8.50', leadTime: '5 weeks', tags: ['New'], featured: true,
        },
        {
          id: 'arvind-p3', name: 'Cargo Work Pants', description: 'Heavy-duty cargo pants with reinforced knees and multiple utility pockets. Enzyme-washed for softness.',
          category: 'Trousers', subcategory: 'Cargo',
          images: [productImg('Cargo Work Pants', 'Trousers', PALETTES.arvind.alt, ICONS.pants, 4)],
          fabricComposition: '100% Cotton Ripstop 280 GSM', availableColors: ['Olive', 'Khaki', 'Black', 'Brown'],
          sizeRange: '30 - 44', moq: 300, priceRange: '$7.50 - $10.00', leadTime: '6 weeks', tags: [],
        },
      ],
      fabricOptions: [
        { name: 'Stretch Denim', composition: '98% Cotton / 2% Elastane', weightGSM: '340 (12oz)', useCases: 'Jeans, Jackets', pricePerMeter: '$5.20' },
        { name: 'Raw Selvedge Denim', composition: '100% Cotton', weightGSM: '390 (14oz)', useCases: 'Premium Jeans', pricePerMeter: '$7.80' },
        { name: 'Cotton Twill', composition: '100% Cotton', weightGSM: '240', useCases: 'Chinos, Pants', pricePerMeter: '$3.50' },
        { name: 'Ripstop Canvas', composition: '100% Cotton', weightGSM: '280', useCases: 'Workwear, Cargo', pricePerMeter: '$4.20' },
      ],
    },
  },

  // 3. Turkey — Outerwear & Jackets
  {
    name: 'Istanbul Outerwear Co.',
    location: 'Istanbul, Marmara, Turkey',
    description:
      'Specialized outerwear and jacket manufacturer with expertise in waterproof, insulated, and technical garments. In-house design team with CAD pattern-making and 3D prototyping. Quick sample turnaround within 7 days.',
    rating: 4.6,
    turnaround: '5-7 weeks',
    minimum_order_quantity: 500,
    offer: 'Free sampling on orders above 2,000 pcs',
    cover_image_url: factoryImg('Istanbul Outerwear Co.', 'Outerwear & Jackets', PALETTES.istanbul.main, 'circles'),
    gallery: [
      galleryImg('Pattern & CAD Room', PALETTES.istanbul.main, 'grid'),
      galleryImg('Seam Sealing Line', PALETTES.istanbul.alt, 'lines'),
      galleryImg('Finished Goods Storage', PALETTES.istanbul.main, 'dots'),
    ],
    tags: ['Outerwear', 'Technical', 'Quick Sampling', 'Design Services', 'European Quality'],
    certifications: ['ISO 9001', 'OEKO-TEX Standard 100', 'Sedex', 'Higg Index'],
    specialties: ['Jackets', 'Puffer Coats', 'Windbreakers', 'Softshell Jackets', 'Parkas'],
    trust_tier: 'silver',
    completed_orders_count: 128,
    on_time_delivery_rate: 92.0,
    quality_rejection_rate: 1.5,
    machine_slots: [
      { machineType: 'Heavy Duty Lockstitch', availableSlots: 12, totalSlots: 80, nextAvailable: '2026-03-22' },
      { machineType: 'Seam Sealing Machine', availableSlots: 4, totalSlots: 15, nextAvailable: '2026-04-01' },
      { machineType: 'Down Filling Machine', availableSlots: 2, totalSlots: 6, nextAvailable: '2026-03-28' },
      { machineType: 'Ultrasonic Welding', availableSlots: 3, totalSlots: 8, nextAvailable: '2026-03-25' },
    ],
    catalog: {
      products: [
        {
          id: 'istanbul-p1', name: 'Insulated Puffer Jacket', description: 'Lightweight puffer with synthetic down fill. Water-resistant shell with YKK zippers and adjustable hood.',
          category: 'Jackets', subcategory: 'Puffer',
          images: [
            productImg('Insulated Puffer', 'Jackets', PALETTES.istanbul.main, ICONS.jacket, 0),
            productImg('Puffer — Detail', 'Jackets', PALETTES.istanbul.alt, ICONS.jacket, 1),
          ],
          fabricComposition: '100% Nylon Shell / Synthetic Down Fill', availableColors: ['Black', 'Navy', 'Olive', 'Red', 'Cream'],
          sizeRange: 'XS - 3XL', moq: 300, priceRange: '$18.00 - $28.00', leadTime: '6 weeks', tags: ['Bestseller', 'Premium'], featured: true,
        },
        {
          id: 'istanbul-p2', name: 'Softshell Performance Jacket', description: 'Three-layer bonded softshell with fleece lining. Wind-resistant and breathable for active outdoor use.',
          category: 'Jackets', subcategory: 'Softshell',
          images: [productImg('Softshell Jacket', 'Jackets', ['#6c3483', '#2980b9'], ICONS.jacket, 2)],
          fabricComposition: '94% Polyester / 6% Elastane Softshell', availableColors: ['Black', 'Charcoal', 'Navy', 'Teal'],
          sizeRange: 'S - 3XL', moq: 200, priceRange: '$14.00 - $20.00', leadTime: '5 weeks', tags: ['New'],
        },
        {
          id: 'istanbul-p3', name: 'Classic Bomber Jacket', description: 'Ribbed collar and cuffs bomber with satin lining. Available in nylon or cotton shell options.',
          category: 'Jackets', subcategory: 'Bomber',
          images: [
            productImg('Classic Bomber', 'Jackets', PALETTES.istanbul.alt, ICONS.jacket, 3),
            productImg('Bomber — Lining', 'Jackets', PALETTES.istanbul.main, ICONS.jacket, 4),
          ],
          fabricComposition: '100% Nylon Outer / Polyester Satin Lining', availableColors: ['Black', 'Olive', 'Navy', 'Burgundy', 'Orange'],
          sizeRange: 'S - 2XL', moq: 300, priceRange: '$12.00 - $16.00', leadTime: '5 weeks', tags: [], featured: true,
        },
      ],
      fabricOptions: [
        { name: 'Nylon Ripstop (DWR)', composition: '100% Nylon with DWR coating', weightGSM: '70', useCases: 'Puffer Jackets, Windbreakers', pricePerMeter: '$4.50' },
        { name: '3-Layer Softshell', composition: '94% Polyester / 6% Elastane', weightGSM: '310', useCases: 'Performance Jackets', pricePerMeter: '$7.20' },
        { name: 'Cotton Twill Shell', composition: '100% Cotton', weightGSM: '200', useCases: 'Casual Jackets, Bombers', pricePerMeter: '$3.80' },
      ],
    },
  },

  // 4. Vietnam — Activewear & Sportswear
  {
    name: 'Saigon Active Apparel',
    location: 'Ho Chi Minh City, Vietnam',
    description:
      'High-performance activewear manufacturer with sublimation printing and bonding technology. Specializes in moisture-wicking, four-way stretch, and anti-odor sportswear. Supplies gym, yoga, and running apparel for international fitness brands.',
    rating: 4.5,
    turnaround: '3-5 weeks',
    minimum_order_quantity: 500,
    offer: '5% discount on repeat orders',
    cover_image_url: factoryImg('Saigon Active Apparel', 'Activewear & Sportswear', PALETTES.saigon.main, 'waves'),
    gallery: [
      galleryImg('Flatlock Sewing Line', PALETTES.saigon.main, 'dots'),
      galleryImg('Sublimation Printing', PALETTES.saigon.alt, 'lines'),
      galleryImg('Fabric Testing Lab', PALETTES.saigon.main, 'grid'),
    ],
    tags: ['Activewear', 'Sportswear', 'Sublimation', 'Performance Fabrics', 'Quick Turn'],
    certifications: ['OEKO-TEX Standard 100', 'WRAP', 'ISO 9001', 'GRS (Global Recycled Standard)'],
    specialties: ['Leggings', 'Sports Bras', 'Running Shorts', 'Gym Tanks', 'Compression Wear'],
    trust_tier: 'silver',
    completed_orders_count: 189,
    on_time_delivery_rate: 95.1,
    quality_rejection_rate: 1.0,
    machine_slots: [
      { machineType: 'Flatlock 4-Needle', availableSlots: 18, totalSlots: 80, nextAvailable: '2026-03-14' },
      { machineType: 'Sublimation Printer', availableSlots: 4, totalSlots: 12, nextAvailable: '2026-03-16' },
      { machineType: 'Ultrasonic Cutter', availableSlots: 3, totalSlots: 8, nextAvailable: '2026-03-18' },
      { machineType: 'Coverlock', availableSlots: 10, totalSlots: 50, nextAvailable: '2026-03-15' },
    ],
    catalog: {
      products: [
        {
          id: 'saigon-p1', name: 'High-Waist Performance Leggings', description: 'Four-way stretch leggings with hidden waistband pocket. Moisture-wicking and squat-proof fabric.',
          category: 'Activewear', subcategory: 'Leggings',
          images: [
            productImg('Performance Leggings', 'Activewear', PALETTES.saigon.main, ICONS.sport, 0),
            productImg('Leggings — Detail', 'Activewear', PALETTES.saigon.alt, ICONS.sport, 1),
          ],
          fabricComposition: '75% Nylon / 25% Spandex', availableColors: ['Black', 'Navy', 'Charcoal', 'Wine', 'Teal', 'Sage'],
          sizeRange: 'XS - 2XL', moq: 300, priceRange: '$5.50 - $8.00', leadTime: '4 weeks', tags: ['Bestseller', 'Eco-Friendly'], featured: true,
        },
        {
          id: 'saigon-p2', name: 'Quick-Dry Running Shorts', description: 'Lightweight running shorts with built-in liner. Reflective trim and zip pocket for keys.',
          category: 'Activewear', subcategory: 'Shorts',
          images: [productImg('Running Shorts', 'Activewear', ['#1e8449', '#2ecc71'], ICONS.sport, 2)],
          fabricComposition: '100% Recycled Polyester', availableColors: ['Black', 'Navy', 'Gray', 'Blue', 'Neon Green'],
          sizeRange: 'S - 2XL', moq: 500, priceRange: '$4.00 - $5.50', leadTime: '3 weeks', tags: ['Eco-Friendly'],
        },
        {
          id: 'saigon-p3', name: 'Seamless Sports Bra', description: 'Knitted seamless construction for zero-chafe comfort. Medium support with removable pads.',
          category: 'Activewear', subcategory: 'Sports Bras',
          images: [
            productImg('Seamless Sports Bra', 'Activewear', PALETTES.saigon.alt, ICONS.sport, 3),
            productImg('Sports Bra — Colors', 'Activewear', PALETTES.saigon.main, ICONS.sport, 4),
          ],
          fabricComposition: '80% Nylon / 20% Spandex', availableColors: ['Black', 'White', 'Blush', 'Lavender', 'Coral'],
          sizeRange: 'XS - XL', moq: 500, priceRange: '$3.50 - $5.00', leadTime: '4 weeks', tags: ['New'], featured: true,
        },
      ],
      fabricOptions: [
        { name: 'Power Stretch', composition: '75% Nylon / 25% Spandex', weightGSM: '230', useCases: 'Leggings, Shorts', pricePerMeter: '$5.80' },
        { name: 'Recycled Poly Mesh', composition: '100% Recycled Polyester', weightGSM: '120', useCases: 'Running Gear, Panels', pricePerMeter: '$3.40' },
        { name: 'Seamless Knit', composition: '80% Nylon / 20% Spandex', weightGSM: '200', useCases: 'Sports Bras, Bodysuits', pricePerMeter: '$6.50' },
      ],
    },
  },

  // 5. Portugal — Premium Knitwear & Sweaters
  {
    name: 'Porto Knit Studio',
    location: 'Porto, Norte, Portugal',
    description:
      'European luxury knitwear manufacturer with Italian Stoll and Shima Seiki flat-knitting machines. Expert in premium sweaters, cardigans, and knitted accessories. Small-batch capable with made-in-Europe provenance.',
    rating: 4.9,
    turnaround: '6-8 weeks',
    minimum_order_quantity: 200,
    offer: null,
    cover_image_url: factoryImg('Porto Knit Studio', 'Premium Knitwear', PALETTES.porto.main, 'grid'),
    gallery: [
      galleryImg('Shima Seiki Knitting Hall', PALETTES.porto.main, 'lines'),
      galleryImg('Hand-Finishing Room', PALETTES.porto.alt, 'dots'),
      galleryImg('Yarn & Color Library', PALETTES.porto.main, 'waves'),
    ],
    tags: ['Knitwear', 'Premium', 'Made in Europe', 'Small Batch', 'Luxury'],
    certifications: ['GOTS', 'OEKO-TEX Standard 100', 'SA8000', 'RWS (Responsible Wool)'],
    specialties: ['Sweaters', 'Cardigans', 'Knitted Vests', 'Scarves', 'Beanies'],
    trust_tier: 'gold',
    completed_orders_count: 87,
    on_time_delivery_rate: 97.8,
    quality_rejection_rate: 0.3,
    machine_slots: [
      { machineType: 'Shima Seiki Whole Garment', availableSlots: 4, totalSlots: 12, nextAvailable: '2026-04-05' },
      { machineType: 'Stoll Flat Knitting', availableSlots: 6, totalSlots: 20, nextAvailable: '2026-03-28' },
      { machineType: 'Linking Machine', availableSlots: 3, totalSlots: 10, nextAvailable: '2026-04-01' },
    ],
    catalog: {
      products: [
        {
          id: 'porto-p1', name: 'Merino Wool Crewneck Sweater', description: 'Extra-fine 19.5 micron merino wool sweater. Whole-garment knitted for zero seams.',
          category: 'Sweaters', subcategory: 'Crewneck',
          images: [
            productImg('Merino Crewneck', 'Sweaters', PALETTES.porto.main, ICONS.sweater, 0),
            productImg('Crewneck — Texture', 'Sweaters', PALETTES.porto.alt, ICONS.sweater, 1),
          ],
          fabricComposition: '100% Extra-Fine Merino Wool', availableColors: ['Cream', 'Navy', 'Charcoal', 'Camel', 'Burgundy', 'Forest Green'],
          sizeRange: 'XS - 2XL', moq: 100, priceRange: '$22.00 - $30.00', leadTime: '7 weeks', tags: ['Premium', 'Eco-Friendly'], featured: true,
        },
        {
          id: 'porto-p2', name: 'Cashmere Blend V-Neck', description: 'Luxurious cashmere-cotton blend with ribbed hem and cuffs. Hand-finished details.',
          category: 'Sweaters', subcategory: 'V-Neck',
          images: [productImg('Cashmere V-Neck', 'Sweaters', ['#8d6e63', '#5d4037'], ICONS.sweater, 2)],
          fabricComposition: '70% Cotton / 30% Cashmere', availableColors: ['Cream', 'Gray', 'Navy', 'Blush'],
          sizeRange: 'XS - XL', moq: 100, priceRange: '$28.00 - $38.00', leadTime: '8 weeks', tags: ['Premium'], featured: true,
        },
        {
          id: 'porto-p3', name: 'Chunky Cable-Knit Cardigan', description: 'Heavy gauge cable knit with horn buttons. Relaxed fit with shawl collar.',
          category: 'Sweaters', subcategory: 'Cardigan',
          images: [productImg('Cable-Knit Cardigan', 'Sweaters', PALETTES.porto.alt, ICONS.sweater, 3)],
          fabricComposition: '80% Lambswool / 20% Nylon', availableColors: ['Cream', 'Charcoal', 'Olive', 'Brown'],
          sizeRange: 'S - 2XL', moq: 100, priceRange: '$25.00 - $35.00', leadTime: '7 weeks', tags: [],
        },
      ],
      fabricOptions: [
        { name: 'Extra-Fine Merino', composition: '100% Merino Wool (19.5\u03bc)', weightGSM: '180', useCases: 'Premium Sweaters', pricePerMeter: '$14.00' },
        { name: 'Cashmere Blend', composition: '70% Cotton / 30% Cashmere', weightGSM: '160', useCases: 'Luxury Knitwear', pricePerMeter: '$18.50' },
        { name: 'Lambswool Cable', composition: '80% Lambswool / 20% Nylon', weightGSM: '320', useCases: 'Chunky Knitwear', pricePerMeter: '$10.00' },
      ],
    },
  },

  // 6. China — Swimwear & Intimates
  {
    name: 'Shenzhen Swim & Intimates',
    location: 'Shenzhen, Guangdong, China',
    description:
      'Specialized swimwear and intimate apparel manufacturer with digital printing, bonding, and laser-cut expertise. Advanced CAD-CAM cutting and stringent chlorine-resistance testing. Exports to 30+ countries.',
    rating: 4.4,
    turnaround: '3-5 weeks',
    minimum_order_quantity: 500,
    offer: '10% off for orders over 5,000 pcs',
    cover_image_url: factoryImg('Shenzhen Swim & Intimates', 'Swimwear & Intimates', PALETTES.shenzhen.main, 'waves'),
    gallery: [
      galleryImg('Digital Printing Line', PALETTES.shenzhen.main, 'circles'),
      galleryImg('Laser Cutting Station', PALETTES.shenzhen.alt, 'grid'),
      galleryImg('Quality Testing Lab', PALETTES.shenzhen.main, 'dots'),
      galleryImg('Finished Goods Warehouse', PALETTES.shenzhen.alt, 'lines'),
    ],
    tags: ['Swimwear', 'Intimates', 'Digital Print', 'Laser Cut', 'Fast Production'],
    certifications: ['OEKO-TEX Standard 100', 'ISO 9001', 'BSCI', 'GRS'],
    specialties: ['Bikinis', 'One-Piece Swimsuits', 'Underwear', 'Bras', 'Shapewear'],
    trust_tier: 'silver',
    completed_orders_count: 256,
    on_time_delivery_rate: 93.5,
    quality_rejection_rate: 1.8,
    machine_slots: [
      { machineType: 'Zigzag Stretch Machine', availableSlots: 15, totalSlots: 60, nextAvailable: '2026-03-14' },
      { machineType: 'Digital Fabric Printer', availableSlots: 3, totalSlots: 8, nextAvailable: '2026-03-16' },
      { machineType: 'Laser Cutter', availableSlots: 2, totalSlots: 6, nextAvailable: '2026-03-18' },
      { machineType: 'Moulding Press (Bra)', availableSlots: 4, totalSlots: 12, nextAvailable: '2026-03-20' },
    ],
    catalog: {
      products: [
        {
          id: 'shenzhen-p1', name: 'Classic Triangle Bikini Set', description: 'Adjustable triangle top with removable pads. High-cut bottom with full lining. Chlorine-resistant fabric.',
          category: 'Swimwear', subcategory: 'Bikini',
          images: [
            productImg('Triangle Bikini Set', 'Swimwear', PALETTES.shenzhen.main, ICONS.swim, 0),
            productImg('Bikini — Prints', 'Swimwear', PALETTES.shenzhen.alt, ICONS.swim, 1),
          ],
          fabricComposition: '80% Nylon / 20% Elastane (UPF 50+)', availableColors: ['Black', 'White', 'Coral', 'Teal', 'Tropical Print', 'Leopard Print'],
          sizeRange: 'XS - XL', moq: 300, priceRange: '$6.00 - $9.00', leadTime: '4 weeks', tags: ['Bestseller'], featured: true,
        },
        {
          id: 'shenzhen-p2', name: 'Seamless Microfiber Underwear (3-Pack)', description: 'Laser-cut edges for invisible finish under clothing. Breathable microfiber with cotton gusset.',
          category: 'Underwear', subcategory: 'Briefs',
          images: [productImg('Microfiber Underwear', 'Underwear', ['#0097a7', '#80deea'], ICONS.swim, 2)],
          fabricComposition: '90% Nylon / 10% Spandex', availableColors: ['Black', 'Nude', 'White', 'Blush', 'Gray'],
          sizeRange: 'XS - 2XL', moq: 1000, priceRange: '$1.80 - $2.50/pc', leadTime: '3 weeks', tags: ['Budget'],
        },
        {
          id: 'shenzhen-p3', name: 'One-Piece Sculpt Swimsuit', description: 'Tummy-control panel with adjustable straps. Ruching detail for flattering fit.',
          category: 'Swimwear', subcategory: 'One-Piece',
          images: [
            productImg('Sculpt Swimsuit', 'Swimwear', PALETTES.shenzhen.alt, ICONS.swim, 3),
            productImg('Swimsuit — Back', 'Swimwear', PALETTES.shenzhen.main, ICONS.swim, 4),
          ],
          fabricComposition: '78% Nylon / 22% Elastane', availableColors: ['Black', 'Navy', 'Red', 'Emerald'],
          sizeRange: 'S - 3XL', moq: 200, priceRange: '$8.00 - $12.00', leadTime: '4 weeks', tags: ['New'], featured: true,
        },
      ],
      fabricOptions: [
        { name: 'Chlorine-Resistant Swim', composition: '80% Nylon / 20% Elastane UPF 50+', weightGSM: '210', useCases: 'Swimwear', pricePerMeter: '$6.00' },
        { name: 'Seamless Microfiber', composition: '90% Nylon / 10% Spandex', weightGSM: '130', useCases: 'Underwear, Intimates', pricePerMeter: '$4.20' },
        { name: 'Power Mesh', composition: '85% Nylon / 15% Elastane', weightGSM: '100', useCases: 'Shapewear, Lining', pricePerMeter: '$3.80' },
      ],
    },
  },

  // 7. Pakistan — Workwear & Uniforms
  {
    name: 'Lahore Industrial Garments',
    location: 'Lahore, Punjab, Pakistan',
    description:
      'Heavy-duty workwear and uniform manufacturer with expertise in flame-resistant, hi-visibility, and anti-static fabrics. Supplies corporate uniforms, industrial workwear, and PPE garments for construction, oil & gas, and healthcare sectors.',
    rating: 4.3,
    turnaround: '5-7 weeks',
    minimum_order_quantity: 1000,
    offer: 'Bulk discount: 12% off on 10,000+ pcs',
    cover_image_url: factoryImg('Lahore Industrial Garments', 'Workwear & Uniforms', PALETTES.lahore.main, 'lines'),
    gallery: [
      galleryImg('Heavy-Duty Sewing Line', PALETTES.lahore.main, 'grid'),
      galleryImg('Reflective Tape Application', PALETTES.lahore.alt, 'dots'),
      galleryImg('Packing & Shipping Bay', PALETTES.lahore.main, 'circles'),
    ],
    tags: ['Workwear', 'Uniforms', 'PPE', 'Bulk Orders', 'Industrial'],
    certifications: ['ISO 9001', 'ISO 14001', 'WRAP', 'ASTM F1506 (FR)', 'EN ISO 20471 (Hi-Vis)'],
    specialties: ['Coveralls', 'Hi-Vis Jackets', 'Cargo Work Pants', 'Corporate Uniforms', 'Lab Coats'],
    trust_tier: 'bronze',
    completed_orders_count: 167,
    on_time_delivery_rate: 89.5,
    quality_rejection_rate: 2.1,
    machine_slots: [
      { machineType: 'Heavy Duty Lockstitch', availableSlots: 20, totalSlots: 150, nextAvailable: '2026-03-16' },
      { machineType: 'Bar Tack Machine', availableSlots: 8, totalSlots: 30, nextAvailable: '2026-03-14' },
      { machineType: 'Reflective Tape Sealer', availableSlots: 4, totalSlots: 10, nextAvailable: '2026-03-20' },
      { machineType: 'Automatic Pocket Setter', availableSlots: 5, totalSlots: 20, nextAvailable: '2026-03-18' },
    ],
    catalog: {
      products: [
        {
          id: 'lahore-p1', name: 'Hi-Vis Safety Jacket', description: 'EN ISO 20471 Class 3 compliant hi-vis jacket. Waterproof outer with 3M Scotchlite reflective tape.',
          category: 'Workwear', subcategory: 'Hi-Vis',
          images: [
            productImg('Hi-Vis Safety Jacket', 'Workwear', PALETTES.lahore.main, ICONS.hardhat, 0),
            productImg('Safety Jacket — Back', 'Workwear', PALETTES.lahore.alt, ICONS.hardhat, 1),
          ],
          fabricComposition: '100% Polyester Oxford (PU coated)', availableColors: ['Yellow', 'Orange'],
          sizeRange: 'S - 4XL', moq: 500, priceRange: '$9.00 - $14.00', leadTime: '5 weeks', tags: ['Bestseller'], featured: true,
        },
        {
          id: 'lahore-p2', name: 'Flame-Resistant Coverall', description: 'ASTM F1506 certified FR coverall with concealed brass zipper. Double-stitched stress points.',
          category: 'Workwear', subcategory: 'Coveralls',
          images: [productImg('FR Coverall', 'Workwear', ['#bf360c', '#e65100'], ICONS.hardhat, 2)],
          fabricComposition: '88% Cotton / 12% Nylon FR Treated', availableColors: ['Navy', 'Royal Blue', 'Orange', 'Khaki'],
          sizeRange: 'S - 4XL', moq: 300, priceRange: '$12.00 - $18.00', leadTime: '6 weeks', tags: ['Premium'],
        },
        {
          id: 'lahore-p3', name: 'Corporate Polo Uniform', description: 'Professional polo shirt with company logo embroidery area. Wrinkle-resistant and easy-care fabric.',
          category: 'Workwear', subcategory: 'Corporate',
          images: [productImg('Corporate Polo', 'Workwear', PALETTES.lahore.alt, ICONS.tshirt, 3)],
          fabricComposition: '65% Polyester / 35% Cotton Pique', availableColors: ['White', 'Navy', 'Black', 'Gray', 'Royal Blue'],
          sizeRange: 'S - 3XL', moq: 500, priceRange: '$3.50 - $5.00', leadTime: '4 weeks', tags: ['Budget'],
        },
      ],
      fabricOptions: [
        { name: 'FR Twill', composition: '88% Cotton / 12% Nylon', weightGSM: '260', useCases: 'FR Coveralls, Pants', pricePerMeter: '$5.50' },
        { name: 'Hi-Vis Oxford', composition: '100% Polyester PU Coated', weightGSM: '200', useCases: 'Safety Jackets', pricePerMeter: '$3.80' },
        { name: 'Poly-Cotton Pique', composition: '65/35 Poly-Cotton', weightGSM: '220', useCases: 'Corporate Uniforms', pricePerMeter: '$2.80' },
      ],
    },
  },

  // 8. Sri Lanka — Dresses & Womenswear
  {
    name: 'Colombo Elegance Fashions',
    location: 'Colombo, Western Province, Sri Lanka',
    description:
      'Women\'s fashion specialist with expertise in dresses, blouses, and skirts. Known for intricate detailing, embroidery, and beadwork. Strong relationships with European fashion houses. Ethical factory with 70% female workforce and on-site daycare.',
    rating: 4.6,
    turnaround: '4-6 weeks',
    minimum_order_quantity: 300,
    offer: 'Free tech pack development for first order',
    cover_image_url: factoryImg('Colombo Elegance Fashions', 'Dresses & Womenswear', PALETTES.colombo.main, 'dots'),
    gallery: [
      galleryImg('Embroidery Workshop', PALETTES.colombo.main, 'circles'),
      galleryImg('Fabric Draping Station', PALETTES.colombo.alt, 'waves'),
      galleryImg('Quality Inspection', PALETTES.colombo.main, 'grid'),
      galleryImg('Pattern Cutting Room', PALETTES.colombo.alt, 'lines'),
    ],
    tags: ['Womenswear', 'Dresses', 'Ethical', 'Embroidery', 'European Brands'],
    certifications: ['SA8000', 'WRAP', 'OEKO-TEX Standard 100', 'GOTS', 'Sedex'],
    specialties: ['Dresses', 'Blouses', 'Skirts', 'Jumpsuits', 'Embroidered Garments'],
    trust_tier: 'silver',
    completed_orders_count: 143,
    on_time_delivery_rate: 93.8,
    quality_rejection_rate: 0.9,
    machine_slots: [
      { machineType: 'Single Needle Lockstitch', availableSlots: 15, totalSlots: 100, nextAvailable: '2026-03-18' },
      { machineType: 'Embroidery Machine (6-Head)', availableSlots: 2, totalSlots: 8, nextAvailable: '2026-03-22' },
      { machineType: 'Blind Hem Machine', availableSlots: 4, totalSlots: 15, nextAvailable: '2026-03-16' },
      { machineType: 'Pleating Machine', availableSlots: 2, totalSlots: 6, nextAvailable: '2026-03-20' },
    ],
    catalog: {
      products: [
        {
          id: 'colombo-p1', name: 'Floral Midi Wrap Dress', description: 'Flattering wrap silhouette with adjustable waist tie. Digital floral print on flowing viscose.',
          category: 'Dresses', subcategory: 'Midi',
          images: [
            productImg('Midi Wrap Dress', 'Dresses', PALETTES.colombo.main, ICONS.dress, 0),
            productImg('Wrap Dress — Print', 'Dresses', PALETTES.colombo.alt, ICONS.dress, 1),
          ],
          fabricComposition: '100% Viscose', availableColors: ['Floral Blue', 'Floral Pink', 'Floral Green', 'Black Floral'],
          sizeRange: 'XS - 2XL', moq: 200, priceRange: '$8.00 - $12.00', leadTime: '5 weeks', tags: ['Bestseller', 'New'], featured: true,
        },
        {
          id: 'colombo-p2', name: 'Embroidered Linen Blouse', description: 'Relaxed fit linen blouse with hand-guided embroidery on collar and cuffs. Mother-of-pearl buttons.',
          category: 'Dresses', subcategory: 'Blouses',
          images: [productImg('Linen Blouse', 'Blouses', ['#ad1457', '#f48fb1'], ICONS.dress, 2)],
          fabricComposition: '100% Linen', availableColors: ['White', 'Cream', 'Lavender', 'Sage'],
          sizeRange: 'XS - XL', moq: 200, priceRange: '$9.00 - $14.00', leadTime: '6 weeks', tags: ['Premium', 'Eco-Friendly'], featured: true,
        },
        {
          id: 'colombo-p3', name: 'Pleated Maxi Skirt', description: 'Fully lined pleated maxi with elasticated waistband. Elegant drape for formal and casual occasions.',
          category: 'Dresses', subcategory: 'Skirts',
          images: [productImg('Pleated Maxi Skirt', 'Skirts', PALETTES.colombo.alt, ICONS.dress, 3)],
          fabricComposition: '100% Polyester Chiffon', availableColors: ['Black', 'Navy', 'Blush', 'Emerald', 'Rust'],
          sizeRange: 'XS - 2XL', moq: 200, priceRange: '$6.00 - $9.00', leadTime: '4 weeks', tags: [],
        },
      ],
      fabricOptions: [
        { name: 'Printed Viscose', composition: '100% Viscose', weightGSM: '130', useCases: 'Dresses, Blouses', pricePerMeter: '$3.20' },
        { name: 'Washed Linen', composition: '100% Linen', weightGSM: '160', useCases: 'Blouses, Shirts', pricePerMeter: '$5.80' },
        { name: 'Polyester Chiffon', composition: '100% Polyester', weightGSM: '75', useCases: 'Skirts, Overlays', pricePerMeter: '$2.50' },
      ],
    },
  },

  // 9. Cambodia — Hoodies & Fleece
  {
    name: 'Phnom Penh Fleece Factory',
    location: 'Phnom Penh, Cambodia',
    description:
      'Specialist in fleece and French terry garments \u2014 hoodies, sweatshirts, and joggers. Equipped with modern brushing and garment-dyeing facilities. Known for fast turnaround and competitive pricing on casual streetwear.',
    rating: 4.2,
    turnaround: '3-5 weeks',
    minimum_order_quantity: 800,
    offer: '7% off for orders placed before month-end',
    cover_image_url: factoryImg('Phnom Penh Fleece Factory', 'Hoodies & Streetwear', PALETTES.phnompenh.main, 'grid'),
    gallery: [
      galleryImg('Overlock Sewing Lines', PALETTES.phnompenh.main, 'dots'),
      galleryImg('Screen Print Department', PALETTES.phnompenh.alt, 'lines'),
      galleryImg('Garment Dyeing Facility', PALETTES.phnompenh.main, 'waves'),
    ],
    tags: ['Streetwear', 'Fleece', 'Hoodies', 'Fast Turn', 'Competitive Pricing'],
    certifications: ['WRAP', 'BSCI', 'OEKO-TEX Standard 100'],
    specialties: ['Hoodies', 'Sweatshirts', 'Joggers', 'Sweatpants', 'Zip-Up Jackets'],
    trust_tier: 'bronze',
    completed_orders_count: 94,
    on_time_delivery_rate: 90.5,
    quality_rejection_rate: 2.0,
    machine_slots: [
      { machineType: 'Overlock 5-Thread', availableSlots: 20, totalSlots: 100, nextAvailable: '2026-03-14' },
      { machineType: 'Coverlock', availableSlots: 12, totalSlots: 50, nextAvailable: '2026-03-16' },
      { machineType: 'Screen Print (Auto)', availableSlots: 3, totalSlots: 8, nextAvailable: '2026-03-18' },
      { machineType: 'Embroidery Machine', availableSlots: 2, totalSlots: 6, nextAvailable: '2026-03-20' },
    ],
    catalog: {
      products: [
        {
          id: 'phnompenh-p1', name: 'Classic Pullover Hoodie', description: 'Heavyweight brushed fleece hoodie with kangaroo pocket. Double-lined hood with drawcord. Ribbed cuffs and hem.',
          category: 'Hoodies', subcategory: 'Pullover',
          images: [
            productImg('Pullover Hoodie', 'Hoodies', PALETTES.phnompenh.main, ICONS.hoodie, 0),
            productImg('Hoodie — Colors', 'Hoodies', PALETTES.phnompenh.alt, ICONS.hoodie, 1),
          ],
          fabricComposition: '80% Cotton / 20% Polyester French Terry 320 GSM', availableColors: ['Black', 'Gray', 'Navy', 'Olive', 'Cream', 'Burgundy', 'Rust'],
          sizeRange: 'S - 3XL', moq: 300, priceRange: '$7.00 - $10.00', leadTime: '4 weeks', tags: ['Bestseller'], featured: true,
        },
        {
          id: 'phnompenh-p2', name: 'Full-Zip Fleece Hoodie', description: 'YKK metal zipper with full-zip front. Split kangaroo pockets and ribbed trims.',
          category: 'Hoodies', subcategory: 'Zip-Up',
          images: [productImg('Zip-Up Hoodie', 'Hoodies', ['#455a64', '#b0bec5'], ICONS.hoodie, 2)],
          fabricComposition: '60% Cotton / 40% Polyester Fleece 300 GSM', availableColors: ['Black', 'Charcoal', 'Navy', 'Forest Green'],
          sizeRange: 'S - 3XL', moq: 300, priceRange: '$8.50 - $12.00', leadTime: '4 weeks', tags: ['New'], featured: true,
        },
        {
          id: 'phnompenh-p3', name: 'Relaxed Fit Joggers', description: 'Tapered jogger with elastic waist and drawcord. Side pockets and back welt pocket.',
          category: 'Hoodies', subcategory: 'Joggers',
          images: [productImg('Relaxed Joggers', 'Joggers', PALETTES.phnompenh.alt, ICONS.pants, 3)],
          fabricComposition: '80% Cotton / 20% Polyester French Terry 280 GSM', availableColors: ['Black', 'Gray', 'Navy', 'Olive'],
          sizeRange: 'S - 2XL', moq: 500, priceRange: '$5.50 - $7.50', leadTime: '3 weeks', tags: ['Budget'],
        },
      ],
      fabricOptions: [
        { name: 'Brushed French Terry', composition: '80% Cotton / 20% Polyester', weightGSM: '320', useCases: 'Hoodies, Sweatshirts', pricePerMeter: '$4.50' },
        { name: 'Loop-Back French Terry', composition: '60% Cotton / 40% Polyester', weightGSM: '280', useCases: 'Joggers, Shorts', pricePerMeter: '$3.80' },
        { name: 'Polar Fleece', composition: '100% Polyester', weightGSM: '260', useCases: 'Zip-Ups, Vests', pricePerMeter: '$3.20' },
      ],
    },
  },

  // 10. Ethiopia — Children's Wear
  {
    name: 'Addis Kids Garments',
    location: 'Addis Ababa, Ethiopia',
    description:
      'Children\'s wear manufacturer with expertise in baby, toddler, and kids clothing. All fabrics pass CPSIA and EN 14682 safety testing. Focus on organic cotton sourced locally. Duty-free access to EU and US markets under AGOA.',
    rating: 4.1,
    turnaround: '5-7 weeks',
    minimum_order_quantity: 1000,
    offer: 'Duty-free EU/US shipping \u2014 AGOA eligible',
    cover_image_url: factoryImg('Addis Kids Garments', "Children's Wear", PALETTES.addis.main, 'circles'),
    gallery: [
      galleryImg('Baby Garment Sewing', PALETTES.addis.main, 'dots'),
      galleryImg('Safety Testing Room', PALETTES.addis.alt, 'grid'),
      galleryImg('Organic Cotton Store', PALETTES.addis.main, 'waves'),
    ],
    tags: ['Children\'s Wear', 'Organic', 'AGOA Eligible', 'Baby Clothing', 'Duty-Free'],
    certifications: ['GOTS', 'OEKO-TEX Standard 100', 'CPSIA Compliant', 'EN 14682 (Drawcord Safety)'],
    specialties: ['Baby Rompers', 'Kids T-Shirts', 'Children\'s Pajamas', 'Toddler Sets', 'School Uniforms'],
    trust_tier: 'bronze',
    completed_orders_count: 62,
    on_time_delivery_rate: 87.0,
    quality_rejection_rate: 2.5,
    machine_slots: [
      { machineType: 'Single Needle Lockstitch', availableSlots: 15, totalSlots: 80, nextAvailable: '2026-03-20' },
      { machineType: 'Overlock 4-Thread', availableSlots: 10, totalSlots: 50, nextAvailable: '2026-03-18' },
      { machineType: 'Snap Button Press', availableSlots: 4, totalSlots: 10, nextAvailable: '2026-03-16' },
      { machineType: 'Label Sewing Machine', availableSlots: 3, totalSlots: 8, nextAvailable: '2026-03-14' },
    ],
    catalog: {
      products: [
        {
          id: 'addis-p1', name: 'Organic Cotton Baby Romper', description: 'Soft organic cotton romper with nickel-free snap buttons. CPSIA tested and certified safe for infants.',
          category: "Children's Wear", subcategory: 'Baby (0-24M)',
          images: [
            productImg('Baby Romper', "Children's Wear", PALETTES.addis.main, ICONS.baby, 0),
            productImg('Romper — Colors', "Children's Wear", PALETTES.addis.alt, ICONS.baby, 1),
          ],
          fabricComposition: '100% Organic Cotton Interlock 180 GSM', availableColors: ['White', 'Mint', 'Peach', 'Sky Blue', 'Lavender', 'Yellow'],
          sizeRange: '0-3M / 3-6M / 6-12M / 12-18M / 18-24M', moq: 500, priceRange: '$2.50 - $3.80', leadTime: '5 weeks', tags: ['Eco-Friendly', 'Bestseller'], featured: true,
        },
        {
          id: 'addis-p2', name: 'Kids Graphic T-Shirt', description: 'Unisex kids tee with water-based screen print. Pre-shrunk and reinforced neckline.',
          category: "Children's Wear", subcategory: 'Kids (2-12Y)',
          images: [productImg('Kids Graphic Tee', "Children's Wear", ['#ff8f00', '#ffe082'], ICONS.baby, 2)],
          fabricComposition: '100% Organic Cotton Jersey 160 GSM', availableColors: ['White', 'Navy', 'Red', 'Yellow', 'Green'],
          sizeRange: '2Y / 4Y / 6Y / 8Y / 10Y / 12Y', moq: 800, priceRange: '$1.80 - $2.50', leadTime: '4 weeks', tags: ['Budget'],
        },
        {
          id: 'addis-p3', name: 'Toddler Pajama Set', description: 'Two-piece pajama set with flat seams for comfort. Snug-fit design per CPSC guidelines.',
          category: "Children's Wear", subcategory: 'Sleepwear',
          images: [
            productImg('Toddler Pajamas', "Children's Wear", PALETTES.addis.alt, ICONS.baby, 3),
            productImg('Pajamas — Patterns', "Children's Wear", PALETTES.addis.main, ICONS.baby, 4),
          ],
          fabricComposition: '100% Organic Cotton Rib 200 GSM', availableColors: ['Pink Stripe', 'Blue Stripe', 'Gray Stars', 'White Cloud'],
          sizeRange: '2T / 3T / 4T / 5T', moq: 500, priceRange: '$3.00 - $4.50', leadTime: '5 weeks', tags: ['New'], featured: true,
        },
      ],
      fabricOptions: [
        { name: 'Organic Cotton Interlock', composition: '100% Organic Cotton', weightGSM: '180', useCases: 'Baby Rompers, Bodysuits', pricePerMeter: '$3.80' },
        { name: 'Organic Cotton Jersey', composition: '100% Organic Cotton', weightGSM: '160', useCases: 'Kids T-Shirts, Tops', pricePerMeter: '$3.20' },
        { name: 'Organic Cotton Rib', composition: '100% Organic Cotton', weightGSM: '200', useCases: 'Pajamas, Leggings', pricePerMeter: '$3.50' },
      ],
    },
  },
];

export interface SeedResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Inserts all 10 factories into Supabase.
 * Uses direct supabase.from('factories').insert() — same as AddFactoryForm.
 */
export async function seedAllFactories(): Promise<SeedResult> {
  const result: SeedResult = { success: 0, failed: 0, errors: [] };

  for (const factory of FACTORIES) {
    try {
      const { error } = await supabase
        .from('factories')
        .insert([factory]);

      if (error) {
        result.failed++;
        result.errors.push(`${factory.name}: ${error.message}`);
        console.error(`Failed to insert ${factory.name}:`, error);
      } else {
        result.success++;
        console.log(`Inserted: ${factory.name}`);
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push(`${factory.name}: ${err.message}`);
      console.error(`Error inserting ${factory.name}:`, err);
    }
  }

  return result;
}

/** Returns the factory data array (for preview without inserting) */
export function getFactoryData() {
  return FACTORIES;
}
