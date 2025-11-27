<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('drivers', 'lead_stage_id')) {
            return;
        }

        Schema::table('drivers', function (Blueprint $table) {
            $table->unsignedBigInteger('lead_stage_id')->nullable()->after('lead_status_id');
            $table->index('lead_stage_id');
        });

        // Add foreign key constraint after lead_stages table is created
        if (Schema::hasTable('lead_stages')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('lead_stage_id')->references('id')->on('lead_stages')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['lead_stage_id']);
            $table->dropIndex(['lead_stage_id']);
            $table->dropColumn('lead_stage_id');
        });
    }
};

