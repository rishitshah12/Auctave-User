import { ComponentType } from 'react';

export interface CMSModuleRoute {
    path: string;
    component: ComponentType<any>;
    requiredPermission: string;
}

export interface CMSModule {
    name: string;
    routes: CMSModuleRoute[];
    permissions: {
        read: string;
        write: string;
        delete: string;
    };
    schema: {
        tableName: string;
        primaryKey: string;
        deploySql?: string;
    };
    rls: {
        policies: string[];
        deploySql?: string;
    };
    handlers: any;
}