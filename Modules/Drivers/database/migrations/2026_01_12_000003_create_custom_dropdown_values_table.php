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
        if (!Schema::hasTable('custom_dropdown_values')) {
            Schema::create('custom_dropdown_values', function (Blueprint $table) {
                $table->id();
                $table->string('field'); // e.g., 'governorate', 'cancel_reason'
                $table->string('value');
                $table->unsignedBigInteger('company_id')->nullable();
                $table->timestamps();

                $table->unique(['field', 'value', 'company_id']);
                $table->index('field');
                $table->index('company_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_dropdown_values');
    }
};
