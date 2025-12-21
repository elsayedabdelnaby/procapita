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
import { Building2 } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { navigation, selectedCompany, companies, auth } = page.props;
    const isSuperAdmin = auth?.user?.is_super_admin;
    const userRidingCompany = (auth?.user as any)?.riding_company;

    const handleCompanySelect = (companyId: string) => {
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
                        {userRidingCompany && (
                            <div className="px-2 text-xs text-muted-foreground text-center">
                                {userRidingCompany.name}
                            </div>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
                {isSuperAdmin && companies && companies.length > 0 && selectedCompany && (
                    <div className="px-2 py-2">
                        <Select
                            value={selectedCompany.id.toString()}
                            onValueChange={handleCompanySelect}
                        >
                            <SelectTrigger className="w-full">
                                <Building2 className="mr-2 h-4 w-4" />
                                <SelectValue>
                                    {selectedCompany.name}
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

            <SidebarContent>
                <NavMain navigation={navigation || []} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

