import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import AppLogo from './app-logo';

function SidebarRightTrigger() {
    const { toggleSidebar, state } = useSidebar();
    
    return (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/sidebar-content:opacity-100 transition-opacity pointer-events-none">
            <div className="pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-6 w-6 rounded-l-md rounded-r-none bg-sidebar hover:bg-sidebar-accent border border-sidebar-border border-r-0 shadow-sm"
                >
                    {state === 'expanded' ? (
                        <ChevronLeft className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </div>
        </div>
    );
}

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { navigation, selectedCompany, companies, auth } = page.props;
    const isSuperAdmin = auth?.user?.is_super_admin;
    const [companySelectLoading, setCompanySelectLoading] = useState(false);

    // For super admin: "All Companies" when no selection; otherwise show selected company name
    const selectValue = selectedCompany ? selectedCompany.id.toString() : 'all';
    const selectLabel = companySelectLoading ? 'Switching…' : (selectedCompany ? selectedCompany.name : 'All Companies');

    const handleCompanySelect = (value: string) => {
        const onCompanyPage = typeof window !== 'undefined' && /^\/core\/companies\/\d+$/.test(window.location.pathname);
        if (onCompanyPage) {
            if (value === 'all') {
                router.post('/core/companies/clear-selection', {}, { preserveScroll: true });
            } else {
                router.visit(`/core/companies/${value}`);
            }
            return;
        }
        // Use AJAX + reload to avoid slow redirect and session lock wait
        setCompanySelectLoading(true);
        const url = value === 'all' ? '/core/companies/clear-selection' : '/core/companies/select';
        const body = value === 'all' ? {} : { company_id: parseInt(value, 10) };
        axios
            .post(url, body, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-Ajax-Company-Select': '1',
                },
            })
            .then(() => {
                router.reload({ preserveScroll: true });
            })
            .finally(() => {
                setCompanySelectLoading(false);
            });
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                                <Link href={dashboard()} prefetch>
                                    <AppLogo />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                </SidebarMenu>
                {isSuperAdmin && companies && companies.length > 0 && (
                    <div className="px-2 py-2">
                        <Select
                            value={selectValue}
                            onValueChange={handleCompanySelect}
                            disabled={companySelectLoading}
                        >
                            <SelectTrigger className="w-full" aria-busy={companySelectLoading}>
                                <Building2 className="mr-2 h-4 w-4" />
                                <SelectValue>
                                    {selectLabel}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Companies
                                </SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent className="relative group/sidebar-content">
                <NavMain navigation={navigation || []} />
                {/* Sidebar Trigger on the right edge */}
                <SidebarRightTrigger />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

