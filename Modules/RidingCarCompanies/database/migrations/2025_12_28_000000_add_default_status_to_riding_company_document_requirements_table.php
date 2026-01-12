<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_company_document_requirements', function (Blueprint $table) {
            $table->string('default_status', 20)->default('pending')->after('active');
        });
    }

    public function down(): void
    {
        Schema::table('riding_company_document_requirements', function (Blueprint $table) {
            $table->dropColumn('default_status');
        });
    }
};
