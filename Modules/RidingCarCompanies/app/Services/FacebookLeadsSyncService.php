<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Support\Facades\Log;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegrationSetting;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverService;

class FacebookLeadsSyncService
{
    public function __construct(
        protected FacebookService $facebookService,
        protected DriverService $driverService
    ) {}

    /**
     * Sync leads for a specific riding company
     */
    public function syncLeadsForRidingCompany(int $ridingCompanyId): array
    {
        $integration = RidingCompanyIntegrationSetting::where('riding_company_id', $ridingCompanyId)
            ->where('type', 'facebook')
            ->first();

        if (!$integration) {
            return [
                'success' => false,
                'error' => 'Facebook integration not found',
            ];
        }

        if (!$integration->facebook_access_token) {
            return [
                'success' => false,
                'error' => 'Facebook access token not found',
            ];
        }

        if (!$integration->facebook_page_id) {
            return [
                'success' => false,
                'error' => 'Facebook page not selected',
            ];
        }

        // Get all configured forms
        $forms = $integration->facebook_forms ?? [];
        
        // Backward compatibility: if no forms in new format, check old format
        if (empty($forms) && $integration->facebook_form_id) {
            $config = $integration->config ?? [];
            $forms = [
                [
                    'form_id' => $integration->facebook_form_id,
                    'campaign_id' => $config['facebook_campaign_id'] ?? null,
                    'field_mapping' => $integration->facebook_field_mapping ?? [],
                ]
            ];
        }

        if (empty($forms)) {
            return [
                'success' => false,
                'error' => 'No Facebook forms configured',
            ];
        }

        if (!$integration->active) {
            return [
                'success' => false,
                'error' => 'Facebook integration is not active',
            ];
        }

        try {
            // Get page access token
            $pagesResult = $this->facebookService->getPages($integration->facebook_access_token);
            
            if (!$pagesResult['success']) {
                return [
                    'success' => false,
                    'error' => $pagesResult['error'] ?? 'Failed to get pages',
                ];
            }

            $page = collect($pagesResult['pages'])->firstWhere('id', $integration->facebook_page_id);
            
            if (!$page || !isset($page['access_token'])) {
                return [
                    'success' => false,
                    'error' => 'Page access token not found',
                ];
            }

            $ridingCompany = $integration->ridingCompany;
            $totalCreatedCount = 0;
            $totalSkippedCount = 0;
            $formResults = [];

            // Sync leads from each configured form
            foreach ($forms as $form) {
                $formId = $form['form_id'] ?? null;
                $fieldMapping = $form['field_mapping'] ?? [];

                if (!$formId) {
                    continue;
                }

                // Get leads for this form
                $leadsResult = $this->facebookService->getLeads($formId, $page['access_token']);

                if (!$leadsResult['success']) {
                    $formResults[] = [
                        'form_id' => $formId,
                        'success' => false,
                        'error' => $leadsResult['error'] ?? 'Failed to get leads',
                    ];
                    continue;
                }

                $leads = $leadsResult['leads'] ?? [];
                $formCreatedCount = 0;
                $formSkippedCount = 0;

                foreach ($leads as $lead) {
                    $fieldData = [];
                    foreach ($lead['field_data'] ?? [] as $field) {
                        $fieldData[$field['name'] ?? ''] = $field['values'][0] ?? null;
                    }

                    // Map fields using this form's field mapping
                    $driverData = [];
                    foreach ($fieldMapping as $fbField => $driverField) {
                        if (isset($fieldData[$fbField]) && !empty($fieldData[$fbField])) {
                            $driverData[$driverField] = $fieldData[$fbField];
                        }
                    }

                    if (empty($driverData)) {
                        continue;
                    }

                    // Check if driver exists by phone and riding company
                    $phone = $driverData['phone'] ?? $driverData['whatsapp_phone'] ?? null;
                    if ($phone) {
                        $phone = $this->driverService->reformatPhoneNumber($phone);
                        $existingDriver = Driver::where('riding_company_id', $ridingCompanyId)
                            ->where(function ($query) use ($phone) {
                                $query->where('phone', $phone)
                                    ->orWhere('whatsapp_phone', $phone);
                            })
                            ->first();

                        // Skip if driver already exists with same phone and riding company
                        if ($existingDriver) {
                            $formSkippedCount++;
                            continue;
                        }
                    }

                    // Create new driver
                    $driverData['riding_company_id'] = $ridingCompanyId;
                    $driverData['company_id'] = $ridingCompany->company_id;
                    $driverData['lead_source_id'] = $this->getOrCreateLeadSource('Facebook', $ridingCompany->company_id);
                    $driverData['lead_status_id'] = $this->getOrCreateLeadStatus('New', $ridingCompany->company_id);

                    // Assign to default user if exists
                    if ($ridingCompany->default_driver_user_id) {
                        $driverData['assigned_to'] = $ridingCompany->default_driver_user_id;
                    }

                    Driver::create($driverData);
                    $formCreatedCount++;
                }

                $totalCreatedCount += $formCreatedCount;
                $totalSkippedCount += $formSkippedCount;

                $formResults[] = [
                    'form_id' => $formId,
                    'form_name' => $form['name'] ?? null,
                    'success' => true,
                    'created' => $formCreatedCount,
                    'skipped' => $formSkippedCount,
                ];
            }

            $message = "Synced {$totalCreatedCount} new leads from " . count($forms) . " form(s). Skipped {$totalSkippedCount} duplicate leads.";
            
            return [
                'success' => true,
                'message' => $message,
                'created' => $totalCreatedCount,
                'skipped' => $totalSkippedCount,
                'form_results' => $formResults,
            ];
        } catch (\Exception $e) {
            Log::error('Error syncing Facebook leads', [
                'riding_company_id' => $ridingCompanyId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'Error syncing leads: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Sync leads for all active Facebook integrations
     */
    public function syncAllActiveIntegrations(): array
    {
        $integrations = RidingCompanyIntegrationSetting::where('type', 'facebook')
            ->where('active', true)
            ->whereNotNull('facebook_access_token')
            ->whereNotNull('facebook_page_id')
            ->get()
            ->filter(function ($integration) {
                // Check if has forms (either new format or old format)
                $forms = $integration->facebook_forms ?? [];
                if (!empty($forms)) {
                    return true;
                }
                // Backward compatibility: check old format
                return !empty($integration->facebook_form_id);
            });

        $totalCreated = 0;
        $totalSkipped = 0;
        $successCount = 0;
        $errorCount = 0;

        foreach ($integrations as $integration) {
            $result = $this->syncLeadsForRidingCompany($integration->riding_company_id);
            
            if ($result['success']) {
                $successCount++;
                $totalCreated += $result['created'] ?? 0;
                $totalSkipped += $result['skipped'] ?? 0;
            } else {
                $errorCount++;
                Log::warning('Failed to sync leads for riding company', [
                    'riding_company_id' => $integration->riding_company_id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            }
        }

        return [
            'success' => true,
            'message' => "Synced leads for {$successCount} integration(s). Created {$totalCreated} leads, skipped {$totalSkipped} duplicates.",
            'total_created' => $totalCreated,
            'total_skipped' => $totalSkipped,
            'success_count' => $successCount,
            'error_count' => $errorCount,
        ];
    }

    /**
     * Get or create lead source
     */
    private function getOrCreateLeadSource(string $name, ?int $companyId = null): int
    {
        $leadSource = \Modules\Drivers\app\Models\LeadSource::firstOrCreate(
            [
                'name' => $name,
            ],
            [
                'active' => true,
            ]
        );

        return $leadSource->id;
    }

    /**
     * Get or create lead status
     */
    private function getOrCreateLeadStatus(string $name, ?int $companyId = null): int
    {
        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::firstOrCreate(
            [
                'name' => $name,
            ],
            [
                'active' => true,
            ]
        );

        return $leadStatus->id;
    }
}

