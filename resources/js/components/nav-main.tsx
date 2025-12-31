import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveUrl } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { ChevronRight, Car } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { type NavigationItem } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';

interface RidingCompany {
    id: number;
    name: string;
    logo_url?: string;
}

interface NavMainProps {
    navigation: NavigationItem[];
}

const STORAGE_KEY = 'sidebar_open_groups';

export function NavMain({ navigation }: NavMainProps) {
    const page = usePage<SharedData>();
    const { hasEntityPermission } = usePermissions();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    
    // Riding company selector for admins
    const ridingCompanies = ((page.props as any).ridingCompanies || []) as RidingCompany[];
    const selectedRidingCompany = (page.props as any).selectedRidingCompany as RidingCompany | null;
    const auth = page.props.auth;
    const isSuperAdmin = auth?.user?.is_super_admin;
    const isCompanyAdmin = auth?.user?.is_company_admin;
    const userRidingCompanyId = (auth?.user as any)?.riding_company_id;
    const userRidingCompany = (auth?.user as any)?.riding_company as RidingCompany | null;
    
    // Show riding company selector for admins who don't have a specific riding company assigned
    const showRidingCompanySelector = (isSuperAdmin || isCompanyAdmin) && !userRidingCompanyId && ridingCompanies.length > 0;
    
    // Show view-only riding company display for users with assigned riding company
    const showRidingCompanyViewOnly = !!userRidingCompanyId && !!userRidingCompany;

    const handleRidingCompanySelect = (ridingCompanyId: string) => {
        router.post('/ridingcarcompanies/riding-companies/select', {
            riding_company_id: parseInt(ridingCompanyId),
        }, {
            preserveScroll: true,
        });
    };

    // Filter navigation items based on permissions
    const filteredNavigation = useMemo(() => {
        return navigation
            .map((group) => {
                // If it's a single item (has href), check permission
                if (group.href) {
                    // If no permission metadata, show the item (for backward compatibility)
                    if (!group.permission_module || !group.permission_entity) {
                        return group;
                    }
                    
                    if (!hasEntityPermission(group.permission_module, group.permission_entity)) {
                        return null;
                    }
                    return group;
                }

                // If it's a group with items, filter the items
                if (group.items && group.items.length > 0) {
                    const filteredItems = group.items.filter((item) => {
                        // If no permission metadata, show the item (for backward compatibility)
                        if (!item.permission_module || !item.permission_entity) {
                            return true;
                        }
                        return hasEntityPermission(item.permission_module, item.permission_entity);
                    });

                    // Only return the group if it has visible items
                    if (filteredItems.length === 0) {
                        return null;
                    }

                    return {
                        ...group,
                        items: filteredItems,
                    };
                }

                return group;
            })
            .filter((item): item is NavigationItem => item !== null);
    }, [navigation, hasEntityPermission]);
    
    // Load saved state from localStorage or default to ['Core']
    const getInitialOpenGroups = (): string[] => {
        if (typeof window === 'undefined') {
            return ['Core'];
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error loading sidebar state:', e);
        }
        return ['Core'];
    };

    const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);

    // Save to localStorage whenever openGroups changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
            } catch (e) {
                console.error('Error saving sidebar state:', e);
            }
        }
    }, [openGroups]);

    const getIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as any;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => {
            const newGroups = prev.includes(title)
                ? prev.filter((g) => g !== title)
                : [...prev, title];
            return newGroups;
        });
    };

    return (
        <>
            {filteredNavigation.map((group) => {
                // If item has href, it's a single item
                if (group.href) {
                    return (
                        <SidebarGroup key={group.title} className="px-2 py-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(resolveUrl(group.href))}
                                        tooltip={{ children: group.title }}
                                    >
                                        <Link href={group.href} prefetch>
                                            {getIcon(group.icon)}
                                            <span>{group.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                }

                // If item has items array, it's a collapsible group
                if (group.items && group.items.length > 0) {
                    const isOpen = openGroups.includes(group.title);

                    // In collapsed state, show icons directly for all groups
                    if (isCollapsed) {
                        return (
                            <SidebarGroup key={group.title} className="px-2 py-0">
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    !!(
                                                    item.href &&
                                                    page.url.startsWith(
                                                        resolveUrl(item.href)
                                                        )
                                                    )
                                                }
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href || '#'} prefetch>
                                                    {getIcon(item.icon)}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                            {/* Show Riding Company Selector after "Riding Companies" item - for admins - in collapsed state */}
                                            {item.title === 'Riding Companies' && showRidingCompanySelector && (
                                                <div className="mt-1 px-2">
                                                    <Select
                                                        value={selectedRidingCompany ? selectedRidingCompany.id.toString() : '0'}
                                                        onValueChange={handleRidingCompanySelect}
                                                    >
                                                        <SelectTrigger className={`w-full text-xs h-7 bg-muted/50 ${isCollapsed ? 'w-8 h-8 p-0 justify-center' : ''}`}>
                                                            <Car className={`h-3 w-3 ${isCollapsed ? 'mr-0' : 'mr-1'}`} />
                                                            {!isCollapsed && (
                                                                <SelectValue>
                                                                    {selectedRidingCompany ? selectedRidingCompany.name : 'All'}
                                                                </SelectValue>
                                                            )}
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">All Riding Companies</SelectItem>
                                                            {ridingCompanies.map((rc) => (
                                                                <SelectItem key={rc.id} value={rc.id.toString()}>
                                                                    {rc.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {/* Show View-Only Riding Company for users with assigned riding company - in collapsed state */}
                                            {item.title === 'Riding Companies' && showRidingCompanyViewOnly && (
                                                <>
                                                    <div className="mt-1 px-2">
                                                        <div className={`flex items-center gap-2 w-full text-xs h-7 bg-muted/50 rounded-md px-2 border ${isCollapsed ? 'w-8 h-8 p-0 justify-center' : ''}`}>
                                                            <Car className={`h-3 w-3 text-muted-foreground ${isCollapsed ? 'mr-0' : ''}`} />
                                                            {!isCollapsed && (
                                                                <span className="text-muted-foreground">{userRidingCompany?.name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Show Riding Company Logo for users with assigned riding company - in collapsed state */}
                                                    {!isCollapsed && userRidingCompany?.logo_url && (
                                                        <div className="flex items-center gap-2 mt-1 px-2">
                                                            <img
                                                                src={userRidingCompany.logo_url}
                                                                alt={userRidingCompany.name || 'Logo'}
                                                                className="h-10 w-40 object-contain"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        );
                    }

                    return (
                        <Collapsible
                            key={group.title}
                            open={isOpen}
                            onOpenChange={() => toggleGroup(group.title)}
                            className="group/collapsible"
                        >
                            <SidebarGroup className="px-2 py-0">
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={{ children: group.title }}
                                            >
                                                {getIcon(group.icon)}
                                                <span>{group.title}</span>
                                                <ChevronRight
                                                    className={`ml-auto h-4 w-4 transition-transform ${
                                                        isOpen ? 'rotate-90' : ''
                                                    }`}
                                                />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {group.items.map((item) => (
                                                    <SidebarMenuSubItem key={item.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={
                                                                !!(
                                                                item.href &&
                                                                page.url.startsWith(
                                                                    resolveUrl(item.href)
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <Link href={item.href || '#'} prefetch>
                                                                {getIcon(item.icon)}
                                                                <span>{item.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                        {/* Show Riding Company Logo - inside group/menu-sub-item relative */}
                                                        {item.title === 'Riding Companies' && (selectedRidingCompany || userRidingCompany) && (
                                                            <div className="group/menu-sub-item relative mt-2 px-2">
                                                                {(() => {
                                                                    const logoUrl = selectedRidingCompany?.logo_url || userRidingCompany?.logo_url;
                                                                    const companyName = selectedRidingCompany?.name || userRidingCompany?.name;
                                                                    
                                                                    if (logoUrl) {
                                                                        return (
                                                                            <div className="flex items-center justify-center">
                                                                                <img
                                                                                    src={logoUrl}
                                                                                    alt={companyName || 'Logo'}
                                                                                    className="h-10 w-40 object-contain"
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.style.display = 'none';
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        )}
                                                        {/* Show Riding Company Selector after "Riding Companies" item - for admins */}
                                                        {item.title === 'Riding Companies' && showRidingCompanySelector && (
                                                            <div className="mt-1 px-2">
                                                                <Select
                                                                    value={selectedRidingCompany ? selectedRidingCompany.id.toString() : '0'}
                                                                    onValueChange={handleRidingCompanySelect}
                                                                >
                                                                    <SelectTrigger className="w-full text-xs h-7 bg-muted/50">
                                                                        <Car className="mr-1 h-3 w-3" />
                                                                        <SelectValue>
                                                                            {selectedRidingCompany ? selectedRidingCompany.name : 'All'}
                                                                        </SelectValue>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="0">All Riding Companies</SelectItem>
                                                                        {ridingCompanies.map((rc) => (
                                                                            <SelectItem key={rc.id} value={rc.id.toString()}>
                                                                                {rc.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                        {/* Show View-Only Riding Company for users with assigned riding company */}
                                                        {item.title === 'Riding Companies' && showRidingCompanyViewOnly && (
                                                            <>
                                                                <div className="mt-1 px-2">
                                                                    <div className="flex items-center gap-2 w-full text-xs h-7 bg-muted/50 rounded-md px-2 border">
                                                                        <Car className="h-3 w-3 text-muted-foreground" />
                                                                        <span className="text-muted-foreground">{userRidingCompany?.name}</span>
                                                                    </div>
                                                                </div>
                                                                {/* Show Riding Company Logo for users with assigned riding company */}
                                                                {userRidingCompany?.logo_url && (
                                                                    <div className="flex items-center gap-2 mt-1 px-2">
                                                                        <img
                                                                            src={userRidingCompany.logo_url}
                                                                            alt={userRidingCompany.name || 'Logo'}
                                                                            className="h-10 w-40 object-contain"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroup>
                        </Collapsible>
                    );
                }

                return null;
            })}
        </>
    );
}
