<?php

use Illuminate\Support\Facades\Route;
use Modules\RidingCarCompanies\app\Http\Controllers\RidingCompanyController;
use Modules\RidingCarCompanies\app\Http\Controllers\RidingCompanyStageTemplateController;
use Modules\RidingCarCompanies\app\Http\Controllers\RidingCompanyDocumentRequirementController;
use Modules\RidingCarCompanies\app\Http\Controllers\RidingCompanyIntegrationController;
use Modules\RidingCarCompanies\app\Http\Controllers\RidingCompanyIntegrationSettingController;
use Modules\RidingCarCompanies\app\Http\Controllers\FacebookIntegrationController;

Route::middleware(['auth', 'verified'])->prefix('ridingcarcompanies')->name('ridingcarcompanies.')->group(function () {
    // Riding Company Selection (for admins)
    Route::post('riding-companies/select', [RidingCompanyController::class, 'select'])->name('ridingcompanies.select');
    Route::post('riding-companies/clear-selection', [RidingCompanyController::class, 'clearSelection'])->name('ridingcompanies.clear-selection');
    
    // Riding Companies
    Route::get('riding-companies', [RidingCompanyController::class, 'index'])->name('ridingcompanies.index');
    Route::get('riding-companies/create', [RidingCompanyController::class, 'create'])->name('ridingcompanies.create');
    Route::post('riding-companies', [RidingCompanyController::class, 'store'])->name('ridingcompanies.store');
    Route::get('riding-companies/{id}', [RidingCompanyController::class, 'show'])->name('ridingcompanies.show');
    Route::get('riding-companies/{id}/edit', [RidingCompanyController::class, 'edit'])->name('ridingcompanies.edit');
    Route::put('riding-companies/{id}', [RidingCompanyController::class, 'update'])->name('ridingcompanies.update');
    Route::delete('riding-companies/{id}', [RidingCompanyController::class, 'destroy'])->name('ridingcompanies.destroy');
    Route::post('riding-companies/{id}/toggle-active', [RidingCompanyController::class, 'toggleActive'])->name('ridingcompanies.toggle-active');
    Route::post('riding-companies/{id}/upload-logo', [RidingCompanyController::class, 'uploadLogo'])->name('ridingcompanies.upload-logo');
    Route::get('riding-companies/{id}/logo', [RidingCompanyController::class, 'getLogo'])->name('ridingcompanies.logo');
    Route::post('riding-companies/{id}/distribute-drivers', [RidingCompanyController::class, 'distributeDrivers'])->name('ridingcompanies.distribute-drivers');

    // Stage Templates
    Route::get('riding-companies/{ridingCompanyId}/stage-templates', [RidingCompanyStageTemplateController::class, 'index'])->name('stagetemplates.index');
    Route::get('riding-companies/{ridingCompanyId}/stage-templates/create', [RidingCompanyStageTemplateController::class, 'create'])->name('stagetemplates.create');
    Route::post('riding-companies/{ridingCompanyId}/stage-templates', [RidingCompanyStageTemplateController::class, 'store'])->name('stagetemplates.store');
    Route::get('stage-templates/{id}/edit', [RidingCompanyStageTemplateController::class, 'edit'])->name('stagetemplates.edit');
    Route::put('stage-templates/{id}', [RidingCompanyStageTemplateController::class, 'update'])->name('stagetemplates.update');
    Route::delete('stage-templates/{id}', [RidingCompanyStageTemplateController::class, 'destroy'])->name('stagetemplates.destroy');
    Route::post('stage-templates/{id}/toggle-active', [RidingCompanyStageTemplateController::class, 'toggleActive'])->name('stagetemplates.toggle-active');

    // Document Requirements
    Route::get('riding-companies/{ridingCompanyId}/document-requirements', [RidingCompanyDocumentRequirementController::class, 'index'])->name('documentrequirements.index');
    Route::get('riding-companies/{ridingCompanyId}/document-requirements/create', [RidingCompanyDocumentRequirementController::class, 'create'])->name('documentrequirements.create');
    Route::post('riding-companies/{ridingCompanyId}/document-requirements', [RidingCompanyDocumentRequirementController::class, 'store'])->name('documentrequirements.store');
    Route::get('document-requirements/{id}/edit', [RidingCompanyDocumentRequirementController::class, 'edit'])->name('documentrequirements.edit');
    Route::put('document-requirements/{id}', [RidingCompanyDocumentRequirementController::class, 'update'])->name('documentrequirements.update');
    Route::delete('document-requirements/{id}', [RidingCompanyDocumentRequirementController::class, 'destroy'])->name('documentrequirements.destroy');
    Route::post('document-requirements/{id}/toggle-active', [RidingCompanyDocumentRequirementController::class, 'toggleActive'])->name('documentrequirements.toggle-active');

    // Integrations
    Route::get('riding-companies/{ridingCompanyId}/integrations', [RidingCompanyIntegrationController::class, 'index'])->name('integrations.index');
    Route::get('riding-companies/{ridingCompanyId}/integrations/create', [RidingCompanyIntegrationController::class, 'create'])->name('integrations.create');
    Route::post('riding-companies/{ridingCompanyId}/integrations', [RidingCompanyIntegrationController::class, 'store'])->name('integrations.store');
    Route::get('integrations/{id}/edit', [RidingCompanyIntegrationController::class, 'edit'])->name('integrations.edit');
    Route::put('integrations/{id}', [RidingCompanyIntegrationController::class, 'update'])->name('integrations.update');
    Route::delete('integrations/{id}', [RidingCompanyIntegrationController::class, 'destroy'])->name('integrations.destroy');
    Route::post('integrations/{id}/toggle-active', [RidingCompanyIntegrationController::class, 'toggleActive'])->name('integrations.toggle-active');
    Route::post('integrations/{id}/test-connection', [RidingCompanyIntegrationController::class, 'testConnection'])->name('integrations.test-connection');

    // Integration Settings
    Route::get('riding-companies/{ridingCompanyId}/integration-settings', [RidingCompanyIntegrationSettingController::class, 'index'])->name('integrationsettings.index');
    Route::get('riding-companies/{ridingCompanyId}/integration-settings/create', [RidingCompanyIntegrationSettingController::class, 'create'])->name('integrationsettings.create');
    Route::post('riding-companies/{ridingCompanyId}/integration-settings', [RidingCompanyIntegrationSettingController::class, 'store'])->name('integrationsettings.store');
    Route::get('integration-settings/{id}/edit', [RidingCompanyIntegrationSettingController::class, 'edit'])->name('integrationsettings.edit');
    Route::put('integration-settings/{id}', [RidingCompanyIntegrationSettingController::class, 'update'])->name('integrationsettings.update');
    Route::delete('integration-settings/{id}', [RidingCompanyIntegrationSettingController::class, 'destroy'])->name('integrationsettings.destroy');
    Route::post('integration-settings/{id}/toggle-active', [RidingCompanyIntegrationSettingController::class, 'toggleActive'])->name('integrationsettings.toggle-active');
    Route::post('integration-settings/{id}/test-access', [RidingCompanyIntegrationSettingController::class, 'testAccess'])->name('integrationsettings.test-access');

    // Facebook Integration
    Route::get('riding-companies/{ridingCompanyId}/facebook', [FacebookIntegrationController::class, 'show'])->name('facebook.show');
    Route::post('riding-companies/{ridingCompanyId}/facebook/oauth-url', [FacebookIntegrationController::class, 'getOAuthUrl'])->name('facebook.oauth-url');
    Route::post('riding-companies/{ridingCompanyId}/facebook/pages', [FacebookIntegrationController::class, 'getPages'])->name('facebook.pages');
    Route::post('riding-companies/{ridingCompanyId}/facebook/campaigns', [FacebookIntegrationController::class, 'getCampaigns'])->name('facebook.campaigns');
    Route::post('riding-companies/{ridingCompanyId}/facebook/forms', [FacebookIntegrationController::class, 'getForms'])->name('facebook.forms');
    Route::post('riding-companies/{ridingCompanyId}/facebook/forms-by-campaign', [FacebookIntegrationController::class, 'getFormsByCampaign'])->name('facebook.forms-by-campaign');
    Route::post('riding-companies/{ridingCompanyId}/facebook/form-fields', [FacebookIntegrationController::class, 'getFormFields'])->name('facebook.form-fields');
    Route::post('riding-companies/{ridingCompanyId}/facebook/configuration', [FacebookIntegrationController::class, 'saveConfiguration'])->name('facebook.save-configuration');
    Route::post('riding-companies/{ridingCompanyId}/facebook/remove-form', [FacebookIntegrationController::class, 'removeForm'])->name('facebook.remove-form');
    Route::post('riding-companies/{ridingCompanyId}/facebook/field-mapping', [FacebookIntegrationController::class, 'saveFieldMapping'])->name('facebook.save-field-mapping');
    Route::post('riding-companies/{ridingCompanyId}/facebook/sync-leads', [FacebookIntegrationController::class, 'syncLeads'])->name('facebook.sync-leads');
});
