<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            if (!Schema::hasColumn('driver_follow_ups', 'lead_status')) {
                $table->string('lead_status')->nullable()->after('lead_stage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            if (Schema::hasColumn('driver_follow_ups', 'lead_status')) {
                $table->dropColumn('lead_status');
            }
        });
    }
};

