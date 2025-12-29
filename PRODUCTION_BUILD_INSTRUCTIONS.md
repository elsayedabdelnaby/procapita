# Production Build Instructions

## Error: "Unable to locate file in Vite manifest"

This error occurs when the built assets are missing on your production server.

## Solution: Build and Upload Assets

### Option 1: Build Locally and Upload (Recommended)

**On your local machine (Windows/Laragon):**

1. **Build the assets:**
   ```bash
   npm install
   npm run build
   ```

2. **Upload to server:**
   - Upload the entire `public/build` directory to your server
   - Make sure `public/build/manifest.json` exists on the server
   - Upload all files in `public/build/assets/` directory

**Important files to upload:**
- `public/build/manifest.json` (REQUIRED)
- `public/build/assets/app-*.css`
- `public/build/assets/app-*.js`
- All other files in `public/build/assets/`

### Option 2: Build on Server (If Node.js is available)

**SSH into your production server:**

```bash
cd /path/to/your/project

# Install dependencies (if not already installed)
npm install --production

# Run Wayfinder command first (if it fails, use build:skip-wayfinder instead)
php artisan wayfinder:generate --with-form

# Build assets
# If wayfinder command fails, use: npm run build:skip-wayfinder
npm run build

# Clear Laravel caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

**If Wayfinder command fails**, you can skip it:
```bash
npm run build:skip-wayfinder
```

This will build without running the wayfinder command first.

### Verify Build Files

After building, check that these files exist:

**Local (before upload):**
- `public/build/manifest.json`
- `public/build/assets/app-*.css`
- `public/build/assets/app-*.js`

**On Server (after upload):**
- `public/build/manifest.json` should exist
- `public/build/assets/` directory should contain CSS and JS files

### Quick Check Commands

**On server, verify files exist:**
```bash
ls -la public/build/manifest.json
ls -la public/build/assets/
```

If these files don't exist, you need to build and upload them.

### After Uploading

1. **Clear Laravel caches on server:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   php artisan view:clear
   ```

2. **Set correct permissions:**
   ```bash
   chmod -R 755 public/build
   ```

3. **Verify APP_URL in .env:**
   ```env
   APP_URL=https://ubercrm.dopave.com
   ```

### Troubleshooting

**Still getting the error?**

1. Check if `public/build/manifest.json` exists on server
2. Check file permissions: `chmod -R 755 public/build`
3. Verify `APP_URL` matches your domain exactly
4. Clear all caches: `php artisan optimize:clear`
5. Check web server can access `/build` directory

**Build fails locally?**

- Make sure all dependencies are installed: `npm install`
- Check for TypeScript/ESLint errors
- Try: `npm run build` again

