<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const FK_NAME = 'lead_statuses_change_to_lead_status_id_foreign';

    /**
     * Lead Status Duration: after X (minutes/hours/days) from when lead entered this status,
     * auto-change to another status. Also track when each driver entered current status.
     */
    public function up(): void
    {
        if (Schema::hasTable('lead_statuses')) {
            Schema::table('lead_statuses', function (Blueprint $table) {
                if (! Schema::hasColumn('lead_statuses', 'duration_value')) {
                    $table->unsignedInteger('duration_value')->nullable()->after('order');
                }
                if (! Schema::hasColumn('lead_statuses', 'duration_unit')) {
                    $table->string('duration_unit', 20)->nullable()->after('duration_value'); // minutes, hours, days
                }
                if (! Schema::hasColumn('lead_statuses', 'change_to_lead_status_id')) {
                    $table->unsignedBigInteger('change_to_lead_status_id')->nullable()->after('duration_unit');
                }
            });
            if (Schema::hasColumn('lead_statuses', 'change_to_lead_status_id') && ! $this->foreignKeyExists('lead_statuses', self::FK_NAME)) {
                Schema::table('lead_statuses', function (Blueprint $table) {
                    $table->foreign('change_to_lead_status_id')
                        ->references('id')
                        ->on('lead_statuses')
                        ->nullOnDelete();
                });
            }
        }

        if (Schema::hasTable('drivers') && ! Schema::hasColumn('drivers', 'lead_status_set_at')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->timestamp('lead_status_set_at')->nullable()->after('lead_status_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lead_statuses') && Schema::hasColumn('lead_statuses', 'change_to_lead_status_id') && $this->foreignKeyExists('lead_statuses', self::FK_NAME)) {
            Schema::table('lead_statuses', function (Blueprint $table) {
                $table->dropForeign(['change_to_lead_status_id']);
            });
        }
        if (Schema::hasTable('lead_statuses')) {
            $cols = array_filter(['duration_value', 'duration_unit', 'change_to_lead_status_id'], fn ($c) => Schema::hasColumn('lead_statuses', $c));
            if (! empty($cols)) {
                Schema::table('lead_statuses', function (Blueprint $table) use ($cols) {
                    $table->dropColumn($cols);
                });
            }
        }
        if (Schema::hasTable('drivers') && Schema::hasColumn('drivers', 'lead_status_set_at')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->dropColumn('lead_status_set_at');
            });
        }
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $result = DB::selectOne(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ? AND CONSTRAINT_NAME = ?',
            [DB::getDatabaseName(), $table, 'FOREIGN KEY', $constraintName]
        );

        return $result !== null;
    }
};
