<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    /**
     * Get the company ID for the current user.
     * For super admins, returns the selected company from session, or null for all companies.
     * For regular users, returns their company_id.
     */
    protected function getCompanyId(): ?int
    {
        $user = Auth::user();
        
        if (! $user) {
            return null;
        }
        
        if ($user->isSuperAdmin()) {
            return session('selected_company_id', null);
        }
        
        return $user->company_id;
    }
}
