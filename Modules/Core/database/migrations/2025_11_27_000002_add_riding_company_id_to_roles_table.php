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
        
        $rolesTable = $tableNames['roles'];
        
        Schema::table($rolesTable, function (Blueprint $table) use ($rolesTable) {
            if (! Schema::hasColumn($rolesTable, 'riding_company_id')) {
                // Create column first, then add foreign key if table exists
                $table->unsignedBigInteger('riding_company_id')->nullable()->after('team_id');
                $table->index('riding_company_id');
            }
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies') && Schema::hasColumn($rolesTable, 'riding_company_id')) {
            Schema::table($rolesTable, function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('set null');
            });
        }
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

