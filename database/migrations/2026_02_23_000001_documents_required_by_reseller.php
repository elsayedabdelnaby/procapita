<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // document_names: add company_ids (reseller IDs) for which this document applies
        if (Schema::hasTable('document_names') && ! Schema::hasColumn('document_names', 'company_ids')) {
            Schema::table('document_names', function (Blueprint $table) {
                $table->json('company_ids')->nullable()->after('name');
            });
        }

        // company_document_requirements: requirements per reseller (company)
        if (Schema::hasTable('company_document_requirements')) {
            return;
        }

        Schema::create('company_document_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('file');
            $table->boolean('required')->default(false);
            $table->text('instructions')->nullable();
            $table->boolean('active')->default(true);
            $table->string('default_status', 20)->default('pending')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'type']);
            $table->index('active');
        });

        // Migrate from riding_company_document_requirements if tables exist
        if (Schema::hasTable('riding_company_document_requirements') && Schema::hasTable('riding_companies')) {
            $selects = [
                'riding_companies.company_id',
                'riding_company_document_requirements.name',
                'riding_company_document_requirements.type',
                'riding_company_document_requirements.required',
                'riding_company_document_requirements.instructions',
                'riding_company_document_requirements.active',
            ];
            if (Schema::hasColumn('riding_company_document_requirements', 'default_status')) {
                $selects[] = 'riding_company_document_requirements.default_status';
            }
            $rows = DB::table('riding_company_document_requirements')
                ->join('riding_companies', 'riding_company_document_requirements.riding_company_id', '=', 'riding_companies.id')
                ->select($selects)
                ->get();

            foreach ($rows as $row) {
                $defaultStatus = isset($row->default_status) ? $row->default_status : 'pending';
                DB::table('company_document_requirements')->insert([
                    'company_id' => $row->company_id,
                    'name' => $row->name,
                    'type' => $row->type,
                    'required' => (bool) $row->required,
                    'instructions' => $row->instructions,
                    'active' => (bool) $row->active,
                    'default_status' => $defaultStatus,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Populate document_names.company_ids from riding_company_ids if column still exists (pre-remove migration)
        if (Schema::hasTable('document_names') && Schema::hasColumn('document_names', 'riding_company_ids') && Schema::hasTable('riding_companies')) {
            $docNames = DB::table('document_names')->get();
            foreach ($docNames as $doc) {
                $ridingIds = json_decode($doc->riding_company_ids ?? '[]', true);
                if (empty($ridingIds)) {
                    continue;
                }
                $companyIds = DB::table('riding_companies')
                    ->whereIn('id', $ridingIds)
                    ->pluck('company_id')
                    ->unique()
                    ->values()
                    ->toArray();
                DB::table('document_names')->where('id', $doc->id)->update([
                    'company_ids' => json_encode($companyIds),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('document_names', 'company_ids')) {
            Schema::table('document_names', function (Blueprint $table) {
                $table->dropColumn('company_ids');
            });
        }
        Schema::dropIfExists('company_document_requirements');
    }
};
