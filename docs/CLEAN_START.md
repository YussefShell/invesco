# Clean Start Instructions

If you're seeing 404 errors for `global-error.js`, `layout.css`, etc., follow these steps:

1. **Stop the dev server** (Ctrl+C in the terminal where it's running)

2. **Clean the build cache:**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
   - Or use Ctrl+Shift+Delete to clear browser cache

4. **Restart the dev server:**
   ```powershell
   npm run dev
   ```

5. **If issues persist:**
   ```powershell
   Remove-Item -Recurse -Force node_modules/.cache
   npm run dev
   ```

These errors are typically caused by stale cache from previous builds. The files exist and are correct - Next.js just needs a fresh build.

