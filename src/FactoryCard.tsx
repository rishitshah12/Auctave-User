import React, { FC } from 'react';
import { Star, BadgePercent } from 'lucide-react';
import { Factory } from '../src/types';

interface FactoryCardProps {
    factory: Factory;
    onSelect: () => void;
    style: React.CSSProperties;
}

export const FactoryCard: FC<FactoryCardProps> = React.memo(({ factory, onSelect, style }) => (
    <div onClick={onSelect} style={style} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col animate-card-enter">
        <div className="relative">
            <img src={factory.imageUrl} alt={factory.name} className="h-56 w-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src=`https://placehold.co/600x400/e9d5ff/4c1d95?text=${factory.name}`; }} />
            
            {factory.offer && (
                <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-sm font-bold px-3 py-1.5 flex items-center gap-1 rounded-md shadow-lg">
                    <BadgePercent size={16} />
                    <span>{factory.offer}</span>
                </div>
            )}

            {factory.tags.includes('Prime') && (
                 <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wide">
                    Promoted
                </div>
            )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-xl text-gray-800 truncate pr-2 group-hover:text-purple-600 transition-colors">{factory.name}</h3>
                <div className="flex-shrink-0 flex items-center bg-green-600 text-white font-bold px-2 py-0.5 rounded text-sm">
                    <span className="mr-1">{factory.rating}</span>
                    <Star size={14} className="fill-current" />
                </div>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
                <p className="truncate pr-4">{factory.specialties.join(', ')}</p>
                <p className="flex-shrink-0 font-medium">MOQ: {factory.minimumOrderQuantity.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                <p className="truncate pr-4">{factory.location}</p>
                <p className="flex-shrink-0">{factory.turnaround}</p>
            </div>
        </div>
    </div>
));