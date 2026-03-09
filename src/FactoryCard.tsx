import React, { FC } from 'react';
import { Star, BadgePercent, Medal, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { Factory } from '../src/types';

const TRUST_TIER_CONFIG = {
    gold:       { label: 'Gold',      badgeGradient: 'from-yellow-400 to-amber-500',   badgeText: 'text-yellow-900', bannerGradient: 'linear-gradient(to right, #facc15, #f59e0b)', bannerTextColor: '#713f12' },
    silver:     { label: 'Silver',    badgeGradient: 'from-slate-300 to-slate-500',     badgeText: 'text-slate-900',  bannerGradient: 'linear-gradient(to right, #cbd5e1, #64748b)', bannerTextColor: '#1e293b' },
    bronze:     { label: 'Bronze',    badgeGradient: 'from-orange-400 to-amber-600',    badgeText: 'text-orange-900', bannerGradient: 'linear-gradient(to right, #fb923c, #d97706)', bannerTextColor: '#431407' },
    unverified: { label: 'Unverified',badgeGradient: 'from-gray-400 to-gray-500',       badgeText: 'text-gray-900',   bannerGradient: 'linear-gradient(to right, #9ca3af, #6b7280)', bannerTextColor: '#f9fafb' },
} as const;

export const TrustTierBadge: FC<{ tier?: Factory['trustTier'] }> = ({ tier = 'unverified' }) => {
    if (tier === 'unverified') return null;
    const cfg = TRUST_TIER_CONFIG[tier];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${cfg.badgeGradient} ${cfg.badgeText} text-[10px] font-bold shadow-sm`}>
            <Medal size={9} />
            {cfg.label}
        </span>
    );
};

interface FactoryCardProps {
    factory: Factory;
    onSelect: () => void;
    style: React.CSSProperties;
}

export const FactoryCard: FC<FactoryCardProps> = React.memo(({ factory, onSelect, style }) => {
    const tier = factory.trustTier || 'unverified';
    const tierCfg = TRUST_TIER_CONFIG[tier];
    const showTierBanner = tier !== 'unverified';
    const isPromoted = factory.tags.some(t => t.split(':')[0] === 'Prime');

    return (
        <div onClick={onSelect} style={style} className="bg-gray-50 dark:bg-black rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col animate-card-enter hover:-translate-y-1 h-full">

            {/* Image with all corners rounded, padded inside card */}
            <div className="p-3 pb-0">
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/2' }}>
                    <img
                        src={factory.imageUrl}
                        alt={factory.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(factory.name || 'Factory')}`;
                        }}
                    />

                    {/* Promoted badge — top-left */}
                    {isPromoted && (
                        <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md z-10">
                            Promoted
                        </div>
                    )}

                    {/* Tier badge — top-left (below promoted if present) */}
                    {showTierBanner && (
                        <div
                            className={`absolute ${isPromoted ? 'top-9' : 'top-2.5'} left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold z-10 shadow-sm`}
                            style={{ background: tierCfg.bannerGradient, color: tierCfg.bannerTextColor }}
                        >
                            <Medal size={9} />
                            {tierCfg.label}
                        </div>
                    )}

                    {/* Rating badge — top-right */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-green-700/90 backdrop-blur-sm text-white font-bold px-2 py-0.5 rounded-md text-xs z-10">
                        <span>{factory.rating}</span>
                        <Star size={10} className="fill-current" />
                    </div>

                    {/* Offer banner — bottom-left, small, with fade-out to right */}
                    {factory.offer && (
                        <div className="absolute bottom-0 left-0 z-10 max-w-[75%]">
                            <div
                                className="flex items-center gap-1.5 pl-3 pr-5 py-1.5"
                                style={{
                                    background: 'linear-gradient(to right, rgba(37, 99, 235, 0.92) 60%, rgba(37, 99, 235, 0) 100%)',
                                    borderTopRightRadius: '12px',
                                }}
                            >
                                <BadgePercent size={13} className="text-white flex-shrink-0" />
                                <span className="text-white text-xs font-bold whitespace-nowrap">{factory.offer}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-grow">
                {/* Name + rating row */}
                <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="font-bold text-[15px] text-gray-900 dark:text-white leading-snug group-hover:text-[#c20c0b] transition-colors line-clamp-1">
                        {factory.name}
                    </h3>
                </div>

                {/* Specialties */}
                <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-0.5">
                    {factory.specialties.join(', ')}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 mb-3">
                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{factory.location}</p>
                </div>

                {/* Thin divider */}
                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* Metrics strip */}
                <div className="flex items-center gap-4 pt-2.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{factory.completedOrdersCount ?? 0}+</span>
                        <span>orders</span>
                    </div>
                    <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400 flex-shrink-0" />
                        {factory.onTimeDeliveryRate !== undefined ? (
                            <span className={`font-semibold ${factory.onTimeDeliveryRate >= 90 ? 'text-green-600 dark:text-green-400' : factory.onTimeDeliveryRate >= 75 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {factory.onTimeDeliveryRate}%
                            </span>
                        ) : (
                            <span className="text-gray-400">N/A</span>
                        )}
                        <span>on-time</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
