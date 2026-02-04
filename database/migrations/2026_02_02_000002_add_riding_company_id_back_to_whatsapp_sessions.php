<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Re-add riding_company_id to whatsapp_sessions so WhatsApp can be used per Reseller Company.
     */
    public function up(): void
    {
        if (! Schema::hasTable('whatsapp_sessions') || Schema::hasColumn('whatsapp_sessions', 'riding_company_id')) {
            return;
        }

        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('riding_company_id')->nullable()->after('company_id');
            $table->index('riding_company_id');
        });

        if (Schema::hasTable('riding_companies')) {
            Schema::table('whatsapp_sessions', function (Blueprint $table) {
                $table->foreign('riding_company_id')->references('id')->on('riding_companies')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('whatsapp_sessions') || ! Schema::hasColumn('whatsapp_sessions', 'riding_company_id')) {
            return;
        }

        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }
};
