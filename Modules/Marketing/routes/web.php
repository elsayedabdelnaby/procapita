<?php

use Illuminate\Support\Facades\Route;
use Modules\Marketing\app\Http\Controllers\CampaignChannelController;
use Modules\Marketing\app\Http\Controllers\CampaignController;
use Modules\Marketing\app\Http\Controllers\CampaignStatusController;
use Modules\Marketing\app\Http\Controllers\CampaignTypeController;
use Modules\Marketing\app\Http\Controllers\MarketingListController;
use Modules\Marketing\app\Http\Controllers\MarketingTemplateController;

Route::middleware(['auth', 'verified'])->prefix('marketing')->name('marketing.')->group(function () {
    // Campaigns Management
    // Note: 'create' and 'edit' routes must come BEFORE parameterized routes to avoid conflicts
    
    Route::middleware(['permission:marketing.campaigns.create'])->group(function () {
        Route::get('campaigns/create', [CampaignController::class, 'create'])->name('campaigns.create');
        Route::post('campaigns', [CampaignController::class, 'store'])->name('campaigns.store');
    });

    Route::middleware(['permission:marketing.campaigns.read'])->group(function () {
        Route::get('campaigns', [CampaignController::class, 'index'])->name('campaigns.index');
        Route::get('campaigns/{campaign}', [CampaignController::class, 'show'])->name('campaigns.show');
    });

    Route::middleware(['permission:marketing.campaigns.update'])->group(function () {
        Route::get('campaigns/{campaign}/edit', [CampaignController::class, 'edit'])->name('campaigns.edit');
        Route::put('campaigns/{campaign}', [CampaignController::class, 'update'])->name('campaigns.update');
    });

    Route::middleware(['permission:marketing.campaigns.delete'])->group(function () {
        Route::delete('campaigns/{campaign}', [CampaignController::class, 'destroy'])->name('campaigns.destroy');
    });

    Route::middleware(['permission:marketing.campaigns.pause'])->group(function () {
        Route::post('campaigns/{campaign}/pause', [CampaignController::class, 'pause'])->name('campaigns.pause');
    });

    Route::middleware(['permission:marketing.campaigns.activate'])->group(function () {
        Route::post('campaigns/{campaign}/activate', [CampaignController::class, 'activate'])->name('campaigns.activate');
    });

    // Marketing Lists Management
    Route::middleware(['permission:marketing.marketing_lists.create'])->group(function () {
        Route::get('marketing-lists/create', [MarketingListController::class, 'create'])->name('marketing-lists.create');
        Route::post('marketing-lists', [MarketingListController::class, 'store'])->name('marketing-lists.store');
    });

    Route::middleware(['permission:marketing.marketing_lists.read'])->group(function () {
        Route::get('marketing-lists', [MarketingListController::class, 'index'])->name('marketing-lists.index');
        Route::get('marketing-lists/{marketingList}', [MarketingListController::class, 'show'])->name('marketing-lists.show');
    });

    Route::middleware(['permission:marketing.marketing_lists.update'])->group(function () {
        Route::get('marketing-lists/{marketingList}/edit', [MarketingListController::class, 'edit'])->name('marketing-lists.edit');
        Route::put('marketing-lists/{marketingList}', [MarketingListController::class, 'update'])->name('marketing-lists.update');
    });

    Route::middleware(['permission:marketing.marketing_lists.delete'])->group(function () {
        Route::delete('marketing-lists/{marketingList}', [MarketingListController::class, 'destroy'])->name('marketing-lists.destroy');
    });

    // Marketing Templates Management
    Route::middleware(['permission:marketing.marketing_templates.create'])->group(function () {
        Route::get('templates/create', [MarketingTemplateController::class, 'create'])->name('templates.create');
        Route::post('templates', [MarketingTemplateController::class, 'store'])->name('templates.store');
    });

    Route::middleware(['permission:marketing.marketing_templates.read'])->group(function () {
        Route::get('templates', [MarketingTemplateController::class, 'index'])->name('templates.index');
        Route::get('templates/{template}', [MarketingTemplateController::class, 'show'])->name('templates.show');
    });

    Route::middleware(['permission:marketing.marketing_templates.update'])->group(function () {
        Route::get('templates/{template}/edit', [MarketingTemplateController::class, 'edit'])->name('templates.edit');
        Route::put('templates/{template}', [MarketingTemplateController::class, 'update'])->name('templates.update');
    });

    Route::middleware(['permission:marketing.marketing_templates.delete'])->group(function () {
        Route::delete('templates/{template}', [MarketingTemplateController::class, 'destroy'])->name('templates.destroy');
    });

    // Campaign Types Management
    Route::middleware(['permission:marketing.campaign_types.create'])->group(function () {
        Route::get('campaign-types/create', [CampaignTypeController::class, 'create'])->name('campaign-types.create');
        Route::post('campaign-types', [CampaignTypeController::class, 'store'])->name('campaign-types.store');
    });

    Route::middleware(['permission:marketing.campaign_types.read'])->group(function () {
        Route::get('campaign-types', [CampaignTypeController::class, 'index'])->name('campaign-types.index');
    });

    Route::middleware(['permission:marketing.campaign_types.update'])->group(function () {
        Route::get('campaign-types/{campaignType}/edit', [CampaignTypeController::class, 'edit'])->name('campaign-types.edit');
        Route::put('campaign-types/{campaignType}', [CampaignTypeController::class, 'update'])->name('campaign-types.update');
    });

    Route::middleware(['permission:marketing.campaign_types.delete'])->group(function () {
        Route::delete('campaign-types/{campaignType}', [CampaignTypeController::class, 'destroy'])->name('campaign-types.destroy');
    });

    // Campaign Statuses Management
    Route::middleware(['permission:marketing.campaign_statuses.create'])->group(function () {
        Route::get('campaign-statuses/create', [CampaignStatusController::class, 'create'])->name('campaign-statuses.create');
        Route::post('campaign-statuses', [CampaignStatusController::class, 'store'])->name('campaign-statuses.store');
    });

    Route::middleware(['permission:marketing.campaign_statuses.read'])->group(function () {
        Route::get('campaign-statuses', [CampaignStatusController::class, 'index'])->name('campaign-statuses.index');
    });

    Route::middleware(['permission:marketing.campaign_statuses.update'])->group(function () {
        Route::get('campaign-statuses/{campaignStatus}/edit', [CampaignStatusController::class, 'edit'])->name('campaign-statuses.edit');
        Route::put('campaign-statuses/{campaignStatus}', [CampaignStatusController::class, 'update'])->name('campaign-statuses.update');
    });

    Route::middleware(['permission:marketing.campaign_statuses.delete'])->group(function () {
        Route::delete('campaign-statuses/{campaignStatus}', [CampaignStatusController::class, 'destroy'])->name('campaign-statuses.destroy');
    });

    // Campaign Channels Management
    Route::middleware(['permission:marketing.campaign_channels.create'])->group(function () {
        Route::get('campaign-channels/create', [CampaignChannelController::class, 'create'])->name('campaign-channels.create');
        Route::post('campaign-channels', [CampaignChannelController::class, 'store'])->name('campaign-channels.store');
    });

    Route::middleware(['permission:marketing.campaign_channels.read'])->group(function () {
        Route::get('campaign-channels', [CampaignChannelController::class, 'index'])->name('campaign-channels.index');
    });

    Route::middleware(['permission:marketing.campaign_channels.update'])->group(function () {
        Route::get('campaign-channels/{campaignChannel}/edit', [CampaignChannelController::class, 'edit'])->name('campaign-channels.edit');
        Route::put('campaign-channels/{campaignChannel}', [CampaignChannelController::class, 'update'])->name('campaign-channels.update');
    });

    Route::middleware(['permission:marketing.campaign_channels.delete'])->group(function () {
        Route::delete('campaign-channels/{campaignChannel}', [CampaignChannelController::class, 'destroy'])->name('campaign-channels.destroy');
    });
});

