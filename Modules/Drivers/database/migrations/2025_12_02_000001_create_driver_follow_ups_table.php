<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('driver_follow_ups')) {
            return;
        }

        Schema::create('driver_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name'); // اسم المستخدم الذي قام بالتغيير
            $table->timestamp('created_time'); // تاريخ ووقت إنشاء الفولواب
            $table->string('riding_company')->nullable(); // نصي - اسم Riding Company
            $table->string('lead_stage')->nullable(); // نصي - اسم Lead Stage
            $table->text('notes')->nullable(); // Notes من Driver
            $table->string('driver_num')->nullable(); // Driver Num من Driver
            $table->timestamps();

            // Indexes
            $table->index('driver_id');
            $table->index('assigned_to');
            $table->index('created_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_follow_ups');
    }
};

