<?php

namespace Modules\Core\app\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckCompanyAccess
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Super admins can access everything
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Get company ID from route parameter
        $companyId = $request->route('company') ?? $request->input('company_id');

        if ($companyId && ! $user->canAccessCompany($companyId)) {
            abort(403, 'You do not have access to this company.');
        }

        return $next($request);
    }
}

