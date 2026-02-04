<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Get the name of a foreign key
     */
    private function getForeignKeyName(string $table, string $column): ?string
    {
        try {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND COLUMN_NAME = ? 
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$table, $column]);
            
            return !empty($foreignKeys) ? $foreignKeys[0]->CONSTRAINT_NAME : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop foreign key and column for stage_template_id if it exists
        if (Schema::hasColumn('driver_stages', 'stage_template_id')) {
            // Check if foreign key exists before dropping
            $foreignKeyName = $this->getForeignKeyName('driver_stages', 'stage_template_id');
            
            if ($foreignKeyName) {
                try {
                    DB::statement("ALTER TABLE `driver_stages` DROP FOREIGN KEY `{$foreignKeyName}`");
                } catch (\Exception $e) {
                    // Foreign key might not exist, continue
                }
            }
            
            // Drop index if it exists
            try {
                Schema::table('driver_stages', function (Blueprint $table) {
                    $table->dropIndex(['stage_template_id']);
                });
            } catch (\Exception $e) {
                // Index might not exist, continue
            }
            
            // Drop column if it exists
            if (Schema::hasColumn('driver_stages', 'stage_template_id')) {
                Schema::table('driver_stages', function (Blueprint $table) {
                    $table->dropColumn('stage_template_id');
                });
            }
        }

        // Add riding_company_id if it doesn't exist
        if (!Schema::hasColumn('driver_stages', 'riding_company_id')) {
            Schema::table('driver_stages', function (Blueprint $table) {
                // Create column first, then add foreign key if table exists
                $table->unsignedBigInteger('riding_company_id')->nullable()->after('driver_id');
                $table->index('riding_company_id');
            });
        }

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies') && Schema::hasColumn('driver_stages', 'riding_company_id')) {
            Schema::table('driver_stages', function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('driver_stages', function (Blueprint $table) {
            // Drop riding_company_id
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');

            // Restore stage_template_id
            $table->unsignedBigInteger('stage_template_id')->after('driver_id');
            $table->index('stage_template_id');
            
            // Add foreign key constraint only if the referenced table exists
            if (Schema::hasTable('riding_company_stage_templates')) {
                $table->foreign('stage_template_id')
                    ->references('id')
                    ->on('riding_company_stage_templates')
                    ->onDelete('cascade');
            }
        });
    }
};
