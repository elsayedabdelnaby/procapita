# Facebook Lead Ads Integration - Complete Guide

## 📋 Overview

This guide provides complete instructions for setting up Facebook Lead Ads integration with your CRM. The integration allows you to automatically sync leads from Facebook Lead Ads campaigns directly into your CRM system.

## 🎯 Integration Flow

The integration follows a 4-step process:

1. **Connect Facebook Account** - User logs in with their Facebook business account
2. **Select Facebook Page** - Choose which Facebook page to use
3. **Select Lead Form** - Choose the specific lead form from the page
4. **Map Fields** - Map Facebook form fields to CRM driver fields

---

## 📝 Step-by-Step Setup

### Step 1: Connect Facebook Account

1. Navigate to **Riding Company** → **Integrations** tab
2. Click **"Connect Facebook Account"** button
3. A popup window will open with Facebook OAuth login
4. **Log in with your Facebook business account** (the account that manages your Facebook pages)
5. Grant the required permissions:
   - `pages_show_list` - To list your Facebook pages
   - `pages_read_engagement` - To read page engagement
   - `leads_retrieval` - To retrieve leads from Lead Ads
6. After successful login, the popup will close automatically
7. You'll see "Connected as [Your Name]" confirmation

**Important Notes:**
- Use the Facebook account that has admin access to the pages you want to use
- Each user can connect their own Facebook account
- The integration uses User Delegated Access - each user's data is separate

### Step 2: Select Facebook Page

1. After connecting your account, you'll automatically see the **Configure** step
2. In the **Page** dropdown, select the Facebook page you want to use
3. The system will automatically load all available pages from your account
4. If no pages appear:
   - Make sure you have admin access to at least one Facebook page
   - Try reconnecting your Facebook account
   - Check that the page is published and active

**Available Pages:**
- Only pages where you have admin or editor access will appear
- Pages are loaded in real-time from your Facebook account

### Step 3: Select Lead Form

1. After selecting a page, the **Form** dropdown will become active
2. Select the Lead Ads form you want to use
3. Forms are automatically loaded from the selected page
4. If no forms appear:
   - Make sure you have created Lead Ads forms in Facebook Ads Manager
   - The form must be associated with the selected page
   - Check that the form is active and published

**Form Information:**
- Each form shows its name and status
- Only active forms are available for selection
- Forms are loaded in real-time from Facebook

### Step 4: Map Fields

1. After selecting a form, you'll see two columns:
   - **Left**: Facebook Form Fields (from your Lead Ads form)
   - **Right**: CRM Driver Fields (where to map the data)

2. For each Facebook field:
   - Select the corresponding CRM field from the dropdown
   - You can choose to not map a field by selecting "-- Don't map --"
   - Required fields are marked with a red asterisk (*)

3. **Available CRM Fields:**
   - **Full Name** (required) - Maps to driver's full name
   - **Phone** (required) - Maps to driver's phone number
   - **WhatsApp Phone** (optional) - Maps to driver's WhatsApp number
   - **Email** (optional) - Maps to driver's email address
   - **Notes** (optional) - Maps additional information to driver notes

4. Click **"Save Field Mapping"** to save your configuration

5. After saving, the integration will be **activated automatically**

---

## 🔄 Syncing Leads

### Manual Sync

1. After completing the setup, you'll see a **"Sync Leads"** button
2. Click it to manually sync leads from Facebook
3. The system will:
   - Fetch all new leads from the selected form
   - Map fields according to your configuration
   - Create new drivers in the CRM
   - Update existing drivers if they match by phone number

### Automatic Sync

- The integration can be configured to sync automatically (requires webhook setup)
- Check with your administrator for automatic sync configuration

---

## 📊 Field Mapping Details

### Facebook Form Fields

Facebook Lead Ads forms can have various field types:
- **Text** - Single-line text input
- **Email** - Email address
- **Phone** - Phone number
- **Full Name** - Full name (first + last)
- **Date** - Date picker
- **Dropdown** - Select from options
- **Multiple Choice** - Radio buttons or checkboxes

### CRM Driver Fields

**Required Fields:**
- `full_name` - Driver's full name (required for creating a driver)
- `phone` - Driver's phone number (required, used for duplicate detection)

**Optional Fields:**
- `whatsapp_phone` - WhatsApp phone number
- `email` - Email address
- `notes` - Additional notes or information

### Mapping Best Practices

1. **Always map Full Name and Phone** - These are required for creating drivers
2. **Map Phone to Phone field** - This ensures proper duplicate detection
3. **Use WhatsApp field** - If your form has a separate WhatsApp field, map it to `whatsapp_phone`
4. **Map Email** - If available, map email for better contact information
5. **Use Notes for additional data** - Map any extra fields to notes if they don't fit other fields

---

## 🔧 Configuration Details

### Integration Settings

The integration saves the following information:
- **Facebook User ID** - Your Facebook account ID
- **Facebook User Name** - Your Facebook account name
- **Facebook Page ID** - The selected page ID
- **Facebook Form ID** - The selected form ID
- **Field Mapping** - JSON mapping of Facebook fields to CRM fields
- **Access Token** - Encrypted token for API access
- **Token Expires At** - When the token expires (usually 60 days)

### Token Management

- Tokens are automatically refreshed when they expire
- If a token expires, you'll need to reconnect your Facebook account
- Tokens are stored securely and encrypted

---

## 🚨 Troubleshooting

### "Can't load URL" Error

**Problem:** Facebook OAuth popup shows "Can't load URL"

**Solution:**
1. Check that the redirect URI is added in Facebook App Settings
2. Go to Facebook App → Facebook Login → Settings
3. Add `https://yourdomain.com/ridingcarcompanies/facebook/callback` to Valid OAuth Redirect URIs
4. Make sure it matches exactly (including https://)
5. Wait 1-2 minutes after saving
6. Try again

### "Invalid Scopes" Error

**Problem:** Facebook shows "Invalid Scopes" error

**Solution:**
- This has been fixed in the latest version
- The integration now uses valid permissions:
  - `pages_show_list`
  - `pages_read_engagement`
  - `leads_retrieval`
- If you still see this error, clear your browser cache and try again

### No Pages Appear

**Problem:** After connecting, no pages show in the dropdown

**Solutions:**
1. Make sure you're logged in with an account that has admin access to pages
2. Check that your pages are published and active
3. Try reconnecting your Facebook account
4. Verify you have the `pages_show_list` permission

### No Forms Appear

**Problem:** After selecting a page, no forms appear

**Solutions:**
1. Make sure you have created Lead Ads forms in Facebook Ads Manager
2. Verify the forms are associated with the selected page
3. Check that the forms are active and published
4. Try selecting a different page

### No Fields Appear

**Problem:** After selecting a form, no fields appear

**Solutions:**
1. Make sure the form has fields defined
2. Check that you have access to the form
3. Try selecting a different form
4. Verify the form is active

### Leads Not Syncing

**Problem:** Clicking "Sync Leads" doesn't create any drivers

**Solutions:**
1. Check that the integration is active (green checkmark)
2. Verify field mapping is saved
3. Make sure you have mapped at least `full_name` and `phone`
4. Check that there are new leads in the Facebook form
5. Review the browser console for errors
6. Check `storage/logs/laravel.log` for server errors

### Duplicate Drivers

**Problem:** Same lead creates multiple drivers

**Solution:**
- The system detects duplicates by phone number
- Make sure you're mapping the phone field correctly
- If a driver with the same phone exists, it will be updated instead of creating a new one

---

## 🔐 Security & Privacy

### Data Security

- All Facebook access tokens are encrypted and stored securely
- Tokens are never exposed in the frontend
- API calls are made server-side only

### User Privacy

- Each user connects their own Facebook account
- Users can only access their own pages and leads
- Integration data is isolated per user
- Users can disconnect their account at any time

### Facebook Permissions

The integration requests these permissions:
- **pages_show_list** - To list your Facebook pages
- **pages_read_engagement** - To read page engagement data
- **leads_retrieval** - To retrieve leads from Lead Ads forms

All permissions are user-delegated, meaning:
- You grant permissions to your own account
- You can revoke permissions at any time
- The app doesn't access data you haven't authorized

---

## 📚 Technical Details

### API Endpoints

The integration uses these Facebook Graph API endpoints:
- `/me` - Get user information
- `/me/accounts` - Get user's pages
- `/{page_id}/leadgen_forms` - Get lead forms for a page
- `/{form_id}` - Get form details and fields
- `/{form_id}/leads` - Get leads from a form

### Data Flow

1. **OAuth Flow:**
   - User clicks "Connect Facebook Account"
   - System generates OAuth URL with required scopes
   - User authorizes in Facebook popup
   - Facebook redirects to callback URL with authorization code
   - System exchanges code for access token
   - System exchanges short-lived token for long-lived token (60 days)
   - Token is saved to database

2. **Page Selection:**
   - System calls `/me/accounts` with user token
   - Returns list of pages user has access to
   - User selects a page

3. **Form Selection:**
   - System calls `/{page_id}/leadgen_forms` with page token
   - Returns list of lead forms for the page
   - User selects a form

4. **Field Mapping:**
   - System calls `/{form_id}` with page token
   - Returns form details including questions/fields
   - User maps Facebook fields to CRM fields

5. **Lead Sync:**
   - System calls `/{form_id}/leads` with page token
   - Returns all leads from the form
   - System maps fields according to configuration
   - Creates or updates drivers in CRM

### Database Schema

The integration stores data in `riding_company_integration_settings` table:
- `facebook_access_token` - Encrypted access token
- `facebook_user_id` - Facebook user ID
- `facebook_user_name` - Facebook user name
- `facebook_page_id` - Selected page ID
- `facebook_form_id` - Selected form ID
- `facebook_field_mapping` - JSON field mapping
- `facebook_token_expires_at` - Token expiration date

---

## 🆘 Support

If you encounter any issues:

1. **Check the logs:**
   - Browser console (F12) for frontend errors
   - `storage/logs/laravel.log` for server errors

2. **Verify configuration:**
   - Check `.env` file has Facebook credentials
   - Verify Facebook App settings
   - Ensure redirect URI is correct

3. **Common fixes:**
   - Clear browser cache
   - Clear Laravel cache: `php artisan config:clear && php artisan cache:clear`
   - Reconnect Facebook account
   - Check Facebook App is in correct mode (Development/Live)

4. **Contact support:**
   - Provide error messages
   - Include steps to reproduce
   - Share relevant log entries

---

## ✅ Checklist

Before using the integration, ensure:

- [ ] Facebook App is created and configured
- [ ] Redirect URI is added to Facebook App Settings
- [ ] `.env` file has `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
- [ ] `.env` file has `FACEBOOK_REDIRECT_URI` matching Facebook App Settings
- [ ] Laravel cache is cleared
- [ ] You have admin access to at least one Facebook page
- [ ] You have created Lead Ads forms in Facebook Ads Manager
- [ ] Forms are associated with your pages
- [ ] Forms are active and published

---

## 🎉 Success!

Once everything is configured:

1. ✅ Your Facebook account is connected
2. ✅ You've selected a page and form
3. ✅ Fields are mapped correctly
4. ✅ Integration is active
5. ✅ Leads will sync automatically or manually

You're all set! New leads from your Facebook Lead Ads will automatically appear in your CRM as drivers.

