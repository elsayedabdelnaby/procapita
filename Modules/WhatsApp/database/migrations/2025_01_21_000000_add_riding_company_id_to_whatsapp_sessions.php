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
        if (!Schema::hasColumn('whatsapp_sessions', 'riding_company_id')) {
            Schema::table('whatsapp_sessions', function (Blueprint $table) {
                $table->foreignId('riding_company_id')->nullable()->after('company_id')->constrained('riding_companies')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }
};

