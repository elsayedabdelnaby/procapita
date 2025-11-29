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
} from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Building2, X } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { navigation, selectedCompany, companies, auth } = page.props;
    const isSuperAdmin = auth?.user?.is_super_admin;

    const handleCompanySelect = (companyId: string) => {
        if (companyId === 'clear') {
            router.post('/core/companies/clear-selection', {}, {
                preserveScroll: true,
            });
        } else {
            router.post('/core/companies/select', {
                company_id: parseInt(companyId),
            }, {
                preserveScroll: true,
            });
        }
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
                            value={selectedCompany?.id?.toString() || ''}
                            onValueChange={handleCompanySelect}
                        >
                            <SelectTrigger className="w-full">
                                <Building2 className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Select Company" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="clear">All Companies</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedCompany && (
                            <div className="mt-2 px-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Viewing: {selectedCompany.name}</span>
                                <button
                                    onClick={() => handleCompanySelect('clear')}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                    title="Clear selection"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                <NavMain navigation={navigation || []} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

