import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    navigation: NavigationItem[];
    flash: {
        success?: string;
        error?: string;
        info?: string;
    };
    sidebarOpen: boolean;
    selectedCompany?: Company | null;
    companies?: Company[];
    [key: string]: unknown;
}

export interface NavigationItem {
    title: string;
    href?: string;
    icon?: string;
    items?: NavigationItem[];
    permission_module?: string | null;
    permission_entity?: string | null;
}

export interface Permission {
    id: number;
    name: string;
    module_name: string;
    entity_name: string;
    action: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    is_super_admin?: boolean;
    is_company_admin?: boolean;
    company_id?: number;
    company?: {
        id: number;
        name: string;
        logo?: string;
        logo_url?: string;
    };
    permissions?: Permission[];
    [key: string]: unknown; // This allows for additional properties...
}

export interface Company {
    id: number;
    name: string;
    slug?: string;
    logo?: string | null;
    logo_url?: string | null;
}
