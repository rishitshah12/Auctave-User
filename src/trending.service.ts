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

export const trendingService = new TrendingService();