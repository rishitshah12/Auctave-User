import { BaseService, ServiceResponse } from './base.service';

export class UserService extends BaseService<any> {
    constructor() {
        super({
            tableName: 'clients',
            permissions: {
                read: 'users.read',
                write: 'users.write',
                delete: 'users.delete'
            }
        });
    }
}

export const userService = new UserService();