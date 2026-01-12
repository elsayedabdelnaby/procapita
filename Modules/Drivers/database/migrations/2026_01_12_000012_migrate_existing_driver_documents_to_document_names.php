<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('document_names') || ! Schema::hasTable('driver_documents')) {
            return;
        }

        // Get unique document names with their riding companies from existing driver_documents
        $uniqueDocuments = DB::table('driver_documents')
            ->whereNotNull('name')
            ->select('name', 'riding_company_id')
            ->selectRaw('MIN(id) as id')
            ->groupBy('name', 'riding_company_id')
            ->get();

        // Group by document name to collect all riding companies for each name
        $documentGroups = [];
        foreach ($uniqueDocuments as $doc) {
            $name = $doc->name;
            if (! isset($documentGroups[$name])) {
                $documentGroups[$name] = [
                    'name' => $name,
                    'riding_company_ids' => [],
                    'first_id' => $doc->id,
                ];
            }
            if (! in_array($doc->riding_company_id, $documentGroups[$name]['riding_company_ids'])) {
                $documentGroups[$name]['riding_company_ids'][] = $doc->riding_company_id;
            }
        }

        // Create document_names records and update driver_documents
        foreach ($documentGroups as $group) {
            // Check if document name already exists
            $existingDocumentName = DB::table('document_names')
                ->where('name', $group['name'])
                ->first();

            if ($existingDocumentName) {
                // Update existing document name with all riding companies
                $allCompanyIds = array_unique(array_merge(
                    json_decode($existingDocumentName->riding_company_ids, true) ?? [],
                    $group['riding_company_ids']
                ));

                DB::table('document_names')
                    ->where('id', $existingDocumentName->id)
                    ->update([
                        'riding_company_ids' => json_encode($allCompanyIds),
                    ]);

                $documentNameId = $existingDocumentName->id;
            } else {
                // Create new document name
                // Get first driver document to get default values
                $firstDriverDoc = DB::table('driver_documents')
                    ->where('name', $group['name'])
                    ->where('riding_company_id', $group['riding_company_ids'][0])
                    ->first();

                $documentNameId = DB::table('document_names')->insertGetId([
                    'name' => $group['name'],
                    'riding_company_ids' => json_encode($group['riding_company_ids']),
                    'type' => 'file',
                    'required' => false,
                    'notes' => null,
                    'status' => $firstDriverDoc->status ?? 'pending',
                    'active' => true,
                    'created_at' => $firstDriverDoc->created_at ?? now(),
                    'updated_at' => now(),
                ]);
            }

            // Update all driver_documents with this name to reference the document_name_id
            DB::table('driver_documents')
                ->where('name', $group['name'])
                ->whereIn('riding_company_id', $group['riding_company_ids'])
                ->update([
                    'document_name_id' => $documentNameId,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear document_name_id references
        DB::table('driver_documents')->update(['document_name_id' => null]);
    }
};
