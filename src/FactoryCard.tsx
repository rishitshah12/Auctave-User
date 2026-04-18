import React, { FC, useRef } from 'react';
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
    onPrefetch?: () => void;
    onHover?: (factory: Factory, duration_ms: number) => void;
}

export const FactoryCard: FC<FactoryCardProps> = React.memo(({ factory, onSelect, style, onPrefetch, onHover }) => {
    const hoverStartRef = useRef<number | null>(null);
    const tier = factory.trustTier || 'unverified';
    const tierCfg = TRUST_TIER_CONFIG[tier];
    const showTierBanner = tier !== 'unverified';
    const isPromoted = factory.tags.some(t => t.split(':')[0] === 'Prime');
    const onTimeRate = factory.onTimeDeliveryRate;
    const onTimeColor = onTimeRate === undefined ? 'text-gray-400' : onTimeRate >= 90 ? 'text-emerald-500 sm:text-green-600' : onTimeRate >= 75 ? 'text-amber-500 sm:text-yellow-600' : 'text-red-500';

    return (
        <div
            onClick={onSelect}
            onPointerEnter={onPrefetch}
            onTouchStart={onPrefetch}
            onMouseEnter={() => { hoverStartRef.current = Date.now(); }}
            onMouseLeave={() => {
                if (hoverStartRef.current !== null && onHover) {
                    const duration_ms = Date.now() - hoverStartRef.current;
                    if (duration_ms > 500) onHover(factory, duration_ms);
                    hoverStartRef.current = null;
                }
            }}
            style={style}
            className="bg-white sm:bg-gray-50 dark:bg-gray-900/60 sm:dark:bg-black rounded-2xl border border-gray-100 sm:border-0 dark:border-white/8 shadow-sm sm:shadow-none hover:shadow-xl sm:hover:shadow-lg active:scale-[0.98] sm:active:scale-100 sm:hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col animate-card-enter overflow-hidden sm:overflow-visible h-full"
        >
            {/* Image — mobile: full-bleed; desktop: padded with rounded corners */}
            <div className="sm:p-3 sm:pb-0">
                <div className="relative overflow-hidden sm:rounded-xl aspect-[16/9] sm:aspect-[3/2]">
                    <img
                        src={factory.imageUrl}
                        alt={factory.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(factory.name || 'Factory')}`;
                        }}
                    />

                    {/* Bottom gradient — mobile only */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none sm:hidden" />

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

                    {/* Rating badge — mobile: dark/black; desktop: green */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-black/55 sm:bg-green-700/90 backdrop-blur-sm text-white font-bold px-2 py-0.5 rounded-md text-xs z-10">
                        {/* Mobile: star first */}
                        <Star size={10} className="fill-yellow-400 text-yellow-400 sm:hidden" />
                        <span className="sm:mr-0.5">{factory.rating}</span>
                        {/* Desktop: star after */}
                        <Star size={10} className="fill-current hidden sm:inline" />
                    </div>

                    {/* Offer badge — mobile: small rounded badge; desktop: full-bleed gradient */}
                    {factory.offer && (
                        <>
                            {/* Mobile */}
                            <div className="absolute bottom-2.5 left-2.5 z-10 sm:hidden">
                                <div className="flex items-center gap-1 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    <BadgePercent size={10} className="flex-shrink-0" />
                                    {factory.offer}
                                </div>
                            </div>
                            {/* Desktop */}
                            <div className="absolute bottom-0 left-0 z-10 max-w-[75%] hidden sm:block">
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
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-3.5 pt-3 pb-4 sm:pb-3.5 flex flex-col flex-grow">
                {/* Factory name */}
                <h3 className="font-bold text-[17px] sm:text-[15px] text-gray-900 dark:text-white leading-snug group-hover:text-[#c20c0b] transition-colors duration-200 line-clamp-1 mb-0.5">
                    {factory.name}
                </h3>

                {/* Specialties */}
                <p className="text-[12px] sm:text-[13px] text-gray-400 sm:text-gray-500 dark:text-gray-400 sm:dark:text-gray-400 line-clamp-1 mb-2 sm:mb-0.5">
                    {factory.specialties.join(' · ')}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 mb-3">
                    <MapPin size={11} className="text-[#c20c0b] sm:text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-500 sm:text-gray-400 dark:text-gray-400 sm:dark:text-gray-500 line-clamp-1">{factory.location}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* Metrics strip */}
                <div className="flex items-center justify-between sm:justify-start sm:gap-4 pt-2.5">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 sm:text-green-600 flex-shrink-0" />
                        <span className="text-xs font-bold sm:font-semibold text-gray-700 dark:text-gray-200">{factory.completedOrdersCount ?? 0}+</span>
                        <span className="text-xs text-gray-400 sm:text-gray-500 dark:sm:text-gray-400">orders</span>
                    </div>
                    {/* Vertical divider — desktop only */}
                    <div className="hidden sm:block w-px h-3.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <Clock size={12} className="sm:w-[13px] sm:h-[13px] text-gray-400 flex-shrink-0" />
                        <span className={`text-xs font-bold sm:font-semibold ${onTimeColor}`}>
                            {onTimeRate !== undefined ? `${onTimeRate}%` : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400 sm:text-gray-500 dark:sm:text-gray-400">on-time</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
