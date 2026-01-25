<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_stages', function (Blueprint $table) {
            if (!Schema::hasColumn('driver_stages', 'riding_company_ids')) {
                $table->json('riding_company_ids')->nullable()->after('riding_company_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_stages', function (Blueprint $table) {
            if (Schema::hasColumn('driver_stages', 'riding_company_ids')) {
                $table->dropColumn('riding_company_ids');
            }
        });
    }
};
