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
        if (!Schema::hasTable('lead_stages')) {
            return;
        }

        // Check if riding_company_id column exists
        if (!Schema::hasColumn('lead_stages', 'riding_company_id')) {
            // Column already removed, just ensure unique constraint on name exists
            if (!$this->hasUniqueConstraint('lead_stages', ['name'])) {
                try {
                    Schema::table('lead_stages', function (Blueprint $table) {
                        $table->unique('name');
                    });
                } catch (\Exception $e) {
                    // Constraint might already exist
                }
            }
            return;
        }

        // First, make riding_company_id nullable to avoid constraint issues
        try {
            Schema::table('lead_stages', function (Blueprint $table) {
                $table->unsignedBigInteger('riding_company_id')->nullable()->change();
            });
        } catch (\Exception $e) {
            // Column might already be nullable or change might fail, continue
        }

        // Drop unique constraint if it exists
        if ($this->hasUniqueConstraint('lead_stages', ['riding_company_id', 'slug'])) {
            $constraintName = $this->getUniqueConstraintName('lead_stages', ['riding_company_id', 'slug']);
            if ($constraintName) {
                try {
                    DB::statement("ALTER TABLE `lead_stages` DROP INDEX `{$constraintName}`");
                } catch (\Exception $e) {
                    // Constraint might not exist, continue
                }
            }
        }

        // Drop foreign key if it exists
        $foreignKeyName = $this->getForeignKeyName('lead_stages', 'riding_company_id');
        if ($foreignKeyName) {
            try {
                DB::statement("ALTER TABLE `lead_stages` DROP FOREIGN KEY `{$foreignKeyName}`");
            } catch (\Exception $e) {
                // Foreign key might not exist, continue
            }
        }

        // Drop index if it exists
        try {
            Schema::table('lead_stages', function (Blueprint $table) {
                $table->dropIndex(['riding_company_id']);
            });
        } catch (\Exception $e) {
            // Index might not exist, continue
        }

        // Drop column if it exists
        if (Schema::hasColumn('lead_stages', 'riding_company_id')) {
            Schema::table('lead_stages', function (Blueprint $table) {
                $table->dropColumn('riding_company_id');
            });
        }

        // Add unique constraint on name (global level) if it doesn't exist
        if (!$this->hasUniqueConstraint('lead_stages', ['name'])) {
            try {
                Schema::table('lead_stages', function (Blueprint $table) {
                    $table->unique('name');
                });
            } catch (\Exception $e) {
                // Constraint might already exist
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('lead_stages')) {
            return;
        }

        Schema::table('lead_stages', function (Blueprint $table) {
            // Drop unique constraint on name if it exists
            if ($this->hasUniqueConstraint('lead_stages', ['name'])) {
                $constraintName = $this->getUniqueConstraintName('lead_stages', ['name']);
                if ($constraintName) {
                    try {
                        DB::statement("ALTER TABLE `lead_stages` DROP INDEX `{$constraintName}`");
                    } catch (\Exception $e) {
                        // Continue if doesn't exist
                    }
                }
            }
            
            // Add riding_company_id column back if it doesn't exist
            if (!Schema::hasColumn('lead_stages', 'riding_company_id')) {
                $table->foreignId('riding_company_id')->nullable()->after('id');
                $table->foreign('riding_company_id')->references('id')->on('riding_companies')->cascadeOnDelete();
                
                // Add index
                $table->index('riding_company_id');
                
                // Add unique constraint
                $table->unique(['riding_company_id', 'slug']);
            }
        });
    }
};
