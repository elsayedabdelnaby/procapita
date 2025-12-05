<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_company_stage_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('riding_company_stage_templates', 'commission_value')) {
                $table->decimal('commission_value', 15, 2)->nullable()->after('active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('riding_company_stage_templates', function (Blueprint $table) {
            if (Schema::hasColumn('riding_company_stage_templates', 'commission_value')) {
                $table->dropColumn('commission_value');
            }
        });
    }
};

