<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('riding_company_integration_settings', 'facebook_user_name')) {
                $table->string('facebook_user_name')->nullable()->after('facebook_user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('riding_company_integration_settings', function (Blueprint $table) {
            if (Schema::hasColumn('riding_company_integration_settings', 'facebook_user_name')) {
                $table->dropColumn('facebook_user_name');
            }
        });
    }
};

