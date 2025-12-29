# Server Build Fix - Wayfinder & Vite Permission Errors

## Problems
1. Wayfinder command doesn't exist: `There are no commands defined in the "wayfinder" namespace`
2. Vite permission denied: `sh: 1: vite: Permission denied`

## Quick Fix on Server

**Step 1: Ensure Wayfinder package is installed**

```bash
cd /home/dopavecom/public_html/ubercrm.dopave.com/ubercrm

# Install/update Composer dependencies
composer install --no-dev --optimize-autoloader

# Clear caches
php artisan config:clear
php artisan cache:clear
```

**Step 2: Fix node_modules permissions (if needed)**

```bash
# Fix permissions on node_modules
chmod -R 755 node_modules
chmod +x node_modules/.bin/*
```

**Step 3: Build (now uses npx to avoid permission issues)**

```bash
# This will skip wayfinder if command doesn't exist
npm run build
```

If wayfinder command still doesn't exist, the build will continue anyway. The wayfinder plugin will handle the error gracefully.

## Alternative: Build Locally and Upload (Recommended)

**On your local Windows machine:**

```bash
npm run build
```

Then upload the entire `public/build` directory to your server.

## Fix Git Ownership Warning (Optional)

```bash
git config --global --add safe.directory /home/dopavecom/public_html/ubercrm.dopave.com/ubercrm
```

## After Building

```bash
# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Set permissions
chmod -R 755 public/build
```

## Troubleshooting

**If wayfinder command is missing:**
- The build will still work - wayfinder types are optional
- You can install wayfinder: `composer require laravel/wayfinder`
- Or just build without it (it's mainly for development)

**If vite still has permission issues:**
- Use: `npx vite build` directly
- Or fix permissions: `chmod +x node_modules/.bin/vite`

