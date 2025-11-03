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
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->boolean('is_super_admin')->default(false)->after('password');
            $table->boolean('is_company_admin')->default(false)->after('is_super_admin');
            $table->boolean('is_active')->default(true)->after('is_company_admin');

            $table->index('company_id');
            $table->index('is_super_admin');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropIndex(['company_id']);
            $table->dropIndex(['is_super_admin']);
            $table->dropIndex(['is_active']);
            $table->dropColumn(['company_id', 'is_super_admin', 'is_company_admin', 'is_active']);
        });
    }
};

