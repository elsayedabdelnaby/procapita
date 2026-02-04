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

    // Use selectedCompany or fallback to first company or user's company
    const currentCompany = selectedCompany || 
        (companies && companies.length > 0 ? companies[0] : null) ||
        (auth?.user?.company ? {
            id: auth.user.company.id,
            name: auth.user.company.name,
            logo: auth.user.company.logo,
            logo_url: auth.user.company.logo_url,
        } : null);

    const handleCompanySelect = (companyId: string) => {
            // If already on a Reseller Company page, navigate to the new company so the whole page updates
            const onCompanyPage = typeof window !== 'undefined' && /^\/core\/companies\/\d+$/.test(window.location.pathname);
            if (onCompanyPage) {
                router.visit(`/core/companies/${companyId}`);
                return;
            }
            router.post('/core/companies/select', {
                company_id: parseInt(companyId),
            }, {
                preserveScroll: true,
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
                {isSuperAdmin && companies && companies.length > 0 && currentCompany && (
                    <div className="px-2 py-2">
                        <Select
                            value={currentCompany.id.toString()}
                            onValueChange={handleCompanySelect}
                        >
                            <SelectTrigger className="w-full">
                                <Building2 className="mr-2 h-4 w-4" />
                                <SelectValue>
                                    {currentCompany.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
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

