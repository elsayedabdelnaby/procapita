<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (!Schema::hasColumn('drivers', 'assigned_time')) {
                $table->dateTime('assigned_time')->nullable()->after('assigned_to');
            }
            if (!Schema::hasColumn('drivers', 'last_assigned_by')) {
                $table->foreignId('last_assigned_by')->nullable()->after('assigned_time')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'last_assigned_by')) {
                $table->dropForeign(['last_assigned_by']);
                $table->dropColumn('last_assigned_by');
            }
            if (Schema::hasColumn('drivers', 'assigned_time')) {
                $table->dropColumn('assigned_time');
            }
        });
    }
};

