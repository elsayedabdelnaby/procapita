<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            // Ensure company_id column exists
            if (! Schema::hasColumn('riding_companies', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->onDelete('cascade');
                $table->index('company_id');
            }
        });
        
        // Try to drop existing unique constraint on slug (global) if exists
        try {
            Schema::table('riding_companies', function (Blueprint $table) {
                $table->dropUnique(['slug']);
            });
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }
        
        Schema::table('riding_companies', function (Blueprint $table) {
            // Add unique constraint on (company_id, name) - unique within each company
            $table->unique(['company_id', 'name']);
            
            // Keep slug but make it unique within company_id
            $table->unique(['company_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            // Drop unique constraints
            $table->dropUnique(['company_id', 'name']);
            $table->dropUnique(['company_id', 'slug']);
            
            // Add back unique constraint on slug (global)
            $table->unique('slug');
        });
    }
};
