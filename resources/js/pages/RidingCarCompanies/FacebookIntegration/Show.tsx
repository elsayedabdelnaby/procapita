import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Facebook, CheckCircle2, AlertCircle, Loader2, RefreshCw, Plus, Pencil, Trash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface FacebookForm {
    form_id: string;
    campaign_id: string | null;
    field_mapping: Record<string, string>;
    name: string | null;
    status: string | null;
}

interface FacebookIntegrationProps {
    ridingCompany: {
        id: number;
        name: string;
    };
    integration: {
        id: number;
        type: string;
        active: boolean;
        facebook_user_id: string | null;
        facebook_page_id: string | null;
        facebook_form_id: string | null; // Backward compatibility
        facebook_field_mapping: Record<string, string> | null; // Backward compatibility
        facebook_forms?: FacebookForm[];
        has_access_token: boolean;
        facebook_user_name?: string | null;
    };
}

type Step = 'setup' | 'configure' | 'field-mapping';

export default function FacebookIntegrationShow({ ridingCompany, integration }: FacebookIntegrationProps) {
    const [currentStep, setCurrentStep] = useState<Step>('setup');
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    
    // Setup state
    const [hasToken, setHasToken] = useState(integration.has_access_token);
    
    // Configure state
    const [pages, setPages] = useState<Array<{ id: string; name: string; access_token?: string }>>([]);
    const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [availableForms, setAvailableForms] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [configuredForms, setConfiguredForms] = useState<FacebookForm[]>(integration.facebook_forms || []);
    const [selectedPageId, setSelectedPageId] = useState<string>(integration.facebook_page_id || '');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [selectedFormId, setSelectedFormId] = useState<string>('');
    const [loadingPages, setLoadingPages] = useState(false);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [loadingForms, setLoadingForms] = useState(false);
    
    // Field mapping state
    const [currentFormId, setCurrentFormId] = useState<string>('');
    const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type: string }>>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [loadingFields, setLoadingFields] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Initialize configured forms from integration
    useEffect(() => {
        if (integration.facebook_forms && integration.facebook_forms.length > 0) {
            setConfiguredForms(integration.facebook_forms);
            // Set current form to first form if not set
            if (!currentFormId && integration.facebook_forms.length > 0) {
                setCurrentFormId(integration.facebook_forms[0].form_id);
                setFieldMapping(integration.facebook_forms[0].field_mapping || {});
            }
        } else if (integration.facebook_form_id) {
            // Backward compatibility: convert old single form to new format
            const config = (integration as any).config || {};
            const form = {
                form_id: integration.facebook_form_id,
                campaign_id: config.facebook_campaign_id || null,
                field_mapping: integration.facebook_field_mapping || {},
                name: null,
                status: null,
            };
            setConfiguredForms([form]);
            setCurrentFormId(integration.facebook_form_id);
            setFieldMapping(integration.facebook_field_mapping || {});
        }
    }, [integration]);

    // Determine current step based on integration state
    useEffect(() => {
        if (!hasToken) {
            setCurrentStep('setup');
        } else if (!selectedPageId || configuredForms.length === 0) {
            setCurrentStep('configure');
        } else {
            setCurrentStep('field-mapping');
        }
    }, [hasToken, selectedPageId, configuredForms.length]);

    // Load pages when token is available
    useEffect(() => {
        if (hasToken && pages.length === 0) {
            loadPages();
        }
    }, [hasToken]);

    // Load campaigns when page is selected
    useEffect(() => {
        if (selectedPageId && campaigns.length === 0) {
            loadCampaigns();
        }
    }, [selectedPageId]);

    // Load forms when campaign is selected
    useEffect(() => {
        if (selectedCampaignId && availableForms.length === 0) {
            loadForms();
        }
    }, [selectedCampaignId]);

    // Auto-load forms from page if no campaigns are available after campaigns finish loading
    useEffect(() => {
        if (selectedPageId && !loadingCampaigns && campaigns.length === 0 && availableForms.length === 0 && !selectedCampaignId) {
            // Wait a bit to ensure campaigns have finished loading
            const timer = setTimeout(() => {
                loadFormsFromPage();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [selectedPageId, campaigns.length, loadingCampaigns, selectedCampaignId]);

    // Load form fields when current form is selected for mapping
    useEffect(() => {
        if (currentFormId && formFields.length === 0) {
            loadFormFields();
        }
    }, [currentFormId]);

    const handleConnectFacebook = async () => {
        setConnecting(true);
        try {
            const response = await axios.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/oauth-url`);

            if (response.data.success && response.data.url) {
                // Open Facebook OAuth in a popup window
                const width = 600;
                const height = 700;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;
                
                const popup = window.open(
                    response.data.url,
                    'Facebook OAuth',
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,directories=no,status=no`
                );

                if (!popup) {
                    alert('Please allow popups for this site to connect Facebook');
                    setConnecting(false);
                    return;
                }

                // Listen for popup to close or receive message
                const checkPopup = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopup);
                        setConnecting(false);
                        // Reload page to check if connection was successful
                        window.location.reload();
                    }
                }, 1000);

                // Listen for message from popup (if callback sends postMessage)
                const messageHandler = (event: MessageEvent) => {
                    // Accept messages from same origin
                    if (event.origin !== window.location.origin) return;
                    
                    console.log('Received message from popup:', event.data);
                    
                    if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS' || event.data.success === true) {
                        clearInterval(checkPopup);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        setConnecting(false);
                        window.removeEventListener('message', messageHandler);
                        window.location.reload();
                    } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR' || event.data.success === false) {
                        clearInterval(checkPopup);
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                        setConnecting(false);
                        window.removeEventListener('message', messageHandler);
                        alert(event.data.message || 'Failed to connect Facebook');
                    }
                };

                window.addEventListener('message', messageHandler);
            } else {
                throw new Error('No OAuth URL received from server');
            }
        } catch (error: any) {
            console.error('Error connecting Facebook:', error);
            console.error('Error response:', error.response);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error connecting to Facebook. Please make sure Facebook App ID and Redirect URI are configured in your .env file.';
            alert(errorMessage);
            setConnecting(false);
        }
    };

    const loadPages = async () => {
        setLoadingPages(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (!csrfToken) {
                alert('CSRF token not found. Please refresh the page and try again.');
                setLoadingPages(false);
                return;
            }

            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/pages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            // Check if response is OK
            if (!response.ok) {
                if (response.status === 419) {
                    alert('Session expired. Please refresh the page and try again.');
                    window.location.reload();
                    return;
                }
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error('Server returned non-JSON response. Please refresh the page.');
            }

            const data = await response.json();
            if (data.success && data.pages) {
                setPages(data.pages);
                if (data.pages.length === 0) {
                    alert('No Facebook pages found. Make sure you have pages associated with your Facebook account.');
                }
            } else {
                alert(data.error || 'Failed to load Facebook pages. Please try reconnecting your account.');
            }
        } catch (error: any) {
            console.error('Error loading pages:', error);
            alert('Error loading pages: ' + (error.message || 'Unknown error'));
        } finally {
            setLoadingPages(false);
        }
    };

    const loadCampaigns = async () => {
        if (!selectedPageId) return;
        
        setLoadingCampaigns(true);
        try {
            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ page_id: selectedPageId }),
            });

            const data = await response.json();
            if (data.success) {
                setCampaigns(data.campaigns || []);
                // Don't show alert if campaigns are empty - user can still select forms directly
            } else {
                // Only show error if it's a real error, not just empty campaigns
                if (data.error && !data.error.includes('No campaigns found') && !data.error.includes('No ad accounts')) {
                    alert(data.error || 'Failed to load campaigns. You can still select forms directly from the page.');
                }
                setCampaigns([]);
            }
        } catch (error: any) {
            console.error('Error loading campaigns:', error);
            // Don't show alert on error - user can still proceed without campaigns
            setCampaigns([]);
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const loadForms = async () => {
        if (!selectedCampaignId || !selectedPageId) return;
        
        setLoadingForms(true);
        try {
            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/forms-by-campaign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ campaign_id: selectedCampaignId, page_id: selectedPageId }),
            });

            const data = await response.json();
            if (data.success && data.forms) {
                setAvailableForms(data.forms);
                if (data.forms.length === 0) {
                    alert('No lead forms found for this campaign. Make sure you have created Lead Ads forms in Facebook Ads Manager.');
                }
            } else {
                alert(data.error || 'Failed to load forms. Please try selecting a different campaign.');
            }
        } catch (error: any) {
            console.error('Error loading forms:', error);
            alert('Error loading forms: ' + (error.message || 'Unknown error'));
        } finally {
            setLoadingForms(false);
        }
    };

    const loadFormsFromPage = async () => {
        if (!selectedPageId) return;
        
        setLoadingForms(true);
        try {
            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/forms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ page_id: selectedPageId }),
            });

            const data = await response.json();
            if (data.success && data.forms) {
                setAvailableForms(data.forms);
                if (data.forms.length === 0) {
                    alert('No lead forms found for this page. Make sure you have created Lead Ads forms in Facebook Ads Manager.');
                }
            } else {
                // Don't show error alert - just log it
                console.warn('Failed to load forms from page:', data.error);
            }
        } catch (error: any) {
            console.error('Error loading forms from page:', error);
            // Don't show alert - user can still proceed
        } finally {
            setLoadingForms(false);
        }
    };

    const loadFormFields = async () => {
        if (!currentFormId || !selectedPageId) return;
        
        setLoadingFields(true);
        try {
            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/form-fields`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ form_id: currentFormId, page_id: selectedPageId }),
            });

            const data = await response.json();
            if (data.success && data.fields) {
                // Filter out fields with empty or invalid keys
                const validFields = data.fields.filter((field: { key: string; label: string; type: string }) => 
                    field.key && field.key.trim() !== ''
                );
                setFormFields(validFields);
                if (validFields.length === 0) {
                    alert('No valid fields found in this form. The form might be empty or there was an error loading it.');
                }
            } else {
                alert(data.error || 'Failed to load form fields. Please try selecting a different form.');
            }
        } catch (error: any) {
            console.error('Error loading form fields:', error);
            alert('Error loading form fields: ' + (error.message || 'Unknown error'));
        } finally {
            setLoadingFields(false);
        }
    };

    const handleAddForm = async () => {
        if (!selectedPageId || !selectedFormId) {
            alert('Please select page and form');
            return;
        }

        // Campaign is optional - use empty string if not selected
        if (!selectedCampaignId && campaigns.length > 0) {
            alert('Please select a campaign, or wait for forms to load directly from the page');
            return;
        }

        // Check if form is already added
        const existingForm = configuredForms.find(f => f.form_id === selectedFormId);
        if (existingForm) {
            alert('This form is already added');
            return;
        }

        setLoading(true);
        try {
            const selectedForm = availableForms.find(f => f.id === selectedFormId);
            await router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/configuration`, {
                page_id: selectedPageId,
                campaign_id: selectedCampaignId || '', // Campaign is optional
                form_id: selectedFormId,
                form_name: selectedForm?.name || null,
                form_status: selectedForm?.status || null,
            }, {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Reload to get updated forms
                    router.reload({ only: ['integration'] });
                    // Reset selections
                    setSelectedCampaignId('');
                    setSelectedFormId('');
                    setAvailableForms([]);
                },
            });
        } catch (error) {
            console.error('Error adding form:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveForm = async (formId: string) => {
        if (!confirm('Are you sure you want to remove this form?')) {
            return;
        }

        setLoading(true);
        try {
            await router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/remove-form`, {
                form_id: formId,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['integration'] });
                },
            });
        } catch (error) {
            console.error('Error removing form:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFieldMapping = async () => {
        if (!currentFormId) {
            alert('Please select a form to map fields');
            return;
        }

        setLoading(true);
        try {
            await router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/field-mapping`, {
                field_mapping: fieldMapping,
                form_id: currentFormId,
                page_id: selectedPageId,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    alert('Field mapping saved successfully!');
                    router.reload({ only: ['integration'] });
                },
            });
        } catch (error) {
            console.error('Error saving field mapping:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFormForMapping = (formId: string) => {
        setCurrentFormId(formId);
        const form = configuredForms.find(f => f.form_id === formId);
        if (form) {
            setFieldMapping(form.field_mapping || {});
            setFormFields([]); // Reset to load new form fields
        }
    };

    const handleSyncLeads = async () => {
        setSyncing(true);
        try {
            const response = await fetch(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook/sync-leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message || 'Leads synced successfully!');
            } else {
                alert(data.error || 'Failed to sync leads');
            }
        } catch (error) {
            console.error('Error syncing leads:', error);
            alert('Error syncing leads');
        } finally {
            setSyncing(false);
        }
    };

    // Driver fields for mapping - all available fields
    const driverFields = [
        { value: 'full_name', label: 'Full Name', required: true },
        { value: 'phone', label: 'Phone', required: true },
        { value: 'whatsapp_phone', label: 'WhatsApp Phone', required: false },
        { value: 'email', label: 'Email', required: false },
        { value: 'city', label: 'City', required: false },
        { value: 'worked_with_us_before', label: 'Worked With Us Before', required: false },
        { value: 'vehicle_type_and_year', label: 'Vehicle Type and Year', required: false },
        { value: 'notes', label: 'Notes', required: false },
    ];

    return (
        <AppLayout>
            <Head title={`Facebook Integration - ${ridingCompany.name}`} />
            
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Facebook className="h-6 w-6 text-blue-600" />
                        Facebook Integration
                    </h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        Connect your Facebook account to this riding company. Any user can login with their Facebook account and access their own pages and leads.
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 text-sm">
                    <div className={`flex items-center gap-2 ${currentStep === 'setup' ? 'text-blue-600 font-semibold' : hasToken ? 'text-green-600' : 'text-neutral-500'}`}>
                        {currentStep !== 'setup' && hasToken ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-current" />
                        )}
                        Setup
                    </div>
                    <span className="text-neutral-400">›</span>
                    <div className={`flex items-center gap-2 ${currentStep === 'configure' ? 'text-blue-600 font-semibold' : currentStep === 'field-mapping' ? 'text-green-600' : 'text-neutral-500'}`}>
                        {currentStep === 'field-mapping' ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-current" />
                        )}
                        Configure
                    </div>
                    <span className="text-neutral-400">›</span>
                    <div className={`flex items-center gap-2 ${currentStep === 'field-mapping' ? 'text-blue-600 font-semibold' : 'text-neutral-500'}`}>
                        <div className="h-4 w-4 rounded-full border-2 border-current" />
                        Field Mapping
                    </div>
                </div>

                {/* Step 1: Setup */}
                {currentStep === 'setup' && (
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-base font-medium mb-2 block">App</Label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                                        Facebook Lead Ads (1.1.8)
                                    </div>
                                    <Button variant="outline" size="sm">Change</Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-base font-medium mb-2 block">Trigger event</Label>
                                <Select defaultValue="new_lead" disabled>
                                    <SelectTrigger>
                                        <SelectValue>New Lead</SelectValue>
                                    </SelectTrigger>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-base font-medium mb-2 block">Account</Label>
                                {hasToken ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-md flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <span>
                                                    {integration.facebook_user_name 
                                                        ? `Connected as ${integration.facebook_user_name}`
                                                        : 'Facebook Account Connected'}
                                                </span>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleConnectFacebook}>
                                                Reconnect
                                            </Button>
                                        </div>
                                        {integration.facebook_user_id && (
                                            <p className="text-xs text-neutral-500">
                                                User ID: {integration.facebook_user_id}
                                            </p>
                                        )}
                                        <p className="text-xs text-neutral-500">
                                            Facebook Lead Ads (1.1.8) is a secure partner. Your credentials are encrypted and can be removed at any time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Button
                                            onClick={handleConnectFacebook}
                                            disabled={connecting}
                                            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white border-0"
                                        >
                                            {connecting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <Facebook className="h-4 w-4 mr-2" />
                                                    Connect Facebook Account
                                                </>
                                            )}
                                        </Button>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex gap-2">
                                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                                Ensure you have sufficient permissions to connect your Facebook account. Depending on your account type, you may need to use Facebook Lead Ads (for Business admins) instead.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasToken && (
                                <Button
                                    onClick={() => setCurrentStep('configure')}
                                    className="w-full"
                                >
                                    Continue
                                </Button>
                            )}
                        </div>
                    </Card>
                )}

                {/* Step 2: Configure */}
                {currentStep === 'configure' && (
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    When you update a form, Facebook assigns a new form ID. You must reselect it from the dropdown menu.
                                </p>
                            </div>

                            <div>
                                <Label className="text-base font-medium mb-2 block">Page</Label>
                                <Select
                                    value={selectedPageId}
                                    onValueChange={(value) => {
                                        setSelectedPageId(value);
                                        setSelectedCampaignId('');
                                        setSelectedFormId('');
                                        setCampaigns([]);
                                        setAvailableForms([]);
                                    }}
                                    disabled={loadingPages}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingPages ? "Loading pages..." : "Select a page"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pages.map((page) => (
                                            <SelectItem key={page.id} value={page.id}>
                                                {page.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {campaigns.length > 0 && (
                                <div>
                                    <Label className="text-base font-medium mb-2 block">Campaign (Optional)</Label>
                                    <Select
                                        value={selectedCampaignId}
                                        onValueChange={(value) => {
                                            setSelectedCampaignId(value);
                                            setSelectedFormId('');
                                            setAvailableForms([]);
                                        }}
                                        disabled={!selectedPageId || loadingCampaigns}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingCampaigns ? "Loading campaigns..." : selectedPageId ? "Select a campaign (optional)" : "Select a page first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- All Forms (No Campaign Filter) --</SelectItem>
                                            {campaigns.map((campaign) => (
                                                <SelectItem key={campaign.id} value={campaign.id}>
                                                    {campaign.name} ({campaign.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Select a campaign to filter forms, or leave empty to see all forms from the page.
                                    </p>
                                </div>
                            )}

                            {campaigns.length === 0 && selectedPageId && !loadingCampaigns && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        No campaigns found. Forms will be loaded directly from the page below.
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label className="text-base font-medium mb-2 block">Form</Label>
                                <Select
                                    value={selectedFormId}
                                    onValueChange={(value) => {
                                        setSelectedFormId(value);
                                    }}
                                    disabled={!selectedPageId || loadingForms}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            loadingForms 
                                                ? "Loading forms..." 
                                                : !selectedPageId 
                                                    ? "Select a page first" 
                                                    : campaigns.length > 0 && !selectedCampaignId
                                                        ? "Select a campaign or wait for forms to load"
                                                        : "Select a form"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableForms.filter((form) => form.id && form.id !== '').map((form) => (
                                            <SelectItem key={form.id} value={form.id}>
                                                {form.name} ({form.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {campaigns.length === 0 && selectedPageId && (
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Forms are loaded directly from the page.
                                    </p>
                                )}
                            </div>

                            <Button
                                onClick={handleAddForm}
                                disabled={!selectedPageId || !selectedFormId || loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Form
                                    </>
                                )}
                            </Button>

                            {/* Configured Forms List */}
                            {configuredForms.length > 0 && (
                                <div className="mt-6">
                                    <Label className="text-base font-medium mb-3 block">Configured Forms ({configuredForms.length})</Label>
                                    <div className="space-y-2">
                                        {configuredForms.map((form) => (
                                            <div key={form.form_id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md border">
                                                <div className="flex-1">
                                                    <p className="font-medium">{form.name || `Form ${form.form_id}`}</p>
                                                    <p className="text-xs text-neutral-500">ID: {form.form_id}</p>
                                                    {form.status && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {form.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setCurrentFormId(form.form_id);
                                                            setFieldMapping(form.field_mapping || {});
                                                            setFormFields([]);
                                                            setCurrentStep('field-mapping');
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" />
                                                        Map Fields
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRemoveForm(form.form_id)}
                                                        disabled={loading}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() => setCurrentStep('field-mapping')}
                                        disabled={configuredForms.length === 0}
                                        className="w-full mt-4"
                                    >
                                        Continue to Field Mapping
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Step 3: Field Mapping */}
                {currentStep === 'field-mapping' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            {/* Form Selector */}
                            {configuredForms.length > 1 && (
                                <div>
                                    <Label className="text-base font-medium mb-2 block">Select Form to Map</Label>
                                    <Select
                                        value={currentFormId}
                                        onValueChange={handleSelectFormForMapping}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a form to map fields" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {configuredForms.map((form) => (
                                                <SelectItem key={form.form_id} value={form.form_id}>
                                                    {form.name || `Form ${form.form_id}`} {form.status && `(${form.status})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {!currentFormId && configuredForms.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        {configuredForms.length === 1 
                                            ? 'Please wait while form fields are loaded...'
                                            : 'Please select a form above to map its fields.'}
                                    </p>
                                </div>
                            )}

                            {currentFormId && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Mapping fields for: <strong>{configuredForms.find(f => f.form_id === currentFormId)?.name || currentFormId}</strong>
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                {/* Facebook Form Fields */}
                                <div>
                                    <Label className="text-base font-medium mb-3 block">Facebook Form Fields</Label>
                                    <div className="space-y-3">
                                        {!currentFormId ? (
                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 text-center">
                                                <p className="text-sm text-neutral-500">Select a form to see its fields.</p>
                                            </div>
                                        ) : loadingFields ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                                            </div>
                                        ) : formFields.length > 0 ? (
                                            formFields.map((field, index) => (
                                                <div key={field.key || `field-${index}`} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{field.label}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {field.type}
                                                                </Badge>
                                                                <p className="text-xs text-neutral-500">Key: {field.key || '(no key)'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 text-center">
                                                <p className="text-sm text-neutral-500">No fields found. Please select a form first.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CRM Driver Fields Mapping */}
                                <div>
                                    <Label className="text-base font-medium mb-3 block">Map to CRM Driver Fields</Label>
                                    <div className="space-y-3">
                                        {!currentFormId ? (
                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 text-center">
                                                <p className="text-sm text-neutral-500">Select a form to see mapping options.</p>
                                            </div>
                                        ) : formFields.length > 0 ? (
                                            formFields.map((field, index) => {
                                                const mappedField = fieldMapping[field.key];
                                                const driverField = driverFields.find(f => f.value === mappedField);
                                                return (
                                                    <div key={field.key || `mapping-${index}`} className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-sm font-medium flex-1">
                                                                {field.label}
                                                                {driverField?.required && (
                                                                    <span className="text-red-500 ml-1">*</span>
                                                                )}
                                                            </Label>
                                                        </div>
                                                        <Select
                                                            value={mappedField && mappedField !== '' ? mappedField : '__none__'}
                                                            onValueChange={(value) => {
                                                                setFieldMapping({
                                                                    ...fieldMapping,
                                                                    [field.key]: value === '__none__' ? '' : value,
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select CRM field..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- Don't map --</SelectItem>
                                                                {driverFields.filter((driverField) => driverField.value && driverField.value !== '').map((driverField) => (
                                                                    <SelectItem key={driverField.value} value={driverField.value}>
                                                                        {driverField.label}
                                                                        {driverField.required && (
                                                                            <span className="text-red-500 ml-1">*</span>
                                                                        )}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {mappedField && mappedField !== '' && (
                                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                                ✓ Mapped to {driverField?.label || mappedField}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 text-center">
                                                <p className="text-sm text-neutral-500">Select a form to see mapping options.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSaveFieldMapping}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Field Mapping'
                                    )}
                                </Button>
                                <Button
                                    onClick={handleSyncLeads}
                                    disabled={syncing}
                                    variant="outline"
                                >
                                    {syncing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Sync Leads
                                        </>
                                    )}
                                </Button>
                            </div>

                            {integration.active && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 flex gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-green-800 dark:text-green-200">
                                        Facebook integration is active. New leads will be automatically synced.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

