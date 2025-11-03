# Clear Cache Commands

After making changes to routes, controllers, or configuration, run these commands to clear Laravel's cache:

```bash
# Clear all caches
php artisan optimize:clear

# Or clear individually:
php artisan route:clear      # Clear route cache
php artisan config:clear     # Clear config cache
php artisan cache:clear      # Clear application cache
php artisan view:clear       # Clear compiled views

# For modules specifically
php artisan module:cache-clear

# Then try route:list again
php artisan route:list
```

## What Happened

The `CoreController` file was deleted but Laravel's route cache still referenced it. Running `php artisan optimize:clear` or `php artisan route:clear` will fix this.

## If Issue Persists

Sometimes on Windows, you may need to:

1. Close your terminal/command prompt
2. Reopen it
3. Run the cache clear commands again
4. Try `php artisan route:list`

## Current Routes

After clearing cache, you should see these Core module routes:

### Companies (Super Admin Only)
- `GET /core/companies` - List companies
- `GET /core/companies/create` - Create form
- `POST /core/companies` - Store company
- `GET /core/companies/{id}` - Show company
- `GET /core/companies/{id}/edit` - Edit form
- `PUT /core/companies/{id}` - Update company
- `DELETE /core/companies/{id}` - Delete company
- `POST /core/companies/{id}/activate` - Activate company
- `POST /core/companies/{id}/deactivate` - Deactivate company

### Roles
- `GET /core/roles` - List roles
- `GET /core/roles/hierarchy` - Hierarchy tree view
- `GET /core/roles/create` - Create form
- `POST /core/roles` - Store role
- `GET /core/roles/{id}` - Show role
- `GET /core/roles/{id}/edit` - Edit form
- `PUT /core/roles/{id}` - Update role
- `DELETE /core/roles/{id}` - Delete role

### Users
- `GET /core/users` - List users
- `GET /core/users/create` - Create form
- `POST /core/users` - Store user
- `GET /core/users/{id}` - Show user
- `GET /core/users/{id}/edit` - Edit form
- `PUT /core/users/{id}` - Update user
- `DELETE /core/users/{id}` - Delete user
- `POST /core/users/{id}/activate` - Activate user
- `POST /core/users/{id}/deactivate` - Deactivate user

All routes require authentication and are prefixed with `/core`.

