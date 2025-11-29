<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('lead_stages', 'commission_value')) {
            return;
        }

        Schema::table('lead_stages', function (Blueprint $table) {
            $table->decimal('commission_value', 15, 2)->nullable()->after('requires_all_documents_approved');
        });
    }

    public function down(): void
    {
        Schema::table('lead_stages', function (Blueprint $table) {
            $table->dropColumn('commission_value');
        });
    }
};

