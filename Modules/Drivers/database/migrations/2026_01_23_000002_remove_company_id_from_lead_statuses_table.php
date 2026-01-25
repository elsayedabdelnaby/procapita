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
     * Check if a unique constraint exists
     */
    private function hasUniqueConstraint(string $table, array $columns): bool
    {
        return $this->getUniqueConstraintName($table, $columns) !== null;
    }

    public function up(): void
    {
        // Check if table exists
        if (!Schema::hasTable('lead_statuses')) {
            return;
        }

        // Check if company_id column exists
        if (!Schema::hasColumn('lead_statuses', 'company_id')) {
            // Column already removed, just ensure unique constraint on slug exists
            if (!$this->hasUniqueConstraint('lead_statuses', ['slug'])) {
                try {
                    Schema::table('lead_statuses', function (Blueprint $table) {
                        $table->unique('slug');
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
            return;
        }

        // First, make company_id nullable to avoid constraint issues
        try {
            Schema::table('lead_statuses', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->change();
            });
        } catch (\Exception $e) {
            // Column might already be nullable or change might fail, continue
        }

        // Drop unique constraint if it exists
        if ($this->hasUniqueConstraint('lead_statuses', ['company_id', 'slug'])) {
            $constraintName = $this->getUniqueConstraintName('lead_statuses', ['company_id', 'slug']);
            if ($constraintName) {
                try {
                    DB::statement("ALTER TABLE `lead_statuses` DROP INDEX `{$constraintName}`");
                } catch (\Exception $e) {
                    // Constraint might not exist, continue
                }
            }
        }

        // Drop foreign key if it exists
        $foreignKeyName = $this->getForeignKeyName('lead_statuses', 'company_id');
        if ($foreignKeyName) {
            try {
                DB::statement("ALTER TABLE `lead_statuses` DROP FOREIGN KEY `{$foreignKeyName}`");
            } catch (\Exception $e) {
                // Foreign key might not exist, continue
            }
        }

        // Drop index if it exists
        try {
            Schema::table('lead_statuses', function (Blueprint $table) {
                $table->dropIndex(['company_id']);
            });
        } catch (\Exception $e) {
            // Index might not exist, continue
        }

        // Drop column if it exists
        if (Schema::hasColumn('lead_statuses', 'company_id')) {
            Schema::table('lead_statuses', function (Blueprint $table) {
                $table->dropColumn('company_id');
            });
        }

        // Add unique constraint on slug only (global uniqueness) if it doesn't exist
        if (!$this->hasUniqueConstraint('lead_statuses', ['slug'])) {
            try {
                Schema::table('lead_statuses', function (Blueprint $table) {
                    $table->unique('slug');
                });
            } catch (\Exception $e) {
                // Constraint might already exist
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('lead_statuses')) {
            return;
        }

        Schema::table('lead_statuses', function (Blueprint $table) {
            // Drop unique constraint on slug if it exists
            if ($this->hasUniqueConstraint('lead_statuses', ['slug'])) {
                $constraintName = $this->getUniqueConstraintName('lead_statuses', ['slug']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `lead_statuses` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Continue if doesn't exist
                    }
                }
            }
            
            // Add company_id column back if it doesn't exist
            if (!Schema::hasColumn('lead_statuses', 'company_id')) {
                $table->foreignId('company_id')->after('id')->constrained('companies')->cascadeOnDelete();
                
                // Add index
                $table->index('company_id');
                
                // Add unique constraint
                $table->unique(['company_id', 'slug']);
            }
        });
    }
};
