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
    const onTimeRate = factory.onTimeDeliveryRate;
    const onTimeColor = onTimeRate === undefined ? 'text-gray-400' : onTimeRate >= 90 ? 'text-emerald-500' : onTimeRate >= 75 ? 'text-amber-500' : 'text-red-500';

    return (
        <div
            onClick={onSelect}
            style={style}
            className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-white/8 shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-300 cursor-pointer group flex flex-col animate-card-enter overflow-hidden h-full"
        >
            {/* Image */}
            <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <img
                    src={factory.imageUrl}
                    alt={factory.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(factory.name || 'Factory')}`;
                    }}
                />

                {/* Bottom gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* Promoted badge */}
                {isPromoted && (
                    <div className="absolute top-2.5 left-2.5 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md z-10">
                        Promoted
                    </div>
                )}

                {/* Tier badge */}
                {showTierBanner && (
                    <div
                        className={`absolute ${isPromoted ? 'top-9' : 'top-2.5'} left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold z-10 shadow-sm`}
                        style={{ background: tierCfg.bannerGradient, color: tierCfg.bannerTextColor }}
                    >
                        <Medal size={9} />
                        {tierCfg.label}
                    </div>
                )}

                {/* Rating — top-right */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-black/55 backdrop-blur-sm text-white font-bold px-2 py-0.5 rounded-md text-xs z-10">
                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                    <span className="ml-0.5">{factory.rating}</span>
                </div>

                {/* Offer badge — bottom left */}
                {factory.offer && (
                    <div className="absolute bottom-2.5 left-2.5 z-10">
                        <div className="flex items-center gap-1 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <BadgePercent size={10} className="flex-shrink-0" />
                            {factory.offer}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4 pt-3 pb-4 flex flex-col flex-grow">
                {/* Factory name — larger on mobile */}
                <h3 className="font-bold text-[17px] sm:text-[15px] text-gray-900 dark:text-white leading-snug group-hover:text-[#c20c0b] transition-colors duration-200 line-clamp-1 mb-0.5">
                    {factory.name}
                </h3>

                {/* Specialties */}
                <p className="text-[12px] sm:text-[12px] text-gray-400 dark:text-gray-500 line-clamp-1 mb-2">
                    {factory.specialties.join(' · ')}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 mb-3">
                    <MapPin size={11} className="text-[#c20c0b] flex-shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{factory.location}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* Metrics strip */}
                <div className="flex items-center justify-between pt-2.5">
                    <div className="flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{factory.completedOrdersCount ?? 0}+</span>
                        <span className="text-xs text-gray-400">orders</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-xs font-bold ${onTimeColor}`}>
                            {onTimeRate !== undefined ? `${onTimeRate}%` : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400">on-time</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
