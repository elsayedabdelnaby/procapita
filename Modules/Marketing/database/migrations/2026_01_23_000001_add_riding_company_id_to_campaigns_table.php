<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Add riding_company_id column
            $table->foreignId('riding_company_id')->after('company_id')->nullable()->constrained('riding_companies')->cascadeOnDelete();
            
            // Add index
            $table->index('riding_company_id');
        });
        
        // Add unique constraint on riding_company_id and slug
        Schema::table('campaigns', function (Blueprint $table) {
            $table->unique(['riding_company_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique(['riding_company_id', 'slug']);
            
            // Drop foreign key and index
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            
            // Drop column
            $table->dropColumn('riding_company_id');
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        $doctrineSchemaManager = $connection->getDoctrineSchemaManager();
        $doctrineTable = $doctrineSchemaManager->introspectTable($table);
        return $doctrineTable->hasIndex($index);
    }
};
