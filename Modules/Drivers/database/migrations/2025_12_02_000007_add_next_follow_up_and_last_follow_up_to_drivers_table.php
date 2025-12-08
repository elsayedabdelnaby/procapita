<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (!Schema::hasColumn('drivers', 'next_follow_up')) {
                $table->date('next_follow_up')->nullable()->after('lead_status_comment');
            }
            if (!Schema::hasColumn('drivers', 'last_follow_up')) {
                $table->date('last_follow_up')->nullable()->after('next_follow_up');
            }
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'next_follow_up')) {
                $table->dropColumn('next_follow_up');
            }
            if (Schema::hasColumn('drivers', 'last_follow_up')) {
                $table->dropColumn('last_follow_up');
            }
        });
    }
};

