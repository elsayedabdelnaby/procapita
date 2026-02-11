import { RidingCompanyDeleteDialog } from '@/components/core/riding-company-delete-dialog';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { CoreUser } from '@/types/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight, Mail, MapPin, Phone, Trash2, Users as UsersIcon, X, Plug, GitBranch, RefreshCw, Facebook, Plus, Pencil, Trash, Check, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { WhatsAppLinkDeviceRidingCompanyTab } from '@/components/whatsapp/whatsapp-link-device-riding-company-tab';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { MultiSelect } from '@/components/ui/multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RidingCompany {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    description?: string;
    country?: string;
    city?: string;
    logo_path?: string;
    contact_email?: string;
    contact_phone?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    distribution_type?: string | null;
    max_drivers_per_day?: number;
    distribution_users?: number[];
    distribution_scenarios?: Array<{
        id?: string;
        distribution_from_users: number[];
        max_drivers_per_day: number;
        distribution_by_lead_source_enabled: boolean;
        distribution_by_lead_sources: number[];
        assigned_to_users: number[];
        assigned_to_roles: number[];
    }>;
    last_distribution_date?: string | null;
    stage_templates?: Array<{
        id: number;
        name: string;
        order: number;
        target_value: number;
        target_unit: string;
        duration_days: number;
        strict_sequence: boolean;
        allow_cumulative: boolean;
        active: boolean;
    }>;
    document_requirements?: Array<{
        id: number;
        name: string;
        type: string;
        required: boolean;
        active: boolean;
    }>;
    document_names?: Array<{
        id: number;
        name: string;
        type: string;
        required: boolean;
        active: boolean;
        status: string;
    }>;
    integrations?: Array<{
        id: number;
        type: string;
        active: boolean;
    }>;
    integration_settings?: Array<{
        id: number;
        type: string;
        active: boolean;
    }>;
}

interface RidingCompanyShowProps {
    ridingCompany: RidingCompany & {
        default_driver_user_id?: number | null;
        default_driver_user?: {
            id: number;
            name: string;
            email: string;
        } | null;
        company?: {
            id: number;
            name: string;
        } | null;
    };
    users?: CoreUser[];
    availableUsers?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
    leadSources?: Array<{
        id: number;
        name: string;
    }>;
    campaigns?: Array<{
        id: number;
        name: string;
    }>;
    roles?: Array<{
        id: number;
        name: string;
    }>;
    availableRidingCompanies?: Array<{
        id: number;
        name: string;
        company_id?: number;
    }>;
    usersCount?: number;
}

export default function RidingCompaniesShow({ ridingCompany, users = [], availableUsers = [], leadSources = [], campaigns = [], roles = [], availableRidingCompanies = [], usersCount = 0 }: RidingCompanyShowProps) {
    const page = usePage();
    const { can } = usePermissions();
    // Preserve active tab: allow ?tab= from URL on first load, then localStorage
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rotation' | 'integrations'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['overview', 'users', 'rotation', 'integrations'].includes(tabParam)) {
                return tabParam as 'overview' | 'users' | 'rotation' | 'integrations';
            }
            const savedTab = localStorage.getItem('ridingCompanyActiveTab');
            return (savedTab as any) || 'overview';
        }
        return 'overview';
    });
    
    // Sync tab from URL on mount (e.g. deep link from Reseller Management)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['overview', 'users', 'rotation', 'integrations'].includes(tabParam)) {
            setActiveTab(tabParam as 'overview' | 'users' | 'rotation' | 'integrations');
        }
    }, []);
    
    // Save tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('ridingCompanyActiveTab', activeTab);
    }, [activeTab]);

    // Distribution scenarios state
    interface DistributionScenario {
        id: string; // Temporary ID for new scenarios
        distribution_from_users: number[]; // Required
        max_drivers_per_day: number; // Default 10
        distribution_by_lead_source_enabled: boolean;
        distribution_by_lead_sources: number[];
        distribution_by_campaign_enabled: boolean;
        distribution_by_campaigns: number[];
        assigned_to_users: number[];
        assigned_to_roles: number[];
        active?: boolean; // Active/Inactive status for the scenario
    }

    // Helper function to normalize scenarios for comparison
    const normalizeScenarios = (scenarios: DistributionScenario[]): string => {
        return JSON.stringify(scenarios.map(s => ({
            id: s.id && !s.id.toString().startsWith('scenario-') ? s.id : null,
            distribution_from_users: [...s.distribution_from_users].sort(),
            max_drivers_per_day: s.max_drivers_per_day || 10,
            distribution_by_lead_source_enabled: s.distribution_by_lead_source_enabled || false,
            distribution_by_lead_sources: [...(s.distribution_by_lead_sources || [])].sort(),
            distribution_by_campaign_enabled: s.distribution_by_campaign_enabled || false,
            distribution_by_campaigns: [...(s.distribution_by_campaigns || [])].sort(),
            assigned_to_users: [...(s.assigned_to_users || [])].sort(),
            assigned_to_roles: [...(s.assigned_to_roles || [])].sort(),
            active: s.active !== undefined ? s.active : true,
        })));
    };

    const [scenarios, setScenarios] = useState<DistributionScenario[]>(() => {
        // Initialize with one empty scenario if no existing data
        if (!ridingCompany.distribution_scenarios || (Array.isArray(ridingCompany.distribution_scenarios) && ridingCompany.distribution_scenarios.length === 0)) {
            return [{
                id: 'scenario-1',
                distribution_from_users: [],
                max_drivers_per_day: 10,
                distribution_by_lead_source_enabled: false,
                distribution_by_lead_sources: [],
                distribution_by_campaign_enabled: false,
                distribution_by_campaigns: [],
                assigned_to_users: [],
                assigned_to_roles: [],
                active: true, // Default to active
            }];
        }
        // Load existing scenarios from backend
        return (ridingCompany.distribution_scenarios as any[]).map((scenario, index) => ({
            id: scenario.id || `scenario-${index + 1}`,
            distribution_from_users: scenario.distribution_from_users || [],
            max_drivers_per_day: scenario.max_drivers_per_day || 10,
            distribution_by_lead_source_enabled: scenario.distribution_by_lead_source_enabled || false,
            distribution_by_lead_sources: scenario.distribution_by_lead_sources || [],
            distribution_by_campaign_enabled: scenario.distribution_by_campaign_enabled || false,
            distribution_by_campaigns: scenario.distribution_by_campaigns || [],
            assigned_to_users: scenario.assigned_to_users || [],
            assigned_to_roles: scenario.assigned_to_roles || [],
            active: scenario.active !== undefined ? scenario.active : true, // Default to active if not set
        }));
    });

    const [savingDistribution, setSavingDistribution] = useState(false);
    const [originalScenarios, setOriginalScenarios] = useState<DistributionScenario[]>([]);
    const hasUnsavedChangesRef = useRef(false);

    // Track if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        if (originalScenarios.length === 0) {
            return false;
        }
        return normalizeScenarios(scenarios) !== normalizeScenarios(originalScenarios);
    }, [scenarios, originalScenarios]);

    // Track if we've initialized scenarios to prevent duplicate creation
    // Use a ref to track initialization per riding company ID
    const initializedRef = useRef<number | null>(null);
    
    // Initialize original scenarios when riding company data loads
    useEffect(() => {
        if (!ridingCompany.distribution_scenarios || (Array.isArray(ridingCompany.distribution_scenarios) && ridingCompany.distribution_scenarios.length === 0)) {
            const defaultScenario = [{
                id: 'scenario-1',
                distribution_from_users: [],
                max_drivers_per_day: 10,
                distribution_by_lead_source_enabled: false,
                distribution_by_lead_sources: [],
                distribution_by_campaign_enabled: false,
                distribution_by_campaigns: [],
                assigned_to_users: [],
                assigned_to_roles: [],
                active: true,
            }];
            setScenarios(defaultScenario);
            setOriginalScenarios(JSON.parse(JSON.stringify(defaultScenario)));
        } else if (ridingCompany.distribution_scenarios && Array.isArray(ridingCompany.distribution_scenarios)) {
            const mappedScenarios = (ridingCompany.distribution_scenarios as any[]).map((scenario, index) => ({
                id: scenario.id || `scenario-${index + 1}`,
                distribution_from_users: scenario.distribution_from_users || [],
                max_drivers_per_day: scenario.max_drivers_per_day || 10,
                distribution_by_lead_source_enabled: scenario.distribution_by_lead_source_enabled || false,
                distribution_by_lead_sources: scenario.distribution_by_lead_sources || [],
                distribution_by_campaign_enabled: scenario.distribution_by_campaign_enabled || false,
                distribution_by_campaigns: scenario.distribution_by_campaigns || [],
                assigned_to_users: scenario.assigned_to_users || [],
                assigned_to_roles: scenario.assigned_to_roles || [],
                active: scenario.active !== undefined ? scenario.active : true,
            }));
            setScenarios(mappedScenarios);
            setOriginalScenarios(JSON.parse(JSON.stringify(mappedScenarios)));
        }
    }, [ridingCompany.id, ridingCompany.distribution_scenarios]);

    // Show all users in the same company without exception (including fresh-Leads)
    const filteredAvailableUsers = useMemo(() => {
        return availableUsers; // Show all users without filtering
    }, [availableUsers]);

    // Handle adding new scenario
    const handleAddScenario = () => {
        const newScenarioId = `scenario-${Date.now()}`; // Use timestamp to ensure unique ID
        // Create deep copies of existing scenarios to prevent reference sharing
        const existingScenarios = scenarios.map(scenario => ({
            ...scenario,
            distribution_from_users: [...scenario.distribution_from_users],
            distribution_by_lead_sources: [...scenario.distribution_by_lead_sources],
            distribution_by_campaigns: [...scenario.distribution_by_campaigns],
            assigned_to_users: [...scenario.assigned_to_users],
            assigned_to_roles: [...scenario.assigned_to_roles],
        }));
        setScenarios([...existingScenarios, {
            id: newScenarioId,
            distribution_from_users: [],
            max_drivers_per_day: 10,
            distribution_by_lead_source_enabled: false,
            distribution_by_lead_sources: [],
            distribution_by_campaign_enabled: false,
            distribution_by_campaigns: [],
            assigned_to_users: [],
            assigned_to_roles: [],
            active: true, // Default to active
        }]);
    };

    // Handle updating a scenario
    const updateScenario = (scenarioId: string, updates: Partial<DistributionScenario>) => {
        setScenarios(scenarios.map(scenario => {
            if (scenario.id === scenarioId) {
                // Create a deep copy of the scenario and apply updates
                const updatedScenario = {
                    ...scenario,
                    ...updates,
                    // Deep copy arrays to prevent reference sharing
                    distribution_from_users: updates.distribution_from_users !== undefined 
                        ? [...(updates.distribution_from_users as number[])] 
                        : [...scenario.distribution_from_users],
                    distribution_by_lead_sources: updates.distribution_by_lead_sources !== undefined 
                        ? [...(updates.distribution_by_lead_sources as number[])] 
                        : [...scenario.distribution_by_lead_sources],
                    distribution_by_campaigns: updates.distribution_by_campaigns !== undefined 
                        ? [...(updates.distribution_by_campaigns as number[])] 
                        : [...scenario.distribution_by_campaigns],
                    assigned_to_users: updates.assigned_to_users !== undefined 
                        ? [...(updates.assigned_to_users as number[])] 
                        : [...scenario.assigned_to_users],
                    assigned_to_roles: updates.assigned_to_roles !== undefined 
                        ? [...(updates.assigned_to_roles as number[])] 
                        : [...scenario.assigned_to_roles],
                };
                return updatedScenario;
            }
            // Return a deep copy of other scenarios to prevent reference sharing
            return {
                ...scenario,
                distribution_from_users: [...scenario.distribution_from_users],
                distribution_by_lead_sources: [...scenario.distribution_by_lead_sources],
                distribution_by_campaigns: [...scenario.distribution_by_campaigns],
                assigned_to_users: [...scenario.assigned_to_users],
                assigned_to_roles: [...scenario.assigned_to_roles],
            };
        }));
    };

    // Handle removing a scenario
    const handleRemoveScenario = (scenarioId: string) => {
        setScenarios(scenarios.filter(scenario => scenario.id !== scenarioId));
    };

    // Handle distribution settings save (manual save with validation)
    const handleSaveDistribution = async () => {
        // Validate all scenarios
        const hasInvalidScenario = scenarios.some(scenario => 
            scenario.distribution_from_users.length === 0
        );
        
        if (hasInvalidScenario) {
            alert('Please select at least one user in "Distribution From User" for all scenarios.');
            return;
        }

        // Validate that each scenario has at least one assigned_to_users or assigned_to_roles
        const hasMissingAssignedTo = scenarios.some(scenario => 
            (scenario.assigned_to_users.length === 0 && scenario.assigned_to_roles.length === 0)
        );
        
        if (hasMissingAssignedTo) {
            alert('Please select at least one user or role in "Assigned To" for all scenarios.');
            return;
        }

        setSavingDistribution(true);
        try {
            // Create a deep copy of scenarios to preserve them
            const scenariosToSave = JSON.parse(JSON.stringify(scenarios));
            
            // Prepare scenarios data for backend - ensure all IDs are integers
            const scenariosToSend = scenarios.map(scenario => ({
                id: scenario.id && !scenario.id.toString().startsWith('scenario-') ? scenario.id : null, // Only send real IDs, not temporary ones
                distribution_from_users: scenario.distribution_from_users.map((id: any) => typeof id === 'string' ? parseInt(id) : id),
                max_drivers_per_day: scenario.max_drivers_per_day || 10,
                distribution_by_lead_source_enabled: scenario.distribution_by_lead_source_enabled || false,
                distribution_by_lead_sources: (scenario.distribution_by_lead_sources || []).map((id: any) => typeof id === 'string' ? parseInt(id) : id),
                distribution_by_campaign_enabled: scenario.distribution_by_campaign_enabled || false,
                distribution_by_campaigns: (scenario.distribution_by_campaigns || []).map((id: any) => typeof id === 'string' ? parseInt(id) : id),
                assigned_to_users: (scenario.assigned_to_users || []).map((id: any) => typeof id === 'string' ? parseInt(id) : id),
                assigned_to_roles: (scenario.assigned_to_roles || []).map((id: any) => typeof id === 'string' ? parseInt(id) : id),
                active: scenario.active !== undefined ? scenario.active : true,
            }));
            
            await router.put(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, {
                distribution_scenarios: scenariosToSend,
            }, {
                preserveScroll: true,
                preserveState: false, // Reload data to get updated scenarios from backend
                only: ['ridingCompany'], // Only reload ridingCompany prop
                onSuccess: () => {
                    // Data will be reloaded from backend automatically
                    // Update original scenarios to mark as saved
                    setOriginalScenarios(JSON.parse(JSON.stringify(scenarios)));
                    hasUnsavedChangesRef.current = false;
                },
                onError: (errors) => {
                    console.error('Error saving distribution settings:', errors);
                    // Show detailed error message
                    let errorMessage = 'Error saving distribution settings.';
                    if (errors && typeof errors === 'object') {
                        const errorArray = Object.values(errors).flat();
                        if (errorArray.length > 0) {
                            errorMessage = Array.isArray(errorArray) 
                                ? errorArray.join('\n')
                                : String(errorArray);
                        }
                    }
                    alert(errorMessage);
                    // Restore scenarios on error
                    setScenarios(scenariosToSave);
                },
                onFinish: () => {
                    setSavingDistribution(false);
                },
            });
        } catch (error) {
            console.error('Error saving distribution settings:', error);
            setSavingDistribution(false);
        }
    };

    // Track unsaved changes
    useEffect(() => {
        hasUnsavedChangesRef.current = hasUnsavedChanges;
    }, [hasUnsavedChanges]);

    // Warn user before leaving page if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChangesRef.current) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Handle tab change with unsaved changes warning
    const handleTabChange = (newTab: 'overview' | 'users' | 'rotation' | 'integrations') => {
        if (hasUnsavedChanges && activeTab === 'overview' && newTab !== 'overview') {
            if (!confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.')) {
                return;
            }
        }
        setActiveTab(newTab);
    };
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; requirement: { id: number; name: string } | null }>({
        open: false,
        requirement: null,
    });
    const [deleteStageDialog, setDeleteStageDialog] = useState<{ open: boolean; stage: { id: number; name: string } | null }>({
        open: false,
        stage: null,
    });
    const [userFilters, setUserFilters] = useState<Record<string, string>>({
        name: '',
        email: '',
        mobile1: '',
        mobile2: '',
        roles: '',
        status: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);

    const handleDeleteRequirement = (requirement: { id: number; name: string }) => {
        setDeleteDialog({ open: true, requirement });
    };

    const confirmDeleteRequirement = () => {
        if (deleteDialog.requirement) {
            router.delete(`/ridingcarcompanies/document-requirements/${deleteDialog.requirement.id}`, {
                onSuccess: () => {
                    router.reload({ only: ['ridingCompany'] });
                },
            });
        }
    };

    const handleDeleteStage = (stage: { id: number; name: string }) => {
        setDeleteStageDialog({ open: true, stage });
    };

    const confirmDeleteStage = () => {
        if (deleteStageDialog.stage) {
            router.delete(`/ridingcarcompanies/stage-templates/${deleteStageDialog.stage.id}`, {
                onSuccess: () => {
                    router.reload({ only: ['ridingCompany'] });
                },
            });
        }
    };

    const [deleteRidingCompanyDialog, setDeleteRidingCompanyDialog] = useState(false);

    const handleDelete = () => {
        setDeleteRidingCompanyDialog(true);
    };

    const handleToggleStatus = () => {
        router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/toggle-active`);
    };

    const handleUserFilterChange = (key: string, value: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: value === '__all__' ? '' : value,
        }));
    };

    const clearUserFilter = (key: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: '',
        }));
    };

    const filteredUsers = useMemo(() => {
        if (!users || users.length === 0) {
            return [];
        }

        return users.filter((user) => {
            const nameMatch = !userFilters.name || 
                user.name.toLowerCase().includes(userFilters.name.toLowerCase());
            
            const emailMatch = !userFilters.email || 
                user.email.toLowerCase().includes(userFilters.email.toLowerCase());
            
            const mobile1Match = !userFilters.mobile1 || 
                (user.mobile1 && user.mobile1.toLowerCase().includes(userFilters.mobile1.toLowerCase()));
            
            const mobile2Match = !userFilters.mobile2 || 
                (user.mobile2 && user.mobile2.toLowerCase().includes(userFilters.mobile2.toLowerCase()));
            
            const rolesMatch = !userFilters.roles || 
                userFilters.roles === '' ||
                (user.roles && user.roles.length > 0 && 
                    user.roles.some((r: any) => 
                        r.id.toString() === userFilters.roles
                    ));
            
            const statusMatch = !userFilters.status || 
                userFilters.status === '' ||
                (userFilters.status === 'active' && user.is_active) ||
                (userFilters.status === 'inactive' && !user.is_active);

            return nameMatch && emailMatch && mobile1Match && mobile2Match && rolesMatch && statusMatch;
        });
    }, [users, userFilters]);

    // Pagination
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [userFilters]);

    return (
        <AppLayout>
            <Head title={ridingCompany.name} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{ridingCompany.name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            ReSeller Details
                        </p>
                    </div>
                    {activeTab === 'overview' && (
                        <div className="flex gap-2">
                            <Link href="/ridingcarcompanies/riding-companies">
                                <Button variant="outline">Back to List</Button>
                            </Link>
                            <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/edit`}>
                                <Button variant="outline">Edit</Button>
                            </Link>
                            <Button variant="outline" onClick={handleToggleStatus}>
                                {ridingCompany.active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => handleTabChange('overview')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange('users')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'users'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" />
                                Users ({users.length})
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange('rotation')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'rotation'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Rotation
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange('integrations')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'integrations'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Plug className="h-4 w-4" />
                                Integrations
                            </div>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Company Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-500">Name</p>
                                <p className="font-medium">{ridingCompany.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500">Slug</p>
                                <p className="font-medium">{ridingCompany.slug}</p>
                            </div>
                            {ridingCompany.description && (
                                <div>
                                    <p className="text-sm text-neutral-500">Description</p>
                                    <p className="font-medium">{ridingCompany.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-neutral-500">Status</p>
                                <Badge variant={ridingCompany.active ? 'default' : 'secondary'}>
                                    {ridingCompany.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500">UUID</p>
                                <p className="font-mono text-xs">{ridingCompany.uuid}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
                        <div className="space-y-4">
                            {(ridingCompany.country || ridingCompany.city) && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Location</p>
                                        <p className="font-medium">
                                            {[ridingCompany.city, ridingCompany.country]
                                                .filter(Boolean)
                                                .join(', ') || '-'}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.contact_email && (
                                <div className="flex items-start gap-2">
                                    <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Email</p>
                                        <p className="font-medium">{ridingCompany.contact_email}</p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.contact_phone && (
                                <div className="flex items-start gap-2">
                                    <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Phone</p>
                                        <p className="font-medium">{ridingCompany.contact_phone}</p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.creator && (
                                <div className="flex items-start gap-2">
                                    <Building2 className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Created By</p>
                                        <p className="font-medium">{ridingCompany.creator.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Stage Templates</h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates`}
                                >
                                    <Button variant="outline" size="sm">
                                        View All
                                    </Button>
                                </Link>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                                >
                                    <Button size="sm">
                                        Create New Stage
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {ridingCompany.stage_templates && ridingCompany.stage_templates.length > 0 ? (
                            <div className="space-y-3">
                                {ridingCompany.stage_templates
                                    .sort((a, b) => a.order - b.order)
                                    .map((template) => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link
                                                        href={`/ridingcarcompanies/stage-templates/${template.id}/edit`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {template.name}
                                                    </Link>
                                                    <Badge variant={template.active ? 'default' : 'secondary'} className="text-xs">
                                                        {template.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                                    <div>
                                                        <span className="text-neutral-500">Order: </span>
                                                        <span className="font-medium">{template.order}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500">Target: </span>
                                                        <span className="font-medium">
                                                            {template.target_value} {template.target_unit}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500">Duration: </span>
                                                        <span className="font-medium">{template.duration_days} days</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {template.strict_sequence && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Strict
                                                            </Badge>
                                                        )}
                                                        {template.allow_cumulative && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Cumulative
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-4 flex items-center gap-2">
                                                <Link
                                                    href={`/ridingcarcompanies/stage-templates/${template.id}/edit`}
                                                >
                                                    <Button variant="ghost" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteStage({ id: template.id, name: template.name })}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p className="mb-4">No stage templates found.</p>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                                >
                                    <Button size="sm">Create First Stage Template</Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Document Requirements</h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements`}
                                >
                                    <Button variant="outline" size="sm">
                                        View All
                                    </Button>
                                </Link>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                                >
                                    <Button size="sm">
                                        Create New Requirement
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {ridingCompany.document_requirements && ridingCompany.document_requirements.length > 0 ? (
                            <div className="space-y-3">
                                {ridingCompany.document_requirements.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Link
                                                    href={`/ridingcarcompanies/document-requirements/${req.id}/edit`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {req.name}
                                                </Link>
                                                <Badge variant={req.active ? 'default' : 'secondary'} className="text-xs">
                                                    {req.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {req.type}
                                                </Badge>
                                                {req.required && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Required
                                                    </Badge>
                                                )}
                                                {!req.required && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Optional
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                            <Link
                                                href={`/ridingcarcompanies/document-requirements/${req.id}/edit`}
                                            >
                                                <Button variant="ghost" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteRequirement({ id: req.id, name: req.name })}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p className="mb-4">No document requirements found.</p>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                                >
                                    <Button size="sm">Create First Document Requirement</Button>
                                </Link>
                            </div>
                        )}

                        {/* Document Names from document_names table */}
                        {ridingCompany.document_names && ridingCompany.document_names.length > 0 && (
                            <div className="space-y-3 mt-4">
                                {ridingCompany.document_names.map((docName) => (
                                    <div
                                        key={`doc-name-${docName.id}`}
                                        className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Link
                                                    href={`/leads/lead-documents/${docName.id}/edit`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {docName.name}
                                                </Link>
                                                <Badge variant={docName.active ? 'default' : 'secondary'} className="text-xs">
                                                    {docName.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {docName.type || 'file'}
                                                </Badge>
                                                {docName.required && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Required
                                                    </Badge>
                                                )}
                                                {!docName.required && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Optional
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                            <Link
                                                href={`/leads/lead-documents/${docName.id}/edit`}
                                            >
                                                <Button variant="ghost" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {ridingCompany.integrations && ridingCompany.integrations.length > 0 && (
                        <Card className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Integrations</h2>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/integrations`}
                                >
                                    <Button variant="outline" size="sm">
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {ridingCompany.integrations.map((integration) => (
                                    <div
                                        key={integration.id}
                                        className="flex items-center justify-between rounded-md border p-2"
                                    >
                                        <div>
                                            <p className="font-medium capitalize">{integration.type}</p>
                                            <Badge
                                                variant={integration.active ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {integration.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {ridingCompany.integration_settings &&
                        ridingCompany.integration_settings.length > 0 && (
                            <Card className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Integration Settings</h2>
                                    <Link
                                        href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/integration-settings`}
                                    >
                                        <Button variant="outline" size="sm">
                                            Manage
                                        </Button>
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {ridingCompany.integration_settings.map((setting) => (
                                        <div
                                            key={setting.id}
                                            className="flex items-center justify-between rounded-md border p-2"
                                        >
                                            <div>
                                                <p className="font-medium capitalize">{setting.type}</p>
                                                <Badge
                                                    variant={setting.active ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {setting.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                    <Card className="p-6 md:col-span-2">
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-semibold">Distribution Settings</h2>
                                    {hasUnsavedChanges && (
                                        <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Unsaved changes
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Configure how leads are distributed among team members in this riding company. Don't forget to save your changes.
                                </p>
                                
                                <div className="space-y-6">
                                    {scenarios.map((scenario, index) => {
                                        // Color scheme for each scenario
                                        const colorSchemes = [
                                            { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', header: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300' },
                                            { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', header: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300' },
                                            { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', header: 'bg-green-500', text: 'text-green-700 dark:text-green-300' },
                                            { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', header: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300' },
                                            { border: 'border-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', header: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300' },
                                            { border: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', header: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
                                        ];
                                        const colorScheme = colorSchemes[index % colorSchemes.length];
                                        
                                        return (
                                        <Card key={scenario.id} data-scenario-id={scenario.id} className={`p-0 border-2 ${colorScheme.border} ${colorScheme.bg} transition-all shadow-lg hover:shadow-xl ${scenario.active !== false ? '' : 'opacity-60'}`}>
                                            <div className={`${colorScheme.header} text-white px-6 py-3 rounded-t-lg`}>
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-base font-semibold text-white">Scenario {index + 1}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-medium ${scenario.active !== false ? "text-white" : "text-white/70"}`}>
                                                            {scenario.active !== false ? "✓ Active" : "○ Inactive"}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => updateScenario(scenario.id, { active: !(scenario.active !== false) })}
                                                            className={scenario.active !== false ? "bg-white/20 hover:bg-white/30 text-white border-white/30" : "bg-white/10 hover:bg-white/20 text-white border-white/20"}
                                                        >
                                                            {scenario.active !== false ? "Deactivate" : "Activate"}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (scenarios.length === 1) {
                                                                    alert('You must have at least one scenario. Please add another scenario before deleting this one.');
                                                                    return;
                                                                }
                                                                if (confirm(`Are you sure you want to delete Scenario ${index + 1}?`)) {
                                                                    handleRemoveScenario(scenario.id);
                                                                }
                                                            }}
                                                            className="text-white hover:text-red-200 hover:bg-white/20"
                                                            title="Delete scenario"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Left Column */}
                                                <div className="space-y-4">
                                                    {/* Distribution From User - Required */}
                                                    <div>
                                                        <Label htmlFor={`distribution_from_users_${scenario.id}`} className="mb-2 block">
                                                            Distribution From User <span className="text-red-500">*</span>
                                                        </Label>
                                                        <MultiSelect
                                                            options={filteredAvailableUsers.map((user) => ({
                                                                value: user.id,
                                                                label: user.name,
                                                            }))}
                                                            value={scenario.distribution_from_users}
                                                            onChange={(value) => {
                                                                const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                                updateScenario(scenario.id, { distribution_from_users: newValue });
                                                            }}
                                                            placeholder="Select users..."
                                                            className="w-full"
                                                            searchable={true}
                                                        />
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                            Select users from whom leads will be distributed. You can select multiple users. This field is required.
                                                        </p>
                                                    </div>

                                                    {/* Distribution By Lead Source - Optional */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`distribution_by_lead_source_${scenario.id}`}
                                                                checked={scenario.distribution_by_lead_source_enabled}
                                                                onCheckedChange={(checked) => {
                                                                    updateScenario(scenario.id, { 
                                                                        distribution_by_lead_source_enabled: checked === true,
                                                                        distribution_by_lead_sources: checked === true ? scenario.distribution_by_lead_sources : []
                                                                    });
                                                                }}
                                                            />
                                                            <Label htmlFor={`distribution_by_lead_source_${scenario.id}`} className="cursor-pointer">
                                                                Distribution By Lead Source
                                                            </Label>
                                                        </div>
                                                        {scenario.distribution_by_lead_source_enabled && (
                                                            <MultiSelect
                                                                options={leadSources.map((source) => ({
                                                                    value: source.id,
                                                                    label: source.name,
                                                                }))}
                                                                value={scenario.distribution_by_lead_sources}
                                                                onChange={(value) => {
                                                                    const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                                    updateScenario(scenario.id, { distribution_by_lead_sources: newValue });
                                                                }}
                                                                placeholder="Select lead sources..."
                                                                className="w-full"
                                                                searchable={true}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Distribution By Campaign - Optional */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`distribution_by_campaign_${scenario.id}`}
                                                                checked={scenario.distribution_by_campaign_enabled}
                                                                onCheckedChange={(checked) => {
                                                                    updateScenario(scenario.id, { 
                                                                        distribution_by_campaign_enabled: checked === true,
                                                                        distribution_by_campaigns: checked === true ? scenario.distribution_by_campaigns : []
                                                                    });
                                                                }}
                                                            />
                                                            <Label htmlFor={`distribution_by_campaign_${scenario.id}`} className="cursor-pointer">
                                                                Distribution By Campaign
                                                            </Label>
                                                        </div>
                                                        {scenario.distribution_by_campaign_enabled && (
                                                            <MultiSelect
                                                                options={campaigns.map((campaign) => ({
                                                                    value: campaign.id,
                                                                    label: campaign.name,
                                                                }))}
                                                                value={scenario.distribution_by_campaigns}
                                                                onChange={(value) => {
                                                                    const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                                    updateScenario(scenario.id, { distribution_by_campaigns: newValue });
                                                                }}
                                                                placeholder="Select campaigns..."
                                                                className="w-full"
                                                                searchable={true}
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Column */}
                                                <div className="space-y-4">
                                                    {/* Max drivers per day per user */}
                                                    <div>
                                                        <Label htmlFor={`max_drivers_per_day_${scenario.id}`} className="mb-2 block">
                                                            Max drivers per day per user
                                                        </Label>
                                                        <Input
                                                            id={`max_drivers_per_day_${scenario.id}`}
                                                            type="number"
                                                            min="1"
                                                            value={scenario.max_drivers_per_day}
                                                            onChange={(e) => updateScenario(scenario.id, { max_drivers_per_day: parseInt(e.target.value) || 10 })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assigned To - Full Width */}
                                            <div className="mt-4">
                                                <Label htmlFor={`assigned_to_${scenario.id}`} className="mb-2 block">
                                                    Assigned To
                                                </Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-sm text-neutral-600 dark:text-neutral-400 mb-1 block">Users</Label>
                                                        <MultiSelect
                                                            options={filteredAvailableUsers.map((user) => ({
                                                                value: user.id,
                                                                label: user.name,
                                                            }))}
                                                            value={scenario.assigned_to_users}
                                                            onChange={(value) => {
                                                                const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                                updateScenario(scenario.id, { assigned_to_users: newValue });
                                                            }}
                                                            placeholder="Select users..."
                                                            className="w-full"
                                                            searchable={true}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm text-neutral-600 dark:text-neutral-400 mb-1 block">Roles</Label>
                                                        <MultiSelect
                                                            options={roles.map((role) => ({
                                                                value: role.id,
                                                                label: role.name,
                                                            }))}
                                                            value={scenario.assigned_to_roles}
                                                            onChange={(value) => {
                                                                const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                                updateScenario(scenario.id, { assigned_to_roles: newValue });
                                                            }}
                                                            placeholder="Select roles..."
                                                            className="w-full"
                                                            searchable={true}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                                    Select team members who will receive distributed drivers. You can select multiple users and/or roles. The fresh-Leads user is automatically excluded.
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                    When a role is selected, all users in that role will be included in the distribution, each with the maximum drivers per day limit.
                                                </p>
                                            </div>
                                            </div>
                                        </Card>
                                        );
                                    })}

                                    {/* Add Scenario Button */}
                                    <Button
                                        variant="outline"
                                        onClick={handleAddScenario}
                                        className="w-full border-2 border-dashed border-purple-400 hover:border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300 font-semibold transition-all shadow-md hover:shadow-lg py-6"
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        Add New Scenario
                                    </Button>

                                    {/* Save Button - only shown when there are unsaved changes */}
                                    {hasUnsavedChanges && (
                                    <Button
                                        onClick={handleSaveDistribution}
                                        disabled={savingDistribution}
                                        className="mt-4"
                                    >
                                        {savingDistribution ? 'Saving...' : 'Save Distribution Settings'}
                                    </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                )}

                {activeTab === 'users' && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">ReSeller Users</h2>
                        </div>
                        
                        {users && users.length > 0 ? (
                            <div>
                                {/* Pagination */}
                                {totalUsers > 0 && (
                                    <div className="mb-4 flex items-center justify-between border-b pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                                <select
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Page {currentPage} of {totalPages || 1}
                                            </div>
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Total: {totalUsers} user(s)
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage >= totalPages}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full">
                                        <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Mobile 1
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Mobile 2
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Company
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Roles
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Actions
                                                </th>
                                            </tr>
                                            <tr>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Name..."
                                                            value={userFilters.name}
                                                            onChange={(e) => handleUserFilterChange('name', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.name && (
                                                            <button
                                                                onClick={() => clearUserFilter('name')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Email..."
                                                            value={userFilters.email}
                                                            onChange={(e) => handleUserFilterChange('email', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.email && (
                                                            <button
                                                                onClick={() => clearUserFilter('email')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Mobile 1..."
                                                            value={userFilters.mobile1}
                                                            onChange={(e) => handleUserFilterChange('mobile1', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.mobile1 && (
                                                            <button
                                                                onClick={() => clearUserFilter('mobile1')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Mobile 2..."
                                                            value={userFilters.mobile2}
                                                            onChange={(e) => handleUserFilterChange('mobile2', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.mobile2 && (
                                                            <button
                                                                onClick={() => clearUserFilter('mobile2')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2"></th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Status..."
                                                            value={userFilters.status}
                                                            onChange={(e) => handleUserFilterChange('status', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.status && (
                                                            <button
                                                                onClick={() => clearUserFilter('status')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                            {paginatedUsers.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-4 py-8 text-center text-sm text-neutral-500"
                                                    >
                                                        No users found
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedUsers.map((user, index) => (
                                                    <tr
                                                        key={user.id}
                                                        className={`
                                                            transition-colors duration-150
                                                            ${
                                                                index === 0
                                                                    ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                    : index % 2 === 0
                                                                      ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                      : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                            }
                                                        `}
                                                    >
                                                        <td className="px-4 py-3 text-sm">{user.name}</td>
                                                        <td className="px-4 py-3 text-sm">{user.email}</td>
                                                        <td className="px-4 py-3 text-sm">{user.mobile1 || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">{user.mobile2 || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {user.company?.name || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {user.roles && user.roles.length > 0
                                                                ? user.roles.map((r: any) => r.name).join(', ')
                                                                : 'No roles'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                                {user.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            <div className="flex justify-end gap-2">
                                                                {can('core', 'users', 'read') && user.company_id && (
                                                                    <Link href={`/core/companies/${user.company_id}/users/${user.id}`}>
                                                                        <Button variant="ghost" size="sm">
                                                                            View
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                                {can('core', 'users', 'update') && user.company_id && (
                                                                    <Link href={`/core/companies/${user.company_id}/users/${user.id}/edit`}>
                                                                        <Button variant="ghost" size="sm">
                                                                            Edit
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No users found for this riding company.</p>
                            </div>
                        )}
                    </Card>
                )}


                {activeTab === 'rotation' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Rotation Settings</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Configure lead rotation rules and schedules for this riding company.
                                </p>
                                <div className="text-center py-12 text-neutral-500">
                                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Rotation settings coming soon...</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'integrations' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-2">WhatsApp Integration</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Connect WhatsApp to this riding company. Each riding company has its own WhatsApp session.
                                    Users in this riding company will see chats only for phone numbers they have access to.
                                </p>
                                <WhatsAppLinkDeviceRidingCompanyTab 
                                    ridingCompanyId={ridingCompany.id}
                                    defaultDriverUserId={ridingCompany.default_driver_user_id}
                                    defaultDriverUser={ridingCompany.default_driver_user}
                                    availableUsers={availableUsers || []}
                                    onUserChange={(userId, userName) => {
                                        router.put(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, {
                                            default_driver_user_id: userId,
                                        }, {
                                            preserveScroll: true,
                                            preserveState: false,
                                            onSuccess: (page) => {
                                                // The page will be reloaded automatically by Inertia::render() in the controller
                                                // No need for manual reload
                                            },
                                            onError: (errors) => {
                                                console.error('Error updating user:', errors);
                                            },
                                        });
                                    }}
                                />
                            </div>

                            <div className="border-t border-neutral-300/50 pt-6 mt-6">
                                <div className="bg-[#d0e7ff] rounded-lg p-6 text-neutral-800 dark:text-neutral-200">
                                    <h2 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Facebook Integration</h2>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                                        Connect your Facebook account. Any user can login with their Facebook account and access their own pages and leads.
                                    </p>
                                    <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook`}>
                                        <Button variant="outline" className="bg-white/80 hover:bg-white border-blue-300 text-blue-800">
                                            <Facebook className="h-4 w-4 mr-2" />
                                            Configure Facebook Integration
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            <DeleteDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ open, requirement: null })}
                onConfirm={confirmDeleteRequirement}
                title="Delete Document Requirement"
                description={`Are you sure you want to delete "${deleteDialog.requirement?.name}"? This action cannot be undone.`}
            />

            <DeleteDialog
                open={deleteStageDialog.open}
                onOpenChange={(open) => setDeleteStageDialog({ open, stage: null })}
                onConfirm={confirmDeleteStage}
                title="Delete Stage Template"
                description={`Are you sure you want to delete "${deleteStageDialog.stage?.name}"? This action cannot be undone.`}
            />

            <RidingCompanyDeleteDialog
                open={deleteRidingCompanyDialog}
                onOpenChange={setDeleteRidingCompanyDialog}
                ridingCompany={ridingCompany}
                availableRidingCompanies={availableRidingCompanies}
                usersCount={usersCount}
            />
        </AppLayout>
    );
}

