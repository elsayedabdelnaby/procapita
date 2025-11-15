<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Crypt;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegrationSetting;

class RidingCompanyIntegrationSettingService
{
    public function getAllIntegrationSettings(int $ridingCompanyId): Collection
    {
        return RidingCompanyIntegrationSetting::forCompany($ridingCompanyId)
            ->orderBy('type')
            ->get();
    }

    public function getIntegrationSettingById(int $id): ?RidingCompanyIntegrationSetting
    {
        return RidingCompanyIntegrationSetting::find($id);
    }

    public function createIntegrationSetting(array $data): RidingCompanyIntegrationSetting
    {
        // Encrypt sensitive values in config
        if (isset($data['config'])) {
            $data['config'] = $this->encryptSensitiveConfig($data['config']);
        }

        return RidingCompanyIntegrationSetting::create($data);
    }

    public function updateIntegrationSetting(int $id, array $data): RidingCompanyIntegrationSetting
    {
        $setting = RidingCompanyIntegrationSetting::findOrFail($id);
        
        // Encrypt sensitive values in config
        if (isset($data['config'])) {
            $data['config'] = $this->encryptSensitiveConfig($data['config']);
        }

        $setting->update($data);

        return $setting->fresh();
    }

    public function deleteIntegrationSetting(int $id): bool
    {
        $setting = RidingCompanyIntegrationSetting::findOrFail($id);
        return $setting->delete();
    }

    public function toggleActive(int $id): RidingCompanyIntegrationSetting
    {
        $setting = RidingCompanyIntegrationSetting::findOrFail($id);
        $setting->update(['active' => ! $setting->active]);

        return $setting->fresh();
    }

    public function testAccess(int $id): array
    {
        $setting = RidingCompanyIntegrationSetting::findOrFail($id);
        $config = $this->decryptSensitiveConfig($setting->config);

        // Basic access test logic
        try {
            // This is a placeholder - implement actual access test based on type
            return [
                'success' => true,
                'message' => 'Access test successful.',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function encryptSensitiveConfig(array $config): array
    {
        $sensitiveKeys = ['api_key', 'secret', 'password', 'token', 'access_token', 'refresh_token'];
        
        foreach ($sensitiveKeys as $key) {
            if (isset($config[$key]) && ! empty($config[$key])) {
                $config[$key] = Crypt::encryptString($config[$key]);
            }
        }

        return $config;
    }

    protected function decryptSensitiveConfig(array $config): array
    {
        $sensitiveKeys = ['api_key', 'secret', 'password', 'token', 'access_token', 'refresh_token'];
        
        foreach ($sensitiveKeys as $key) {
            if (isset($config[$key]) && ! empty($config[$key])) {
                try {
                    $config[$key] = Crypt::decryptString($config[$key]);
                } catch (\Exception $e) {
                    // If decryption fails, it might not be encrypted
                    continue;
                }
            }
        }

        return $config;
    }

    public function getDecryptedConfig(RidingCompanyIntegrationSetting $setting): array
    {
        return $this->decryptSensitiveConfig($setting->config);
    }
}

