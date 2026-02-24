import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Loader2, MessageCircle, QrCode, RefreshCw, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface WhatsAppLinkDeviceRidingCompanyTabProps {
    ridingCompanyId: number;
    defaultDriverUserId?: number | null;
    defaultDriverUser?: {
        id: number;
        name: string;
        email: string;
    } | null;
    availableUsers?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
    onUserChange?: (userId: number | null, userName: string) => void;
}

interface WhatsAppSession {
    id: number;
    riding_company_id: number;
    phone_number: string | null;
    contact_name: string | null;
    session_id: string;
    status: 'disconnected' | 'connecting' | 'qr_code' | 'authenticated' | 'ready';
    qr_code: string | null;
    qr_code_expires_at: string | null;
    last_connected_at: string | null;
}

export function WhatsAppLinkDeviceRidingCompanyTab({ 
    ridingCompanyId,
    defaultDriverUserId,
    defaultDriverUser,
    availableUsers = [],
    onUserChange
}: WhatsAppLinkDeviceRidingCompanyTabProps) {
    const [session, setSession] = useState<WhatsAppSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatingQR, setGeneratingQR] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Use controlled component - track local selection for immediate UI feedback
    const [localUserId, setLocalUserId] = useState<number | null>(defaultDriverUserId || null);
    const userChangedRef = useRef(false);
    
    // Use localUserId if user just changed it, otherwise use prop value
    // This allows immediate UI feedback while waiting for server response
    const currentUserId = userChangedRef.current ? localUserId : (defaultDriverUserId || null);
    
    // Reset the flag when props change (after successful server update)
    useEffect(() => {
        if (defaultDriverUserId !== null && defaultDriverUserId === localUserId) {
            // Server has confirmed the change, reset the flag
            userChangedRef.current = false;
        }
    }, [defaultDriverUserId, localUserId]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`/whatsapp/riding-companies/${ridingCompanyId}/status`);
            setSession(response.data.session);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch session status');
        } finally {
            setLoading(false);
        }
    };

    const generateQR = async () => {
        try {
            setGeneratingQR(true);
            setError(null);
            const response = await axios.post(`/whatsapp/riding-companies/${ridingCompanyId}/generate-qr`);
            
            // Update session with QR code
            if (response.data.qr_code) {
                setSession({
                    ...response.data,
                    qr_code: response.data.qr_code,
                    status: 'qr_code',
                });
            } else {
                setSession(response.data);
            }
            
            // Poll for QR code and status updates
            let pollCount = 0;
            const maxPollCount = 30; // Stop after 1 minute (30 * 2 seconds)
            let lastQRCode = null;
            let lastStatus = 'qr_code';
            
            const pollInterval = setInterval(async () => {
                try {
                    pollCount++;
                    const statusResponse = await axios.get(`/whatsapp/riding-companies/${ridingCompanyId}/status`);
                    const newStatus = statusResponse.data.status;
                    const qrCode = statusResponse.data.qr_code;
                    
                    // Only update if QR code changed or status changed
                    const qrChanged = qrCode && qrCode !== lastQRCode;
                    const statusChanged = newStatus !== lastStatus;
                    
                    if (qrChanged || statusChanged) {
                        lastQRCode = qrCode;
                        lastStatus = newStatus;
                        
                        // Update QR code if available
                        if (qrCode && newStatus === 'qr_code') {
                            setSession(prev => prev ? {
                                ...prev,
                                qr_code: qrCode,
                                status: 'qr_code',
                            } : {
                                id: 0,
                                riding_company_id: ridingCompanyId,
                                phone_number: null,
                                session_id: '',
                                status: 'qr_code',
                                qr_code: qrCode,
                                qr_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                                last_connected_at: null,
                            });
                        }
                    }
                    
                    if (newStatus === 'authenticated' || newStatus === 'ready') {
                        clearInterval(pollInterval);
                        fetchSession();
                    } else if (newStatus === 'disconnected') {
                        clearInterval(pollInterval);
                    } else if (pollCount >= maxPollCount) {
                        // Stop polling after 1 minute if no scan happened
                        clearInterval(pollInterval);
                    }
                } catch (pollErr) {
                    // Silently handle errors - don't spam console
                    if (pollCount === 1) {
                        console.error('Polling error:', pollErr);
                    }
                }
            }, 2000); // Poll every 2 seconds
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to generate QR code';
            const errorStatus = err.response?.data?.status;
            
            if (errorStatus === 'service_unavailable' || errorMessage.includes('not running')) {
                setError('WhatsApp service is not running. Please start it by running: cd whatsapp-service && npm start');
            } else {
                setError(errorMessage);
            }
        } finally {
            setGeneratingQR(false);
        }
    };

    const disconnect = async () => {
        try {
            setLoading(true);
            setError(null);
            await axios.post(`/whatsapp/riding-companies/${ridingCompanyId}/disconnect`);
            fetchSession();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    // Use ref to track QR code updates without causing re-renders
    const qrUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastQRCodeRef = useRef<string | null>(null);
    
    useEffect(() => {
        fetchSession();
    }, [ridingCompanyId]);
    
    // Separate effect for QR code auto-update (WhatsApp refreshes QR every ~20 seconds)
    useEffect(() => {
        // Clear any existing interval
        if (qrUpdateIntervalRef.current) {
            clearInterval(qrUpdateIntervalRef.current);
            qrUpdateIntervalRef.current = null;
        }
        
        // Update ref with current QR code
        if (session?.qr_code) {
            lastQRCodeRef.current = session.qr_code;
        }
        
        // Only start checking if we have an active QR code session
        if (session?.status === 'qr_code' && session.qr_code) {
            qrUpdateIntervalRef.current = setInterval(async () => {
                try {
                    const statusResponse = await axios.get(`/whatsapp/riding-companies/${ridingCompanyId}/status`);
                    const newStatus = statusResponse.data.status;
                    const qrCode = statusResponse.data.qr_code;
                    
                    // Only update if QR code actually changed
                    if (qrCode && qrCode !== lastQRCodeRef.current && newStatus === 'qr_code') {
                        lastQRCodeRef.current = qrCode;
                        setSession(prev => prev ? {
                            ...prev,
                            qr_code: qrCode,
                        } : null);
                    }
                    
                    // Stop checking if authenticated
                    if (newStatus === 'authenticated' || newStatus === 'ready') {
                        if (qrUpdateIntervalRef.current) {
                            clearInterval(qrUpdateIntervalRef.current);
                            qrUpdateIntervalRef.current = null;
                        }
                        fetchSession();
                    }
                } catch (err) {
                    // Silently handle - don't spam console
                }
            }, 10000); // Check every 10 seconds for QR updates (less frequent)
        }
        
        return () => {
            if (qrUpdateIntervalRef.current) {
                clearInterval(qrUpdateIntervalRef.current);
                qrUpdateIntervalRef.current = null;
            }
        };
    }, [ridingCompanyId, session?.status, session?.qr_code]);

    const isQRExpired = session?.qr_code_expires_at 
        ? new Date(session.qr_code_expires_at) < new Date()
        : false;

    return (
        <div className="bg-[#dcf8c6] rounded-lg p-6 text-neutral-800 dark:text-neutral-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Link WhatsApp Device</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        Connect a WhatsApp number to this reseller company for messaging drivers
                    </p>
                </div>
                <div className="flex gap-2">
                    {session?.status === 'authenticated' || session?.status === 'ready' ? (
                        <Button variant="destructive" onClick={disconnect} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white border-red-600">
                            <X className="h-4 w-4 mr-2" />
                            Disconnect
                        </Button>
                    ) : (
                        <Button onClick={generateQR} disabled={generatingQR || loading} className="bg-[#25d366] hover:bg-[#20ba5a] text-white border-[#25d366]">
                            {generatingQR ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <QrCode className="h-4 w-4 mr-2" />
                                    Generate QR Code
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" onClick={fetchSession} disabled={loading} className="bg-white/80 hover:bg-white border-neutral-300 text-neutral-700">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            <Card className="p-6 bg-white/60 border-neutral-300/50">
                {loading && !session ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
                    </div>
                ) : session?.status === 'qr_code' && session.qr_code && !isQRExpired ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-200">📱 Scan QR Code</h4>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                                Open WhatsApp on your phone and scan this QR code to link your device
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 shadow-lg">
                            {session.qr_code.startsWith('data:') ? (
                                <img 
                                    src={session.qr_code} 
                                    alt="WhatsApp QR Code" 
                                    className="w-64 h-64"
                                />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-xs text-neutral-500 mb-2">QR Code String:</p>
                                        <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded break-all max-w-xs">
                                            {session.qr_code.substring(0, 100)}...
                                        </pre>
                                        <p className="text-xs text-neutral-500 mt-2">
                                            Note: Install qrcode library to display QR code image
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Steps to connect:</p>
                            <ol className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1 text-left max-w-md">
                                <li>1. Open WhatsApp on your phone</li>
                                <li>2. Tap Menu or Settings</li>
                                <li>3. Select "Linked Devices"</li>
                                <li>4. Tap on "Link a Device"</li>
                                <li>5. Point your phone at this QR code</li>
                            </ol>
                        </div>
                        {session.qr_code_expires_at && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                QR Code expires in {Math.max(0, Math.floor((new Date(session.qr_code_expires_at).getTime() - new Date().getTime()) / 1000 / 60))} minutes
                            </p>
                        )}
                    </div>
                ) : session?.status === 'authenticated' || session?.status === 'ready' ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <div className="rounded-full bg-[#25d366]/20 p-4">
                            <MessageCircle className="h-12 w-12 text-[#25d366]" />
                        </div>
                        <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-200">WhatsApp Connected</h4>
                            {session.phone_number && (
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                    {session.contact_name && (
                                        <span className="font-medium">{session.contact_name}</span>
                                    )}
                                    {session.contact_name && session.phone_number && ' - '}
                                    {session.phone_number}
                                </p>
                            )}
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                                Your WhatsApp device is successfully linked to this reseller company
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <div className="rounded-full bg-neutral-200/50 p-4">
                            <MessageCircle className="h-12 w-12 text-neutral-500" />
                        </div>
                        <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-200">No Active Connection</h4>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                Click "Generate QR Code" to link a WhatsApp device
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Default User for New Leads */}
            <div className="border-t border-neutral-400/30 pt-6 mt-6">
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium mb-2 block text-neutral-800 dark:text-neutral-200">
                            WhatsApp numbers that will contact us and are not in our reseller company will be assigned to this user
                        </Label>
                        <Select
                            value={currentUserId?.toString() || ''}
                            onValueChange={(value) => {
                                const userId = value ? parseInt(value) : null;
                                
                                // Mark that user has changed the value
                                userChangedRef.current = true;
                                
                                // Update local state immediately for instant UI feedback
                                setLocalUserId(userId);
                                
                                const selectedUser = availableUsers.find(u => u.id.toString() === value);
                                const userName = selectedUser ? selectedUser.name : 'Unknown';
                                
                                if (onUserChange) {
                                    onUserChange(userId, userName);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full bg-white/80 hover:bg-white border-neutral-300 text-neutral-800">
                                <SelectValue placeholder="Select default user for new drivers">
                                    {defaultDriverUser 
                                        ? `${defaultDriverUser.name} (${defaultDriverUser.email})`
                                        : availableUsers.find(u => u.id === currentUserId) 
                                            ? `${availableUsers.find(u => u.id === currentUserId)?.name} (${availableUsers.find(u => u.id === currentUserId)?.email})`
                                            : 'Select user'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {availableUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}

