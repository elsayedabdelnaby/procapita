<?php

namespace Modules\RidingCarCompanies\app\Services;

use GuzzleHttp\Client;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

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
        $ridingCompany->update($data);

        return $ridingCompany->fresh();
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
            $client = new Client();
            $client->post("{$nodeServiceUrl}/api/whatsapp/riding-company/{$ridingCompanyId}/delete-session-files", [
                'timeout' => 10,
                'http_errors' => false, // Don't throw exceptions on HTTP errors
            ]);
        } catch (\Exception $e) {
            // If Node.js service is not available, try to delete files directly
            Log::warning("Node.js service unavailable, deleting files directly for riding company {$ridingCompanyId}: " . $e->getMessage());
            
            $sessionPath = storage_path('app/whatsapp/sessions/riding_company_' . $ridingCompanyId);
            
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
        if (!is_dir($dir)) {
            return false;
        }
        
        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $filePath = $dir . DIRECTORY_SEPARATOR . $file;
            
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
     * Distribute drivers from fresh-Leads user to assigned users
     * 
     * @param int $ridingCompanyId
     * @return array Statistics about distribution
     */
    public function distributeDrivers(int $ridingCompanyId): array
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

        if (!$freshLeadsUser) {
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
        if (!empty($distributionUsers)) {
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
            if (!empty($distributionUsers) && is_array($distributionUsers[0]) && isset($distributionUsers[0]['daily_count'])) {
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
            
            while ($attempts < count($userIds) && !$assigned) {
                $userId = $userIds[$userIndex % count($userIds)];
                $userIndex++;
                
                // Check if user has reached daily limit
                if (!isset($dailyCounts[$userId])) {
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
            if (!$assigned) {
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

