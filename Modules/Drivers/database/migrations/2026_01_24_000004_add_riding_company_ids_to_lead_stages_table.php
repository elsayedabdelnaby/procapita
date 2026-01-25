<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_stages', function (Blueprint $table) {
            // Add riding_company_ids column as JSON
            if (!Schema::hasColumn('lead_stages', 'riding_company_ids')) {
                // Add after 'id' since riding_company_id was removed in previous migration
                $table->json('riding_company_ids')->nullable()->after('id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lead_stages', function (Blueprint $table) {
            if (Schema::hasColumn('lead_stages', 'riding_company_ids')) {
                $table->dropColumn('riding_company_ids');
            }
        });
    }
};
