import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { Facebook, Loader2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FacebookIntegrationTabProps {
    ridingCompanyId: number;
}

interface FacebookIntegration {
    id?: number;
    riding_company_id: number;
    app_id: string | null;
    app_secret: string | null;
    access_token: string | null;
    page_id: string | null;
    page_name: string | null;
    status: 'disconnected' | 'connected';
    last_connected_at: string | null;
}

export function FacebookIntegrationTab({ ridingCompanyId }: FacebookIntegrationTabProps) {
    const [integration, setIntegration] = useState<FacebookIntegration | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        app_id: '',
        app_secret: '',
        page_id: '',
    });

    const fetchIntegration = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`/facebook/riding-companies/${ridingCompanyId}/integration`);
            setIntegration(response.data.integration);
            if (response.data.integration) {
                setFormData({
                    app_id: response.data.integration.app_id || '',
                    app_secret: response.data.integration.app_secret || '',
                    page_id: response.data.integration.page_id || '',
                });
            }
        } catch (err: any) {
            if (err.response?.status !== 404) {
                setError(err.response?.data?.message || 'Failed to fetch integration status');
            }
        } finally {
            setLoading(false);
        }
    };

    const saveIntegration = async () => {
        try {
            setSaving(true);
            setError(null);
            const response = await axios.post(`/facebook/riding-companies/${ridingCompanyId}/integration`, formData);
            setIntegration(response.data.integration);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save integration');
        } finally {
            setSaving(false);
        }
    };

    const connect = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.post(`/facebook/riding-companies/${ridingCompanyId}/connect`);
            setIntegration(response.data.integration);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to connect to Facebook');
        } finally {
            setLoading(false);
        }
    };

    const disconnect = async () => {
        try {
            setLoading(true);
            setError(null);
            await axios.post(`/facebook/riding-companies/${ridingCompanyId}/disconnect`);
            fetchIntegration();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntegration();
    }, [ridingCompanyId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Facebook Integration</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Connect your Facebook page to this reseller company for social media management
                    </p>
                </div>
                <div className="flex gap-2">
                    {integration?.status === 'connected' ? (
                        <Button variant="destructive" onClick={disconnect} disabled={loading}>
                            Disconnect
                        </Button>
                    ) : (
                        <Button onClick={connect} disabled={loading || !formData.app_id || !formData.app_secret}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Facebook className="h-4 w-4 mr-2" />
                                    Connect
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" onClick={fetchIntegration} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            <Card className="p-6">
                {loading && !integration ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="app_id">Facebook App ID</Label>
                                <Input
                                    id="app_id"
                                    type="text"
                                    value={formData.app_id}
                                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                                    placeholder="Enter your Facebook App ID"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="app_secret">Facebook App Secret</Label>
                                <Input
                                    id="app_secret"
                                    type="password"
                                    value={formData.app_secret}
                                    onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                                    placeholder="Enter your Facebook App Secret"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="page_id">Facebook Page ID</Label>
                                <Input
                                    id="page_id"
                                    type="text"
                                    value={formData.page_id}
                                    onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                                    placeholder="Enter your Facebook Page ID"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button onClick={saveIntegration} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </div>

                        {integration?.status === 'connected' && (
                            <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                                <div className="flex items-center gap-2">
                                    <Facebook className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="font-medium text-green-800 dark:text-green-200">Connected</p>
                                        {integration.page_name && (
                                            <p className="text-sm text-green-600 dark:text-green-400">
                                                Page: {integration.page_name}
                                            </p>
                                        )}
                                        {integration.last_connected_at && (
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                Last connected: {new Date(integration.last_connected_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}

