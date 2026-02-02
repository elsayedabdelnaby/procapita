<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Re-add riding_company_id to drivers so Reseller can be set (mass edit) and shown in lead list.
     */
    public function up(): void
    {
        if (! Schema::hasTable('drivers') || Schema::hasColumn('drivers', 'riding_company_id')) {
            return;
        }

        Schema::table('drivers', function (Blueprint $table) {
            $table->unsignedBigInteger('riding_company_id')->nullable()->after('company_id');
            $table->index('riding_company_id');
        });

        if (Schema::hasTable('riding_companies')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('riding_company_id')->references('id')->on('riding_companies')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('drivers') || ! Schema::hasColumn('drivers', 'riding_company_id')) {
            return;
        }

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }
};
