<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Add budget_type if it doesn't exist
            if (!Schema::hasColumn('campaigns', 'budget_type')) {
                $table->enum('budget_type', ['daily', 'total'])->default('total')->after('campaign_status_id');
            }
            
            // Add daily_budget if it doesn't exist
            if (!Schema::hasColumn('campaigns', 'daily_budget')) {
                $table->decimal('daily_budget', 15, 2)->nullable()->after('budget_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['budget_type', 'daily_budget']);
        });
    }
};

