<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Add campaign_type_id if it doesn't exist
            if (!Schema::hasColumn('campaigns', 'campaign_type_id')) {
                $table->foreignId('campaign_type_id')->nullable()->after('slug')->constrained()->nullOnDelete();
                $table->index('campaign_type_id');
            }
            
            // Add campaign_status_id if it doesn't exist
            if (!Schema::hasColumn('campaigns', 'campaign_status_id')) {
                $table->foreignId('campaign_status_id')->nullable()->after('campaign_type_id')->constrained()->nullOnDelete();
                $table->index('campaign_status_id');
            }
            
            // Add campaign_channel_id if it doesn't exist
            if (!Schema::hasColumn('campaigns', 'campaign_channel_id')) {
                $table->foreignId('campaign_channel_id')->nullable()->after('campaign_status_id')->constrained()->nullOnDelete();
                $table->index('campaign_channel_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropForeign(['campaign_type_id']);
            $table->dropForeign(['campaign_status_id']);
            $table->dropForeign(['campaign_channel_id']);
            $table->dropIndex(['campaign_type_id']);
            $table->dropIndex(['campaign_status_id']);
            $table->dropIndex(['campaign_channel_id']);
            $table->dropColumn(['campaign_type_id', 'campaign_status_id', 'campaign_channel_id']);
        });
    }
};

