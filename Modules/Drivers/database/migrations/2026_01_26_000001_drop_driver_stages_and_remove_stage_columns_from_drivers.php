<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Get the name of a foreign key on a table for a given column.
     */
    protected function getForeignKeyName(string $table, string $column): ?string
    {
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
        ", [$table, $column]);

        return ! empty($foreignKeys) ? $foreignKeys[0]->CONSTRAINT_NAME : null;
    }

    /**
     * Run the migrations.
     * Drop foreign keys first, then driver_stage_id/current_stage_id from drivers, then driver_stages table.
     */
    public function up(): void
    {
        if (Schema::hasTable('drivers')) {
            $columnsToDrop = [];

            if (Schema::hasColumn('drivers', 'current_stage_id')) {
                $fk = $this->getForeignKeyName('drivers', 'current_stage_id');
                if ($fk) {
                    DB::statement("ALTER TABLE `drivers` DROP FOREIGN KEY `{$fk}`");
                }
                $columnsToDrop[] = 'current_stage_id';
            }

            if (Schema::hasColumn('drivers', 'driver_stage_id')) {
                $fk = $this->getForeignKeyName('drivers', 'driver_stage_id');
                if ($fk) {
                    DB::statement("ALTER TABLE `drivers` DROP FOREIGN KEY `{$fk}`");
                }
                $columnsToDrop[] = 'driver_stage_id';
            }

            if (! empty($columnsToDrop)) {
                Schema::table('drivers', function (Blueprint $table) use ($columnsToDrop) {
                    $table->dropColumn($columnsToDrop);
                });
            }
        }

        if (Schema::hasTable('driver_stages')) {
            Schema::dropIfExists('driver_stages');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('drivers')) {
            Schema::table('drivers', function (Blueprint $table) {
                if (! Schema::hasColumn('drivers', 'driver_stage_id')) {
                    $table->unsignedBigInteger('driver_stage_id')->nullable()->after('lead_stage_id');
                }
                if (! Schema::hasColumn('drivers', 'current_stage_id')) {
                    $table->unsignedBigInteger('current_stage_id')->nullable()->after('driver_stage_id');
                }
            });
        }

        if (! Schema::hasTable('driver_stages')) {
            Schema::create('driver_stages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->cascadeOnDelete();
                $table->string('name')->nullable();
                $table->unsignedBigInteger('riding_company_id')->nullable();
                $table->json('riding_company_ids')->nullable();
                $table->integer('stage_order')->nullable();
                $table->string('status')->default('pending');
                $table->timestamp('completed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }
};
