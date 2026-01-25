<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('driver_lists')) {
            Schema::create('driver_lists', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->json('columns')->nullable(); // Array of column names in order
                $table->json('all_conditions')->nullable(); // All conditions (AND)
                $table->json('any_conditions')->nullable(); // Any conditions (OR)
                $table->json('shared_with_users')->nullable(); // Array of user IDs
                $table->json('shared_with_groups')->nullable(); // Array of group IDs (if groups exist)
                $table->boolean('is_shared')->default(false);
                $table->boolean('is_default')->default(false);
                $table->boolean('show_in_metrics')->default(false);
                $table->string('default_sort_column')->nullable();
                $table->string('default_sort_order')->default('asc'); // asc or desc
                $table->timestamps();
                $table->softDeletes();

                $table->index('company_id');
                $table->index('created_by');
                $table->index('is_shared');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_lists');
    }
};
