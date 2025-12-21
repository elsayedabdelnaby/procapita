<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            // Add Facebook-specific fields
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_access_token')) {
                $table->text('facebook_access_token')->nullable()->after('config');
            }
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_user_id')) {
                $table->string('facebook_user_id')->nullable()->after('facebook_access_token');
            }
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_page_id')) {
                $table->string('facebook_page_id')->nullable()->after('facebook_user_id');
            }
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_form_id')) {
                $table->string('facebook_form_id')->nullable()->after('facebook_page_id');
            }
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_field_mapping')) {
                $table->json('facebook_field_mapping')->nullable()->after('facebook_form_id');
            }
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_token_expires_at')) {
                $table->timestamp('facebook_token_expires_at')->nullable()->after('facebook_field_mapping');
            }
        });
    }

    public function down(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_token_expires_at')) {
                $table->dropColumn('facebook_token_expires_at');
            }
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_field_mapping')) {
                $table->dropColumn('facebook_field_mapping');
            }
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_form_id')) {
                $table->dropColumn('facebook_form_id');
            }
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_page_id')) {
                $table->dropColumn('facebook_page_id');
            }
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_user_id')) {
                $table->dropColumn('facebook_user_id');
            }
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_access_token')) {
                $table->dropColumn('facebook_access_token');
            }
        });
    }
};

