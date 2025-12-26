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
        Schema::table('riding_companies', function (Blueprint $table) {
            if (!Schema::hasColumn('riding_companies', 'default_driver_user_id')) {
                $table->foreignId('default_driver_user_id')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            if (Schema::hasColumn('riding_companies', 'default_driver_user_id')) {
                $table->dropForeign(['default_driver_user_id']);
                $table->dropColumn('default_driver_user_id');
            }
        });
    }
};

