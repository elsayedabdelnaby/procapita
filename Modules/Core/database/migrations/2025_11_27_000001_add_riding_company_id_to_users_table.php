<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'riding_company_id')) {
                $table->foreignId('riding_company_id')->nullable()->after('company_id')->constrained('riding_companies')->nullOnDelete();
                $table->index('riding_company_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'riding_company_id')) {
                $table->dropForeign(['riding_company_id']);
                $table->dropIndex(['riding_company_id']);
                $table->dropColumn('riding_company_id');
            }
        });
    }
};

