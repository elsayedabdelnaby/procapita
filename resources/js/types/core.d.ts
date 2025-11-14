export interface Company {
    id: number;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo: string | null;
    is_active: boolean;
    settings: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    users_count?: number;
    modules_count?: number;
}

export interface CompanyModule {
    id: number;
    company_id: number;
    module_name: string;
    is_active: boolean;
    settings: Record<string, any> | null;
    created_at: string;
    updated_at: string;
}

export interface Role {
    id: number;
    name: string;
    guard_name: string;
    team_id: number | null;
    parent_id: number | null;
    hierarchy_path: string | null;
    hierarchy_level: number;
    is_root: boolean;
    module_name: string | null;
    entity_name: string | null;
    created_at: string;
    updated_at: string;
    permissions?: Permission[];
    children?: Role[];
    all_children?: Role[];
    parent?: Role;
}

export interface Permission {
    id: number;
    name: string;
    guard_name: string;
    module_name: string | null;
    entity_name: string | null;
    action: string | null;
    created_at: string;
    updated_at: string;
}

export interface CoreUser extends User {
    company_id: number | null;
    is_super_admin: boolean;
    is_company_admin: boolean;
    is_active: boolean;
    company?: Company;
    roles?: Role[];
    permissions?: Permission[];
}

