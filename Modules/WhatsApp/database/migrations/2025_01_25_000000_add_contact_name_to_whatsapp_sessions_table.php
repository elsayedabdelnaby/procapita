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
        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_sessions', 'contact_name')) {
                $table->string('contact_name')->nullable()->after('phone_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('whatsapp_sessions', 'contact_name')) {
                $table->dropColumn('contact_name');
            }
        });
    }
};

