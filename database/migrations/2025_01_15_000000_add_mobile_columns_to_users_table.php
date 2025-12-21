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
            if (! Schema::hasColumn('users', 'mobile1')) {
                $table->string('mobile1')->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'mobile2')) {
                $table->string('mobile2')->nullable()->after('mobile1');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'mobile1')) {
                $table->dropColumn('mobile1');
            }
            if (Schema::hasColumn('users', 'mobile2')) {
                $table->dropColumn('mobile2');
            }
        });
    }
};

