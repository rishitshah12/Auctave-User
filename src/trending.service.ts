import { BaseService } from './base.service';

export class TrendingService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'trending_items',
            permissions: {
                read: 'trending.read',
                write: 'trending.write',
                delete: 'trending.delete'
            }
        });
    }
}

export class BannerService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'trending_banners',
            permissions: { write: 'trending.write', delete: 'trending.delete' }
        });
    }
}

export class TrendingProductService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'trending_products',
            permissions: { write: 'trending.write', delete: 'trending.delete' }
        });
    }
}

export class BlogService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'trending_blogs',
            permissions: { write: 'trending.write', delete: 'trending.delete' }
        });
    }
}

export class ShortsService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'trending_shorts',
            permissions: { write: 'trending.write', delete: 'trending.delete' }
        });
    }
}

export const trendingService = new TrendingService();
export const bannerService = new BannerService();
export const trendingProductService = new TrendingProductService();
export const blogService = new BlogService();
export const shortsService = new ShortsService();
