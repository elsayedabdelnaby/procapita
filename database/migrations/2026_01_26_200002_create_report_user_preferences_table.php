<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('sort_mode', 20)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'report_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_user_preferences');
    }
};
