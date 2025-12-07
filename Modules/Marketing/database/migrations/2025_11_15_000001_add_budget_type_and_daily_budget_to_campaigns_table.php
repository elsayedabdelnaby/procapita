<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->enum('budget_type', ['daily', 'total'])->default('total')->after('campaign_status_id');
            $table->decimal('daily_budget', 15, 2)->nullable()->after('budget_type');
            
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['budget_type', 'daily_budget']);
        });
    }
};

