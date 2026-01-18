<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            // Add facebook_forms JSON column to store multiple forms
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_forms')) {
                $table->json('facebook_forms')->nullable()->after('facebook_field_mapping');
            }
        });

        // Migrate existing data from facebook_form_id to facebook_forms
        $this->migrateExistingForms();
    }

    public function down(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_forms')) {
                $table->dropColumn('facebook_forms');
            }
        });
    }

    /**
     * Migrate existing single form data to the new multiple forms structure
     */
    private function migrateExistingForms(): void
    {
        $integrations = DB::table('riding_company_integration_settings')
            ->where('type', 'facebook')
            ->whereNotNull('facebook_form_id')
            ->get();

        foreach ($integrations as $integration) {
            $formId = $integration->facebook_form_id;
            $fieldMapping = json_decode($integration->facebook_field_mapping ?? '{}', true);
            $config = json_decode($integration->config ?? '{}', true);
            $campaignId = $config['facebook_campaign_id'] ?? null;

            // Create the new forms array structure
            $forms = [
                [
                    'form_id' => $formId,
                    'campaign_id' => $campaignId,
                    'field_mapping' => $fieldMapping,
                    'name' => null, // Will be populated when forms are loaded
                    'status' => null,
                ]
            ];

            DB::table('riding_company_integration_settings')
                ->where('id', $integration->id)
                ->update([
                    'facebook_forms' => json_encode($forms),
                ]);
        }
    }
};

