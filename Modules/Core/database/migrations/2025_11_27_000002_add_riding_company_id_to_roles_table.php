<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        
        if (! isset($tableNames['roles'])) {
            return;
        }

        Schema::table($tableNames['roles'], function (Blueprint $table) {
            if (! Schema::hasColumn($tableNames['roles'], 'riding_company_id')) {
                $table->foreignId('riding_company_id')->nullable()->after('team_id')->constrained('riding_companies')->nullOnDelete();
                $table->index('riding_company_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');
        
        if (! isset($tableNames['roles'])) {
            return;
        }

        Schema::table($tableNames['roles'], function (Blueprint $table) use ($tableNames) {
            if (Schema::hasColumn($tableNames['roles'], 'riding_company_id')) {
                $table->dropForeign(['riding_company_id']);
                $table->dropIndex(['riding_company_id']);
                $table->dropColumn('riding_company_id');
            }
        });
    }
};

