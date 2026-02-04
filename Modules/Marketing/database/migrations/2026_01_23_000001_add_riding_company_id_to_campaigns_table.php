<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Add riding_company_id column first, then add foreign key if table exists
            if (!Schema::hasColumn('campaigns', 'riding_company_id')) {
                $table->unsignedBigInteger('riding_company_id')->nullable()->after('company_id');
                $table->index('riding_company_id');
            }
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies') && Schema::hasColumn('campaigns', 'riding_company_id')) {
            Schema::table('campaigns', function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('cascade');
            });
        }
        
        // Add unique constraint on riding_company_id and slug
        if (Schema::hasColumn('campaigns', 'riding_company_id')) {
            Schema::table('campaigns', function (Blueprint $table) {
                try {
                    $table->unique(['riding_company_id', 'slug']);
                } catch (\Exception $e) {
                    // Unique constraint might already exist, continue
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique(['riding_company_id', 'slug']);
            
            // Drop foreign key and index
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            
            // Drop column
            $table->dropColumn('riding_company_id');
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        try {
            $indexes = DB::select("SHOW INDEXES FROM `{$table}` WHERE Key_name = ?", [$index]);
            return !empty($indexes);
        } catch (\Exception $e) {
            return false;
        }
    }
};
