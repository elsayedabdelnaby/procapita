<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_types', function (Blueprint $table) {
            // Add riding_company_id column
            $table->foreignId('riding_company_id')->after('company_id')->nullable()->constrained('riding_companies')->cascadeOnDelete();
            
            // Add index
            $table->index('riding_company_id');
            
            // Drop old unique constraint
            $table->dropUnique(['company_id', 'slug']);
            
            // Add new unique constraint on riding_company_id and slug
            $table->unique(['riding_company_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('campaign_types', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique(['riding_company_id', 'slug']);
            
            // Drop foreign key and index
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            
            // Drop column
            $table->dropColumn('riding_company_id');
            
            // Restore old unique constraint
            $table->unique(['company_id', 'slug']);
        });
    }
};
