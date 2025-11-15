<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('riding_companies')) {
            return;
        }

        Schema::table('riding_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('riding_companies', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('id')->constrained('companies')->onDelete('cascade');
                $table->index('company_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('riding_companies')) {
            return;
        }

        Schema::table('riding_companies', function (Blueprint $table) {
            if (Schema::hasColumn('riding_companies', 'company_id')) {
                $table->dropForeign(['company_id']);
                $table->dropIndex(['company_id']);
                $table->dropColumn('company_id');
            }
        });
    }
};

