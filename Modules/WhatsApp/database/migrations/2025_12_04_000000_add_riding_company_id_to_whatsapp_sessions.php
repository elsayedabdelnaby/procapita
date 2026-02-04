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
                // Create column first, then add foreign key if table exists
                $table->unsignedBigInteger('riding_company_id')->nullable()->after('company_id');
            });
        }

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies') && Schema::hasColumn('whatsapp_sessions', 'riding_company_id')) {
            Schema::table('whatsapp_sessions', function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('cascade');
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

