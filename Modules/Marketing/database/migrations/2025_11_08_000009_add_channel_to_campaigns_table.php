<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Change type and status to foreign keys
            $table->foreignId('campaign_type_id')->nullable()->after('slug')->constrained()->nullOnDelete();
            $table->foreignId('campaign_status_id')->nullable()->after('campaign_type_id')->constrained()->nullOnDelete();
            $table->foreignId('campaign_channel_id')->nullable()->after('campaign_status_id')->constrained()->nullOnDelete();
            
            // Keep old columns for backward compatibility during migration
            $table->string('type')->nullable()->change();
            $table->string('status')->nullable()->change();
            
            $table->index('campaign_type_id');
            $table->index('campaign_status_id');
            $table->index('campaign_channel_id');
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
            
            $table->string('type')->default('email')->change();
            $table->string('status')->default('draft')->change();
        });
    }
};

