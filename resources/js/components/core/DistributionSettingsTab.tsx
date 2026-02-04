import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { router } from '@inertiajs/react';
import { AlertCircle, Plus, Trash } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface DistributionScenario {
    id: string;
    distribution_from_users: number[];
    max_drivers_per_day: number;
    distribution_by_lead_source_enabled: boolean;
    distribution_by_lead_sources: number[];
    distribution_by_campaign_enabled: boolean;
    distribution_by_campaigns: number[];
    assigned_to_users: number[];
    assigned_to_roles: number[];
    active?: boolean;
}

export interface DistributionSettingsTabProps {
    ridingCompany: {
        id: number;
        name: string;
        distribution_scenarios?: DistributionScenario[] | unknown[];
    };
    availableUsers: Array<{ id: number; name: string; email?: string }>;
    leadSources: Array<{ id: number; name: string }>;
    campaigns: Array<{ id: number; name: string }>;
    roles: Array<{ id: number; name: string }>;
    /** When provided (e.g. 'selectedRidingCompanyData'), reload only this key after save for embedded use */
    partialReloadKey?: string;
    /** Optional label for "drivers" (e.g. "Leads" in demo reseller mode) */
    driverLabel?: string;
}

const normalizeScenarios = (scenarios: DistributionScenario[]): string => {
    return JSON.stringify(
        scenarios.map((s) => ({
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
        }))
    );
};

export function DistributionSettingsTab({
    ridingCompany,
    availableUsers,
    leadSources,
    campaigns,
    roles,
    partialReloadKey,
    driverLabel = 'drivers',
}: DistributionSettingsTabProps) {
    const rawScenarios = ridingCompany.distribution_scenarios;
    const hasScenarios = Array.isArray(rawScenarios) && rawScenarios.length > 0;

    const initialScenarios = (): DistributionScenario[] => {
        if (!hasScenarios) {
            return [
                {
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
                },
            ];
        }
        return (rawScenarios as DistributionScenario[]).map((scenario, index) => ({
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
    };

    const [scenarios, setScenarios] = useState<DistributionScenario[]>(initialScenarios);
    const [savingDistribution, setSavingDistribution] = useState(false);
    const [originalScenarios, setOriginalScenarios] = useState<DistributionScenario[]>(initialScenarios);
    const hasUnsavedChangesRef = useRef(false);

    const hasUnsavedChanges = useMemo(
        () =>
            originalScenarios.length === 0 ? false : normalizeScenarios(scenarios) !== normalizeScenarios(originalScenarios),
        [scenarios, originalScenarios]
    );

    const scenariosKey = ridingCompany.id + '-' + (hasScenarios ? JSON.stringify(rawScenarios) : 'empty');
    useEffect(() => {
        const next = initialScenarios();
        setScenarios(next);
        setOriginalScenarios(JSON.parse(JSON.stringify(next)));
    }, [scenariosKey]);

    const handleAddScenario = () => {
        const newScenarioId = `scenario-${Date.now()}`;
        setScenarios((prev) => [
            ...prev.map((s) => ({
                ...s,
                distribution_from_users: [...s.distribution_from_users],
                distribution_by_lead_sources: [...(s.distribution_by_lead_sources || [])],
                distribution_by_campaigns: [...(s.distribution_by_campaigns || [])],
                assigned_to_users: [...(s.assigned_to_users || [])],
                assigned_to_roles: [...(s.assigned_to_roles || [])],
            })),
            {
                id: newScenarioId,
                distribution_from_users: [],
                max_drivers_per_day: 10,
                distribution_by_lead_source_enabled: false,
                distribution_by_lead_sources: [],
                distribution_by_campaign_enabled: false,
                distribution_by_campaigns: [],
                assigned_to_users: [],
                assigned_to_roles: [],
                active: true,
            },
        ]);
    };

    const updateScenario = (scenarioId: string, updates: Partial<DistributionScenario>) => {
        setScenarios((prev) =>
            prev.map((scenario) => {
                if (scenario.id !== scenarioId) {
                    return {
                        ...scenario,
                        distribution_from_users: [...scenario.distribution_from_users],
                        distribution_by_lead_sources: [...(scenario.distribution_by_lead_sources || [])],
                        distribution_by_campaigns: [...(scenario.distribution_by_campaigns || [])],
                        assigned_to_users: [...(scenario.assigned_to_users || [])],
                        assigned_to_roles: [...(scenario.assigned_to_roles || [])],
                    };
                }
                return {
                    ...scenario,
                    ...updates,
                    distribution_from_users:
                        updates.distribution_from_users !== undefined
                            ? [...(updates.distribution_from_users as number[])]
                            : [...scenario.distribution_from_users],
                    distribution_by_lead_sources:
                        updates.distribution_by_lead_sources !== undefined
                            ? [...(updates.distribution_by_lead_sources as number[])]
                            : [...(scenario.distribution_by_lead_sources || [])],
                    distribution_by_campaigns:
                        updates.distribution_by_campaigns !== undefined
                            ? [...(updates.distribution_by_campaigns as number[])]
                            : [...(scenario.distribution_by_campaigns || [])],
                    assigned_to_users:
                        updates.assigned_to_users !== undefined
                            ? [...(updates.assigned_to_users as number[])]
                            : [...(scenario.assigned_to_users || [])],
                    assigned_to_roles:
                        updates.assigned_to_roles !== undefined
                            ? [...(updates.assigned_to_roles as number[])]
                            : [...(scenario.assigned_to_roles || [])],
                };
            })
        );
    };

    const handleRemoveScenario = (scenarioId: string) => {
        setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    };

    const handleSaveDistribution = () => {
        const hasInvalidScenario = scenarios.some((s) => s.distribution_from_users.length === 0);
        if (hasInvalidScenario) {
            alert('Please select at least one user in "Distribution From User" for all scenarios.');
            return;
        }
        const hasMissingAssignedTo = scenarios.some(
            (s) => (s.assigned_to_users?.length ?? 0) === 0 && (s.assigned_to_roles?.length ?? 0) === 0
        );
        if (hasMissingAssignedTo) {
            alert('Please select at least one user or role in "Assigned To" for all scenarios.');
            return;
        }

        setSavingDistribution(true);
        const scenariosToSend = scenarios.map((scenario) => ({
            id: scenario.id && !scenario.id.toString().startsWith('scenario-') ? scenario.id : null,
            distribution_from_users: (scenario.distribution_from_users || []).map((id: number) =>
                typeof id === 'string' ? parseInt(String(id), 10) : id
            ),
            max_drivers_per_day: scenario.max_drivers_per_day || 10,
            distribution_by_lead_source_enabled: scenario.distribution_by_lead_source_enabled || false,
            distribution_by_lead_sources: (scenario.distribution_by_lead_sources || []).map((id: number) =>
                typeof id === 'string' ? parseInt(String(id), 10) : id
            ),
            distribution_by_campaign_enabled: scenario.distribution_by_campaign_enabled || false,
            distribution_by_campaigns: (scenario.distribution_by_campaigns || []).map((id: number) =>
                typeof id === 'string' ? parseInt(String(id), 10) : id
            ),
            assigned_to_users: (scenario.assigned_to_users || []).map((id: number) =>
                typeof id === 'string' ? parseInt(String(id), 10) : id
            ),
            assigned_to_roles: (scenario.assigned_to_roles || []).map((id: number) =>
                typeof id === 'string' ? parseInt(String(id), 10) : id
            ),
            active: scenario.active !== undefined ? scenario.active : true,
        }));

        router.put(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, { distribution_scenarios: scenariosToSend }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setOriginalScenarios(JSON.parse(JSON.stringify(scenarios)));
                hasUnsavedChangesRef.current = false;
            },
            onError: (errors) => {
                const msg =
                    typeof errors === 'object' && errors !== null
                        ? Object.values(errors).flat().join('\n')
                        : 'Error saving distribution settings.';
                alert(msg);
            },
            onFinish: () => setSavingDistribution(false),
        });
    };

    const colorSchemes = [
        { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', header: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300' },
        { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', header: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300' },
        { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', header: 'bg-green-500', text: 'text-green-700 dark:text-green-300' },
        { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', header: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300' },
        { border: 'border-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', header: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300' },
        { border: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', header: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Distribution Settings</h2>
                {hasUnsavedChanges && (
                    <span className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-4 w-4" />
                        Unsaved changes
                    </span>
                )}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Configure how leads are distributed among team members. Don&apos;t forget to save your changes.
            </p>

            <div className="space-y-6">
                {scenarios.map((scenario, index) => {
                    const colorScheme = colorSchemes[index % colorSchemes.length];
                    return (
                        <Card
                            key={scenario.id}
                            className={`border-2 p-0 transition-all shadow-lg hover:shadow-xl ${colorScheme.border} ${colorScheme.bg} ${scenario.active !== false ? '' : 'opacity-60'}`}
                        >
                            <div className={`${colorScheme.header} rounded-t-lg px-6 py-3 text-white`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-white">Scenario {index + 1}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${scenario.active !== false ? 'text-white' : 'text-white/70'}`}>
                                            {scenario.active !== false ? '✓ Active' : '○ Inactive'}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateScenario(scenario.id, { active: scenario.active === false })}
                                            className={scenario.active !== false ? 'border-white/30 bg-white/20 text-white hover:bg-white/30' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}
                                        >
                                            {scenario.active !== false ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (scenarios.length === 1) {
                                                    alert('You must have at least one scenario.');
                                                    return;
                                                }
                                                if (confirm(`Delete Scenario ${index + 1}?`)) handleRemoveScenario(scenario.id);
                                            }}
                                            className="text-white hover:bg-white/20 hover:text-red-200"
                                            title="Delete scenario"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="mb-2 block">
                                                Distribution From User <span className="text-red-500">*</span>
                                            </Label>
                                            <MultiSelect
                                                options={availableUsers.map((u) => ({ value: u.id, label: u.name }))}
                                                value={scenario.distribution_from_users}
                                                onChange={(value) =>
                                                    updateScenario(scenario.id, {
                                                        distribution_from_users: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
                                                    })
                                                }
                                                placeholder="Select users..."
                                                className="w-full"
                                                searchable
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`distribution_by_lead_source_${scenario.id}`}
                                                    checked={scenario.distribution_by_lead_source_enabled}
                                                    onCheckedChange={(checked) =>
                                                        updateScenario(scenario.id, {
                                                            distribution_by_lead_source_enabled: checked === true,
                                                            distribution_by_lead_sources: checked === true ? scenario.distribution_by_lead_sources : [],
                                                        })
                                                    }
                                                />
                                                <Label htmlFor={`distribution_by_lead_source_${scenario.id}`} className="cursor-pointer">
                                                    Distribution By Lead Source
                                                </Label>
                                            </div>
                                            {scenario.distribution_by_lead_source_enabled && (
                                                <MultiSelect
                                                    options={leadSources.map((s) => ({ value: s.id, label: s.name }))}
                                                    value={scenario.distribution_by_lead_sources}
                                                    onChange={(value) =>
                                                        updateScenario(scenario.id, {
                                                            distribution_by_lead_sources: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
                                                        })
                                                    }
                                                    placeholder="Select lead sources..."
                                                    className="w-full"
                                                    searchable
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`distribution_by_campaign_${scenario.id}`}
                                                    checked={scenario.distribution_by_campaign_enabled}
                                                    onCheckedChange={(checked) =>
                                                        updateScenario(scenario.id, {
                                                            distribution_by_campaign_enabled: checked === true,
                                                            distribution_by_campaigns: checked === true ? scenario.distribution_by_campaigns : [],
                                                        })
                                                    }
                                                />
                                                <Label htmlFor={`distribution_by_campaign_${scenario.id}`} className="cursor-pointer">
                                                    Distribution By Campaign
                                                </Label>
                                            </div>
                                            {scenario.distribution_by_campaign_enabled && (
                                                <MultiSelect
                                                    options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
                                                    value={scenario.distribution_by_campaigns}
                                                    onChange={(value) =>
                                                        updateScenario(scenario.id, {
                                                            distribution_by_campaigns: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
                                                        })
                                                    }
                                                    placeholder="Select campaigns..."
                                                    className="w-full"
                                                    searchable
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="mb-2 block">Max {driverLabel} per day per user</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={scenario.max_drivers_per_day}
                                                onChange={(e) =>
                                                    updateScenario(scenario.id, {
                                                        max_drivers_per_day: parseInt(e.target.value, 10) || 10,
                                                    })
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Label className="mb-2 block">Assigned To</Label>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Users</Label>
                                            <MultiSelect
                                                options={availableUsers.map((u) => ({ value: u.id, label: u.name }))}
                                                value={scenario.assigned_to_users || []}
                                                onChange={(value) =>
                                                    updateScenario(scenario.id, {
                                                        assigned_to_users: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
                                                    })
                                                }
                                                placeholder="Select users..."
                                                className="w-full"
                                                searchable
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Roles</Label>
                                            <MultiSelect
                                                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                                                value={scenario.assigned_to_roles || []}
                                                onChange={(value) =>
                                                    updateScenario(scenario.id, {
                                                        assigned_to_roles: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
                                                    })
                                                }
                                                placeholder="Select roles..."
                                                className="w-full"
                                                searchable
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                        Select team members who will receive distributed {driverLabel}. You can select multiple users and/or roles.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                <Button
                    variant="outline"
                    onClick={handleAddScenario}
                    className="w-full border-2 border-dashed border-purple-400 py-6 font-semibold text-purple-700 hover:border-purple-500 hover:from-purple-100 hover:to-pink-100 dark:text-purple-300 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Scenario
                </Button>

                {hasUnsavedChanges && (
                    <Button onClick={handleSaveDistribution} disabled={savingDistribution} className="mt-4">
                        {savingDistribution ? 'Saving...' : 'Save Distribution Settings'}
                    </Button>
                )}
            </div>
        </div>
    );
}
