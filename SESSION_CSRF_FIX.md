# Fix 419 Page Expired Error

## Common Causes
1. Session cookie settings mismatch (HTTP vs HTTPS)
2. Session domain configuration
3. APP_URL not matching actual domain
4. Session table not accessible
5. Cache issues

## Step 1: Check .env Settings

On your production server (`procapita.dopave.com`), ensure your `.env` file has:

```env
# Application URL - MUST match your actual domain
APP_URL=http://procapita.dopave.com

# Session Configuration
SESSION_DRIVER=database
SESSION_LIFETIME=120

# IMPORTANT: Since you're using HTTP (not HTTPS), set this to false or leave empty
SESSION_SECURE_COOKIE=false

# Leave empty for auto-detection, or set to your domain
SESSION_DOMAIN=

# Same-site cookie setting
SESSION_SAME_SITE=lax
```

## Step 2: Clear All Caches

SSH into your server and run:

```bash
cd /home/ubercrm/public_html
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
```

## Step 3: Verify Session Table Exists

Make sure the `sessions` table exists in your database:

```bash
php artisan migrate:status
```

If the sessions table doesn't exist, run:

```bash
php artisan session:table
php artisan migrate
```

## Step 4: Check File Permissions

Ensure Laravel can write to storage:

```bash
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

## Step 5: If Using HTTPS (Recommended)

If you switch to HTTPS later, update `.env`:

```env
APP_URL=https://procapita.dopave.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

## Step 6: Test

1. Clear browser cookies for the domain
2. Try logging in again
3. Check browser console for cookie errors

## Additional Debugging

If still not working, check:

1. **Browser Console**: Look for cookie-related errors
2. **Network Tab**: Check if cookies are being set/sent
3. **Server Logs**: `storage/logs/laravel.log` for session errors

## Quick Fix Script

Run this on your server:

```bash
cd /home/ubercrm/public_html
php artisan config:clear
php artisan cache:clear
php artisan optimize:clear
```

Then restart your web server (if using PHP-FPM):

```bash
sudo service php8.2-fpm restart
# or
sudo systemctl restart php8.2-fpm
```


