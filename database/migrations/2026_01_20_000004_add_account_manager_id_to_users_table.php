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
            // Add account_manager_id if it doesn't exist
            if (!Schema::hasColumn('users', 'account_manager_id')) {
                $table->unsignedBigInteger('account_manager_id')->nullable()->after('team_leader_id');
                $table->foreign('account_manager_id')->references('id')->on('users')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'account_manager_id')) {
                $table->dropForeign(['account_manager_id']);
                $table->dropColumn('account_manager_id');
            }
        });
    }
};
