<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            if (!Schema::hasColumn('riding_companies', 'distribution_scenarios')) {
                $table->json('distribution_scenarios')->nullable()->after('distribution_users');
            }
        });
    }

    public function down(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            if (Schema::hasColumn('riding_companies', 'distribution_scenarios')) {
                $table->dropColumn('distribution_scenarios');
            }
        });
    }
};

