<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Get the name of a unique constraint
     */
    private function getUniqueConstraintName(string $table, array $columns): ?string
    {
        try {
            $indexes = DB::select("SHOW INDEXES FROM `{$table}` WHERE Key_name != 'PRIMARY'");
            
            foreach ($indexes as $index) {
                if ($index->Non_unique == 0) {
                    $indexColumns = DB::select("SHOW INDEXES FROM `{$table}` WHERE Key_name = ?", [$index->Key_name]);
                    $indexColumnNames = array_column($indexColumns, 'Column_name');
                    
                    if (count($indexColumnNames) === count($columns) && 
                        empty(array_diff($indexColumnNames, $columns))) {
                        return $index->Key_name;
                    }
                }
            }
        } catch (\Exception $e) {
            // Table might not exist or other error
        }
        
        return null;
    }

    /**
     * Check if a unique constraint exists
     */
    private function hasUniqueConstraint(string $table, array $columns): bool
    {
        return $this->getUniqueConstraintName($table, $columns) !== null;
    }

    public function up(): void
    {
        // Check if table exists
        if (!Schema::hasTable('campaign_types')) {
            return;
        }

        // Check if riding_company_id column exists (added by previous migration)
        $hasRidingCompanyId = Schema::hasColumn('campaign_types', 'riding_company_id');

        if ($hasRidingCompanyId) {
            // If riding_company_id exists, drop constraint on (riding_company_id, slug) if it exists
            if ($this->hasUniqueConstraint('campaign_types', ['riding_company_id', 'slug'])) {
                $constraintName = $this->getUniqueConstraintName('campaign_types', ['riding_company_id', 'slug']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `campaign_types` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Constraint might not exist, continue
                    }
                }
            }

            // Add unique constraint on (riding_company_id, name) if it doesn't exist
            if (!$this->hasUniqueConstraint('campaign_types', ['riding_company_id', 'name'])) {
                try {
                    Schema::table('campaign_types', function (Blueprint $table) {
                        $table->unique(['riding_company_id', 'name']);
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
        } else {
            // If riding_company_id doesn't exist, work with company_id
            // Drop existing unique constraint on (company_id, slug) if it exists
            if ($this->hasUniqueConstraint('campaign_types', ['company_id', 'slug'])) {
                $constraintName = $this->getUniqueConstraintName('campaign_types', ['company_id', 'slug']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `campaign_types` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Constraint might not exist, continue
                    }
                }
            }

            // Add unique constraint on (company_id, name) if it doesn't exist
            if (!$this->hasUniqueConstraint('campaign_types', ['company_id', 'name'])) {
                try {
                    Schema::table('campaign_types', function (Blueprint $table) {
                        $table->unique(['company_id', 'name']);
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('campaign_types')) {
            return;
        }

        $hasRidingCompanyId = Schema::hasColumn('campaign_types', 'riding_company_id');

        if ($hasRidingCompanyId) {
            // Drop unique constraint on (riding_company_id, name) if it exists
            if ($this->hasUniqueConstraint('campaign_types', ['riding_company_id', 'name'])) {
                $constraintName = $this->getUniqueConstraintName('campaign_types', ['riding_company_id', 'name']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `campaign_types` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Continue if doesn't exist
                    }
                }
            }

            // Add back unique constraint on (riding_company_id, slug) if it doesn't exist
            if (!$this->hasUniqueConstraint('campaign_types', ['riding_company_id', 'slug'])) {
                try {
                    Schema::table('campaign_types', function (Blueprint $table) {
                        $table->unique(['riding_company_id', 'slug']);
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
        } else {
            // Drop unique constraint on (company_id, name) if it exists
            if ($this->hasUniqueConstraint('campaign_types', ['company_id', 'name'])) {
                $constraintName = $this->getUniqueConstraintName('campaign_types', ['company_id', 'name']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `campaign_types` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Continue if doesn't exist
                    }
                }
            }

            // Add back unique constraint on (company_id, slug) if it doesn't exist
            if (!$this->hasUniqueConstraint('campaign_types', ['company_id', 'slug'])) {
                try {
                    Schema::table('campaign_types', function (Blueprint $table) {
                        $table->unique(['company_id', 'slug']);
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
        }
    }
};
