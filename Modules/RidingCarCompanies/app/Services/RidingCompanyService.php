<?php

namespace Modules\RidingCarCompanies\app\Services;

use GuzzleHttp\Client;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Spatie\Permission\PermissionRegistrar;

class RidingCompanyService
{
    public function getAllRidingCompanies(?int $companyId = null): Collection
    {
        $query = RidingCompany::query();

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')->get();
    }

    public function getRidingCompanyById(int $id): ?RidingCompany
    {
        return RidingCompany::find($id);
    }

    public function createRidingCompany(array $data): RidingCompany
    {
        return RidingCompany::create($data);
    }

    public function updateRidingCompany(int $id, array $data): RidingCompany
    {
        $ridingCompany = RidingCompany::findOrFail($id);

        // Handle logo upload
        if (isset($data['logo']) && $data['logo'] instanceof \Illuminate\Http\UploadedFile) {
            // Delete old logo if exists
            if ($ridingCompany->logo_path && Storage::disk('public')->exists($ridingCompany->logo_path)) {
                Storage::disk('public')->delete($ridingCompany->logo_path);
            }

            // Store new logo
            $logoPath = $data['logo']->store('riding-companies/logos', 'public');
            $data['logo_path'] = $logoPath;
            unset($data['logo']);
        }

        // Ensure distribution_scenarios is properly formatted before saving
        if (isset($data['distribution_scenarios'])) {
            if (is_array($data['distribution_scenarios']) && ! empty($data['distribution_scenarios'])) {
                // Convert scenario IDs to strings if they're not already, and ensure all fields are present
                $data['distribution_scenarios'] = array_map(function ($scenario) {
                    return [
                        'id' => $scenario['id'] ?? null,
                        'distribution_from_users' => $scenario['distribution_from_users'] ?? [],
                        'max_drivers_per_day' => $scenario['max_drivers_per_day'] ?? 10,
                        'distribution_by_lead_source_enabled' => $scenario['distribution_by_lead_source_enabled'] ?? false,
                        'distribution_by_lead_sources' => $scenario['distribution_by_lead_sources'] ?? [],
                        'distribution_by_campaign_enabled' => $scenario['distribution_by_campaign_enabled'] ?? false,
                        'distribution_by_campaigns' => $scenario['distribution_by_campaigns'] ?? [],
                        'assigned_to_users' => $scenario['assigned_to_users'] ?? [],
                        'assigned_to_roles' => $scenario['assigned_to_roles'] ?? [],
                        'active' => $scenario['active'] ?? true,
                    ];
                }, $data['distribution_scenarios']);
            } else {
                // If empty array, set to empty array to clear all scenarios
                $data['distribution_scenarios'] = [];
            }
        }

        $ridingCompany->update($data);

        // Refresh the model to ensure logo_url accessor works correctly
        $ridingCompany->refresh();

        // If distribution_scenarios were updated and there are active scenarios, trigger immediate distribution
        if (isset($data['distribution_scenarios'])) {
            $distributionScenarios = $ridingCompany->distribution_scenarios ?? [];
            $hasActiveScenarios = ! empty($distributionScenarios) && is_array($distributionScenarios) &&
                ! empty(array_filter($distributionScenarios, function ($scenario) {
                    return ($scenario['active'] ?? true) === true;
                }));

            if ($hasActiveScenarios) {
                // Trigger immediate distribution (run synchronously to ensure it happens)
                \Log::info('Distribution scenarios updated, triggering immediate distribution', [
                    'riding_company_id' => $ridingCompany->id,
                    'active_scenarios_count' => count(array_filter($distributionScenarios, function ($scenario) {
                        return ($scenario['active'] ?? true) === true;
                    })),
                ]);

                try {
                    $service = app(\Modules\RidingCarCompanies\app\Services\RidingCompanyService::class);
                    $result = $service->distributeDrivers($ridingCompany->id);

                    \Log::info('Immediate distribution completed after scenario update', [
                        'riding_company_id' => $ridingCompany->id,
                        'success' => $result['success'] ?? false,
                        'distributed' => $result['distributed'] ?? 0,
                        'message' => $result['message'] ?? '',
                        'scenarios_count' => count($result['scenarios'] ?? []),
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Error triggering distribution after scenario update', [
                        'riding_company_id' => $ridingCompany->id,
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            } else {
                \Log::info('No active scenarios found, skipping distribution', [
                    'riding_company_id' => $ridingCompany->id,
                    'scenarios_count' => count($distributionScenarios ?? []),
                ]);
            }
        }

        return $ridingCompany;
    }

    public function deleteRidingCompany(int $id): bool
    {
        $ridingCompany = RidingCompany::findOrFail($id);

        // Delete WhatsApp session files
        $this->deleteWhatsAppSessionFiles($id);

        // Disconnect WhatsApp session if active
        $this->disconnectWhatsAppSession($id);

        // Delete logo if exists
        if ($ridingCompany->logo_path && Storage::exists($ridingCompany->logo_path)) {
            Storage::delete($ridingCompany->logo_path);
        }

        return $ridingCompany->delete();
    }

    /**
     * Delete WhatsApp session files for a riding company
     */
    private function deleteWhatsAppSessionFiles(int $ridingCompanyId): void
    {
        try {
            $nodeServiceUrl = config('whatsapp.node_service_url', 'http://localhost:3001');

            // Call Node.js service to delete session files
            $client = new Client;
            $client->post("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/delete-session-files", [
                'timeout' => 10,
                'http_errors' => false, // Don't throw exceptions on HTTP errors
            ]);
        } catch (\Exception $e) {
            // If Node.js service is not available, try to delete files directly
            Log::warning("Node.js service unavailable, deleting files directly for riding company {$ridingCompanyId}: ".$e->getMessage());

            $sessionPath = storage_path('app/whatsapp/sessions/riding_company_'.$ridingCompanyId);

            if (is_dir($sessionPath)) {
                // Delete all files and directories recursively
                $this->deleteDirectory($sessionPath);
            }
        }
    }

    /**
     * Recursively delete a directory and its contents
     */
    private function deleteDirectory(string $dir): bool
    {
        if (! is_dir($dir)) {
            return false;
        }

        $files = array_diff(scandir($dir), ['.', '..']);

        foreach ($files as $file) {
            $filePath = $dir.DIRECTORY_SEPARATOR.$file;

            if (is_dir($filePath)) {
                $this->deleteDirectory($filePath);
            } else {
                unlink($filePath);
            }
        }

        return rmdir($dir);
    }

    /**
     * Disconnect WhatsApp session via Node.js service
     */
    private function disconnectWhatsAppSession(int $ridingCompanyId): void
    {
        // This is now handled in deleteWhatsAppSessionFiles
        // Keeping for backward compatibility but it's called from deleteWhatsAppSessionFiles
    }

    public function toggleActive(int $id): RidingCompany
    {
        $ridingCompany = RidingCompany::findOrFail($id);
        $ridingCompany->update(['active' => ! $ridingCompany->active]);

        return $ridingCompany->fresh();
    }

    /**
     * Distribute drivers from fresh-Leads user to assigned users using distribution scenarios
     *
     * @return array Statistics about distribution
     */
    public function distributeDrivers(int $ridingCompanyId): array
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);

        // Check if distribution_scenarios exist and are configured
        $distributionScenarios = $ridingCompany->distribution_scenarios ?? [];

        if (empty($distributionScenarios) || ! is_array($distributionScenarios)) {
            // Fallback to old system for backward compatibility
            return $this->distributeDriversLegacy($ridingCompanyId);
        }

        // Filter only active scenarios
        $activeScenarios = array_filter($distributionScenarios, function ($scenario) {
            return ($scenario['active'] ?? true) === true;
        });

        if (empty($activeScenarios)) {
            return [
                'success' => false,
                'message' => 'No active distribution scenarios found',
                'distributed' => 0,
            ];
        }

        $today = now()->toDateString();
        $totalDistributed = 0;
        $scenarioResults = [];

        // Process each active scenario
        foreach ($activeScenarios as $scenario) {
            $result = $this->processDistributionScenario($ridingCompanyId, $scenario, $today);
            $totalDistributed += $result['distributed'];
            $scenarioResults[] = $result;
        }

        // Update last distribution date
        $ridingCompany->update(['last_distribution_date' => $today]);

        return [
            'success' => true,
            'message' => "Distributed {$totalDistributed} drivers across ".count($activeScenarios).' scenario(s)',
            'distributed' => $totalDistributed,
            'scenarios' => $scenarioResults,
        ];
    }

    /**
     * Process a single distribution scenario
     */
    protected function processDistributionScenario(int $ridingCompanyId, array $scenario, string $today): array
    {
        // Get distribution_from_users
        $distributionFromUsers = $scenario['distribution_from_users'] ?? [];
        if (empty($distributionFromUsers)) {
            return [
                'success' => false,
                'message' => 'No distribution from users specified',
                'distributed' => 0,
            ];
        }

        // Get assigned_to_users and assigned_to_roles
        $assignedToUsers = $scenario['assigned_to_users'] ?? [];
        $assignedToRoles = $scenario['assigned_to_roles'] ?? [];

        if (empty($assignedToUsers) && empty($assignedToRoles)) {
            return [
                'success' => false,
                'message' => 'No assigned users or roles specified',
                'distributed' => 0,
            ];
        }

        // Get all users from roles
        $usersFromRoles = [];
        if (! empty($assignedToRoles)) {
            // Get company ID for team context
            $ridingCompany = RidingCompany::find($ridingCompanyId);
            $companyId = $ridingCompany?->company_id;

            // Set team context for Spatie Permission
            if ($companyId) {
                app(PermissionRegistrar::class)->setPermissionsTeamId($companyId);
            }

            foreach ($assignedToRoles as $roleId) {
                $role = \Modules\Core\app\Models\Role::find($roleId);
                if ($role) {
                    // Get users with this role in the company
                    $roleUsers = \App\Models\User::whereHas('roles', function ($q) use ($roleId, $companyId) {
                        $q->where('roles.id', $roleId);
                        if ($companyId) {
                            $q->where('team_id', $companyId);
                        }
                    })
                        ->where('is_active', true)
                        ->when($companyId, function ($q) use ($companyId) {
                            $q->where('company_id', $companyId);
                        })
                        ->pluck('id')
                        ->toArray();
                    $usersFromRoles = array_merge($usersFromRoles, $roleUsers);
                }
            }
        }

        // Combine assigned users and users from roles, remove duplicates
        $allAssignedUserIds = array_unique(array_merge($assignedToUsers, $usersFromRoles));

        if (empty($allAssignedUserIds)) {
            return [
                'success' => false,
                'message' => 'No valid assigned users found',
                'distributed' => 0,
            ];
        }

        // Get max drivers per day for this scenario
        $maxDriversPerDay = $scenario['max_drivers_per_day'] ?? 10;

        // Get drivers from distribution_from_users
        // Include drivers that are assigned to distribution_from_users but NOT yet assigned to any of the target users
        // This includes newly created drivers from WhatsApp that are assigned to fresh-Leads user
        $driversQuery = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
            ->whereIn('assigned_to', $distributionFromUsers)
            // Exclude drivers that are already assigned to target users (already distributed)
            ->whereNotIn('assigned_to', $allAssignedUserIds);

        // Filter by lead source if enabled
        if (! empty($scenario['distribution_by_lead_source_enabled']) && ! empty($scenario['distribution_by_lead_sources'])) {
            $driversQuery->whereIn('lead_source_id', $scenario['distribution_by_lead_sources']);
        }

        // Filter by campaign if enabled
        if (! empty($scenario['distribution_by_campaign_enabled']) && ! empty($scenario['distribution_by_campaigns'])) {
            $driversQuery->whereIn('campaign_id', $scenario['distribution_by_campaigns']);
        }

        // Load assignedUsers relationship to check if drivers are already distributed
        $driversToDistribute = $driversQuery->with('assignedUsers')->orderBy('created_at', 'asc')->get();

        \Log::info('Distribution scenario check', [
            'riding_company_id' => $ridingCompanyId,
            'distribution_from_users' => $distributionFromUsers,
            'all_assigned_user_ids' => $allAssignedUserIds,
            'drivers_found_before_filter' => $driversToDistribute->count(),
        ]);

        // Filter out drivers that are already distributed to target users
        // IMPORTANT: We check assigned_to field, not assignedUsers relationship
        // If assigned_to is still in distribution_from_users, it means the driver hasn't been distributed yet
        // Even if assignedUsers relationship exists with target users (from previous incomplete distribution),
        // we should still distribute it if assigned_to is still in source
        $driversToDistribute = $driversToDistribute->filter(function ($driver) use ($allAssignedUserIds, $distributionFromUsers) {
            // Get all assignedUsers IDs for this driver
            $assignedUserIds = $driver->assignedUsers->pluck('id')->toArray();

            // Check if driver's assigned_to is still in distribution_from_users
            // This is the primary check - if assigned_to is still in source, it needs distribution
            $isStillInSource = in_array($driver->assigned_to, $distributionFromUsers);

            // Check if assigned_to is already in target users (already distributed)
            $isAlreadyDistributed = in_array($driver->assigned_to, $allAssignedUserIds);

            // Include driver if:
            // 1. It's still assigned to a distribution_from_users (not yet distributed), AND
            // 2. It's not already assigned to a target user
            $shouldInclude = $isStillInSource && ! $isAlreadyDistributed;

            if (! $shouldInclude) {
                \Log::info('Driver filtered out', [
                    'driver_id' => $driver->id,
                    'assigned_to' => $driver->assigned_to,
                    'assigned_users' => $assignedUserIds,
                    'is_still_in_source' => $isStillInSource,
                    'is_already_distributed' => $isAlreadyDistributed,
                    'target_users' => $allAssignedUserIds,
                    'source_users' => $distributionFromUsers,
                ]);
            }

            return $shouldInclude;
        })->values();

        \Log::info('Distribution scenario after filter', [
            'riding_company_id' => $ridingCompanyId,
            'drivers_available_for_distribution' => $driversToDistribute->count(),
        ]);

        // Get daily counts for assigned users
        // Count drivers assigned to each user TODAY (based on last_assigned_time)
        // This ensures that when a new day starts, counts reset automatically
        $dailyCounts = [];
        foreach ($allAssignedUserIds as $userId) {
            $count = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
                ->where('assigned_to', $userId)
                ->whereDate('last_assigned_time', $today)
                ->count();
            $dailyCounts[$userId] = $count;
        }

        // Distribute drivers equally - max_drivers_per_day is PER USER, not per scenario
        // Each user gets up to max_drivers_per_day drivers per day
        // If there are enough leads to cover the max limit, distribute them all at once
        // Distribution is done as equally as possible
        //
        // التوزيع: إذا كان هناك ليدز كافية لتغطية الحد الأقصى، يتم توزيعها دفعة واحدة بالتساوي
        // كل user له حد أقصى منفصل (max_drivers_per_day)
        // كل دقيقة يتم فحص الليدز الجديدة وتوزيعها حتى انتهاء الحد الأقصى
        // عند بداية يوم جديد، يتم إعادة تعيين العد تلقائياً

        // Calculate how many drivers each user needs to reach their max
        $driversNeededPerUser = [];
        $totalDriversNeeded = 0;
        foreach ($allAssignedUserIds as $userId) {
            $currentCount = $dailyCounts[$userId] ?? 0;
            $needed = max(0, $maxDriversPerDay - $currentCount);
            $driversNeededPerUser[$userId] = $needed;
            $totalDriversNeeded += $needed;
        }

        // If no drivers needed, return early
        if ($totalDriversNeeded === 0) {
            \Log::info('All users have reached their daily limit', [
                'riding_company_id' => $ridingCompanyId,
                'daily_counts' => $dailyCounts,
                'max_drivers_per_day' => $maxDriversPerDay,
            ]);

            return [
                'success' => true,
                'message' => 'All users have reached their daily limit',
                'distributed' => 0,
                'daily_counts' => $dailyCounts,
            ];
        }

        // Calculate how many drivers we can distribute
        $driversAvailable = $driversToDistribute->count();
        $driversToDistributeCount = min($driversAvailable, $totalDriversNeeded);

        // If no drivers available, return early
        if ($driversAvailable === 0) {
            \Log::info('No drivers available for distribution', [
                'riding_company_id' => $ridingCompanyId,
                'distribution_from_users' => $distributionFromUsers,
                'total_drivers_needed' => $totalDriversNeeded,
                'daily_counts' => $dailyCounts,
            ]);

            return [
                'success' => true,
                'message' => 'No drivers available for distribution',
                'distributed' => 0,
                'daily_counts' => $dailyCounts,
            ];
        }

        \Log::info('Distribution calculation', [
            'riding_company_id' => $ridingCompanyId,
            'drivers_available' => $driversAvailable,
            'total_drivers_needed' => $totalDriversNeeded,
            'drivers_to_distribute_count' => $driversToDistributeCount,
            'daily_counts' => $dailyCounts,
            'max_drivers_per_day' => $maxDriversPerDay,
        ]);

        // Distribute drivers equally among users
        // Create a distribution plan: how many drivers each user should get
        $distributionPlan = [];
        $remainingDrivers = $driversToDistributeCount;
        $remainingUsers = array_filter($allAssignedUserIds, function ($userId) use ($driversNeededPerUser) {
            return $driversNeededPerUser[$userId] > 0;
        });

        // Distribute equally: calculate base distribution and remainder
        if (! empty($remainingUsers)) {
            $basePerUser = (int) floor($remainingDrivers / count($remainingUsers));
            $remainder = $remainingDrivers % count($remainingUsers);

            // Sort users by current count (ascending) for fair remainder distribution
            usort($remainingUsers, function ($a, $b) use ($dailyCounts) {
                return ($dailyCounts[$a] ?? 0) <=> ($dailyCounts[$b] ?? 0);
            });

            foreach ($remainingUsers as $index => $userId) {
                $needed = $driversNeededPerUser[$userId];
                // Give base amount plus one extra if there's remainder and this user needs it
                $toGive = min($needed, $basePerUser + ($index < $remainder ? 1 : 0));
                if ($toGive > 0) {
                    $distributionPlan[$userId] = $toGive;
                }
            }
        }

        // Execute distribution plan
        $distributedCount = 0;
        $driverIndex = 0;

        foreach ($distributionPlan as $userId => $count) {
            for ($i = 0; $i < $count && $driverIndex < $driversToDistribute->count(); $i++) {
                $driver = $driversToDistribute[$driverIndex];
                $currentCount = $dailyCounts[$userId] ?? 0;

                // Assign driver to user
                $driver->update([
                    'assigned_to' => $userId,
                    'last_assigned_time' => now(),
                    'last_assigned_by' => auth()->id() ?? $distributionFromUsers[0],
                ]);

                // Sync assigned users relationship
                $driver->assignedUsers()->sync([$userId]);

                // Update daily count for this user
                $dailyCounts[$userId] = $currentCount + 1;
                $distributedCount++;
                $driverIndex++;
            }
        }

        \Log::info('Distribution completed', [
            'riding_company_id' => $ridingCompanyId,
            'distributed_count' => $distributedCount,
            'daily_counts_after' => $dailyCounts,
        ]);

        return [
            'success' => true,
            'message' => "Distributed {$distributedCount} drivers",
            'distributed' => $distributedCount,
            'daily_counts' => $dailyCounts,
        ];
    }

    /**
     * Legacy distribution method for backward compatibility
     */
    protected function distributeDriversLegacy(int $ridingCompanyId): array
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);

        // Check if distribution is enabled
        if ($ridingCompany->distribution_type !== 'equal' || empty($ridingCompany->distribution_users)) {
            return [
                'success' => false,
                'message' => 'Distribution is not configured',
                'distributed' => 0,
            ];
        }

        // Get fresh-Leads user for this riding company
        $nameWithDots = str_replace(' ', '.', $ridingCompany->name);
        $freshLeadsUser = \App\Models\User::where('name', "fresh-Leads-{$nameWithDots}")
            ->where('riding_company_id', $ridingCompanyId)
            ->first();

        if (! $freshLeadsUser) {
            return [
                'success' => false,
                'message' => 'Fresh-Leads user not found',
                'distributed' => 0,
            ];
        }

        // Reset daily counts if it's a new day
        $today = now()->toDateString();
        $distributionUsers = $ridingCompany->distribution_users ?? [];

        // Handle both array of IDs and array of objects
        $userIds = [];
        if (! empty($distributionUsers)) {
            if (is_array($distributionUsers[0]) && isset($distributionUsers[0]['user_id'])) {
                // Array of objects with user_id and daily_count
                $userIds = array_column($distributionUsers, 'user_id');
            } else {
                // Array of user IDs
                $userIds = $distributionUsers;
            }
        }

        $dailyCounts = [];

        if ($ridingCompany->last_distribution_date !== $today) {
            // Reset all counts for new day
            foreach ($userIds as $userId) {
                $dailyCounts[$userId] = 0;
            }
            $ridingCompany->update(['last_distribution_date' => $today]);
        } else {
            // Get current counts from distribution_users JSON (if stored)
            if (! empty($distributionUsers) && is_array($distributionUsers[0]) && isset($distributionUsers[0]['daily_count'])) {
                foreach ($distributionUsers as $item) {
                    $dailyCounts[$item['user_id']] = $item['daily_count'] ?? 0;
                }
            } else {
                // Count from database for today
                foreach ($userIds as $userId) {
                    $count = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
                        ->where('assigned_to', $userId)
                        ->whereDate('last_assigned_time', $today)
                        ->count();
                    $dailyCounts[$userId] = $count;
                }
            }
        }

        // Get drivers assigned to fresh-Leads user that need distribution
        $driversToDistribute = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
            ->where('assigned_to', $freshLeadsUser->id)
            ->whereDoesntHave('assignedUsers', function ($query) use ($userIds) {
                $query->whereIn('users.id', $userIds);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        $maxPerDay = $ridingCompany->max_drivers_per_day ?? 50;
        $distributedCount = 0;
        $userIndex = 0;

        foreach ($driversToDistribute as $driver) {
            // Find next available user (not at max)
            $attempts = 0;
            $assigned = false;

            while ($attempts < count($userIds) && ! $assigned) {
                $userId = $userIds[$userIndex % count($userIds)];
                $userIndex++;

                // Check if user has reached daily limit
                if (! isset($dailyCounts[$userId])) {
                    $dailyCounts[$userId] = 0;
                }

                if ($dailyCounts[$userId] < $maxPerDay) {
                    // Assign driver to this user
                    $driver->update([
                        'assigned_to' => $userId,
                        'last_assigned_time' => now(),
                        'last_assigned_by' => auth()->id() ?? $freshLeadsUser->id,
                    ]);

                    // Sync assigned users
                    $driver->assignedUsers()->sync([$userId]);

                    $dailyCounts[$userId]++;
                    $distributedCount++;
                    $assigned = true;
                }

                $attempts++;
            }

            // If no user available (all at max), stop distribution
            if (! $assigned) {
                break;
            }
        }

        // Update distribution_users with current daily counts
        $updatedDistributionUsers = [];
        foreach ($distributionUsers as $userId) {
            $updatedDistributionUsers[] = [
                'user_id' => $userId,
                'daily_count' => $dailyCounts[$userId] ?? 0,
            ];
        }
        $ridingCompany->update(['distribution_users' => $updatedDistributionUsers]);

        return [
            'success' => true,
            'message' => "Distributed {$distributedCount} drivers",
            'distributed' => $distributedCount,
            'daily_counts' => $dailyCounts,
        ];
    }

    public function uploadLogo(int $id, UploadedFile $file): string
    {
        $ridingCompany = RidingCompany::findOrFail($id);

        // Delete old logo if exists
        if ($ridingCompany->logo_path && Storage::exists($ridingCompany->logo_path)) {
            Storage::delete($ridingCompany->logo_path);
        }

        // Store new logo
        $path = $file->store('riding-companies/logos', 'public');

        $ridingCompany->update(['logo_path' => $path]);

        return $path;
    }
}
