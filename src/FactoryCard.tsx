// Import React and functional component type
import React, { FC } from 'react';
// Import icons for rating and offers
import { Star, BadgePercent } from 'lucide-react';
// Import the Factory data type
import { Factory } from '../src/types';

// Define what information this component needs to work
interface FactoryCardProps {
    factory: Factory; // The factory data object
    onSelect: () => void; // Function to run when the card is clicked
    style: React.CSSProperties; // Optional styles (used for animation delays)
}

// The FactoryCard component - displays a summary of a factory
// React.memo is used here to prevent unnecessary re-renders if the data hasn't changed
export const FactoryCard: FC<FactoryCardProps> = React.memo(({ factory, onSelect, style }) => (
    // Main card container: clickable, with shadow and hover effects
    <div onClick={onSelect} style={style} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-white/10 transition-all duration-300 cursor-pointer group flex flex-col animate-card-enter hover:-translate-y-1 overflow-hidden h-full">
        
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
            {/* Factory Cover Image with fallback if it fails to load */}
            <img 
                src={factory.imageUrl} 
                alt={factory.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                onError={(e) => { 
                    (e.target as HTMLImageElement).onerror = null; 
                    (e.target as HTMLImageElement).src=`https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(factory.name || 'Factory')}`; 
                }} 
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Promotional Offer Badge (only shows if an offer exists) */}
            {factory.offer && (
                <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 flex items-center gap-1 rounded-lg shadow-sm z-10">
                    <BadgePercent size={12} />
                    <span>{factory.offer}</span>
                </div>
            )}

            {/* 'Promoted' Badge for Prime factories */}
            {factory.tags.some(t => t.split(':')[0] === 'Prime') && (
                 <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-white/10 z-10">
                    Promoted
                </div>
            )}

            {/* Turnaround Time Badge */}
            <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-md text-gray-800 dark:text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm z-10">
                {factory.turnaround}
            </div>
        </div>

        {/* Content Section: Name, Rating, Details */}
        <div className="p-4 flex flex-col flex-grow">
            {/* Header: Name and Star Rating */}
            <div className="flex justify-between items-start mb-2">
                <div className="pr-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight group-hover:text-[#c20c0b] transition-colors line-clamp-1">{factory.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-200 mt-1 line-clamp-1">{factory.location}</p>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center bg-green-600 text-white font-bold px-2 py-1 rounded-lg text-xs shadow-sm">
                    <span className="mr-1">{factory.rating}</span>
                    <Star size={10} className="fill-current" />
                </div>
            </div>

            {/* Specialties */}
            <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-200 line-clamp-1">
                    {factory.specialties.join(', ')}
                </p>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 mt-auto mb-3"></div>

            {/* Footer: MOQ and Tags */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                     <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Min. Order</span>
                     <span className="text-sm font-bold text-gray-800 dark:text-white">{factory.minimumOrderQuantity.toLocaleString()} units</span>
                </div>

                {/* Tags Section */}
                <div className="flex gap-1">
                    {factory.tags && factory.tags.filter(t => !t.startsWith('Prime')).slice(0, 2).map((tag, i) => {
                        const [label] = tag.split(':');
                        return (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-700">
                                {label}
                            </span>
                        );
                    })}
                    {(factory.tags && factory.tags.filter(t => !t.startsWith('Prime')).length > 2) && (
                        <span className="text-[10px] px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-700">
                            +{factory.tags.filter(t => !t.startsWith('Prime')).length - 2}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
));