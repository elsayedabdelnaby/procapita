<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('static'); // static, dynamic
            $table->json('criteria')->nullable(); // For dynamic lists
            $table->boolean('is_active')->default(true);
            $table->integer('contacts_count')->default(0);
            $table->timestamps();

            $table->index('company_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_lists');
    }
};

