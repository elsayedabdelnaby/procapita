<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_channels', function (Blueprint $table) {
            // Add riding_company_id column first, then add foreign key if table exists
            if (!Schema::hasColumn('campaign_channels', 'riding_company_id')) {
                $table->unsignedBigInteger('riding_company_id')->nullable()->after('company_id');
                $table->index('riding_company_id');
            }
            
            // Drop old unique constraint if it exists
            try {
                $table->dropUnique(['company_id', 'campaign_type_id', 'slug']);
            } catch (\Exception $e) {
                // Unique constraint might not exist, continue
            }
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies') && Schema::hasColumn('campaign_channels', 'riding_company_id')) {
            Schema::table('campaign_channels', function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('cascade');
            });
        }

        // Add new unique constraint on riding_company_id, campaign_type_id and slug
        if (Schema::hasColumn('campaign_channels', 'riding_company_id')) {
            Schema::table('campaign_channels', function (Blueprint $table) {
                try {
                    $table->unique(['riding_company_id', 'campaign_type_id', 'slug']);
                } catch (\Exception $e) {
                    // Unique constraint might already exist, continue
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('campaign_channels', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique(['riding_company_id', 'campaign_type_id', 'slug']);
            
            // Drop foreign key and index
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            
            // Drop column
            $table->dropColumn('riding_company_id');
            
            // Restore old unique constraint
            $table->unique(['company_id', 'campaign_type_id', 'slug']);
        });
    }
};
