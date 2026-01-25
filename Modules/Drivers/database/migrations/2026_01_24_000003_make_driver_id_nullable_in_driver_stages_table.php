<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_stages', function (Blueprint $table) {
            // Check if driver_id column exists and is not nullable
            if (Schema::hasColumn('driver_stages', 'driver_id')) {
                // Get column information
                $columnInfo = DB::select("SHOW COLUMNS FROM `driver_stages` WHERE Field = 'driver_id'");
                
                if (!empty($columnInfo)) {
                    $column = $columnInfo[0];
                    $isNullable = $column->Null === 'YES';
                    
                    // If not nullable, make it nullable
                    if (!$isNullable) {
                        // First, drop foreign key if exists
                        try {
                            $foreignKeys = DB::select("
                                SELECT CONSTRAINT_NAME 
                                FROM information_schema.KEY_COLUMN_USAGE 
                                WHERE TABLE_SCHEMA = DATABASE() 
                                AND TABLE_NAME = 'driver_stages' 
                                AND COLUMN_NAME = 'driver_id' 
                                AND REFERENCED_TABLE_NAME IS NOT NULL
                            ");
                            
                            if (!empty($foreignKeys)) {
                                $foreignKeyName = $foreignKeys[0]->CONSTRAINT_NAME;
                                DB::statement("ALTER TABLE `driver_stages` DROP FOREIGN KEY `{$foreignKeyName}`");
                            }
                        } catch (\Exception $e) {
                            // Foreign key might not exist, continue
                        }
                        
                        // Make column nullable
                        DB::statement("ALTER TABLE `driver_stages` MODIFY COLUMN `driver_id` BIGINT UNSIGNED NULL");
                    }
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_stages', function (Blueprint $table) {
            if (Schema::hasColumn('driver_stages', 'driver_id')) {
                // Make driver_id NOT NULL again (but this might fail if there are NULL values)
                try {
                    DB::statement("ALTER TABLE `driver_stages` MODIFY COLUMN `driver_id` BIGINT UNSIGNED NOT NULL");
                    
                    // Re-add foreign key
                    try {
                        $table->foreign('driver_id')->references('id')->on('drivers')->cascadeOnDelete();
                    } catch (\Exception $e) {
                        // Foreign key might already exist
                    }
                } catch (\Exception $e) {
                    // Cannot make NOT NULL if there are NULL values
                }
            }
        });
    }
};
