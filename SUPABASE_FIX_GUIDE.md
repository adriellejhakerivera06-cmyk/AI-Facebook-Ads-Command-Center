# 🔧 Supabase RLS Infinite Recursion Fix Guide

## Problem
Error when creating workspace: **"infinite recursion detected in policy for relation 'workspace_members'"**

## Root Cause
The RLS policies for `workspace_members` table were querying the same table they were protecting, creating a circular dependency loop.

## Solution Applied
Created a `SECURITY DEFINER` helper function that bypasses RLS during admin role checks, breaking the recursion loop.

---

## 📋 How to Apply the Fix

### Option 1: Run Migration via Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd "C:\Users\Administrator\Documents\GITHUB PROJECTS\AI-Facebook-Ads-Command-Center"

# Run the fix migration
npx supabase db push
```

### Option 2: Run Migration via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Execute Migration**
   - Open the file: `supabase/migrations/02_fix_workspace_rls_recursion.sql`
   - Copy the entire content
   - Paste into SQL Editor
   - Click **"Run"**

4. **Verify Success**
   - Should see: "Success. No rows returned"
   - Check for any errors in the output

### Option 3: Manual Fix via SQL Editor

If migrations don't work, run this SQL directly:

```sql
-- Create helper function
CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix workspace_members policies
DROP POLICY IF EXISTS "select_own_memberships" ON public.workspace_members;
CREATE POLICY "select_own_memberships" ON public.workspace_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "insert_member_as_admin" ON public.workspace_members;
CREATE POLICY "insert_member_as_admin" ON public.workspace_members FOR INSERT
  TO authenticated WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "update_member_as_admin" ON public.workspace_members;
CREATE POLICY "update_member_as_admin" ON public.workspace_members FOR UPDATE
  TO authenticated USING (
    is_workspace_admin(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "delete_member_as_admin" ON public.workspace_members;
CREATE POLICY "delete_member_as_admin" ON public.workspace_members FOR DELETE
  TO authenticated USING (
    is_workspace_admin(workspace_id, auth.uid())
    OR user_id = auth.uid()
  );

-- Fix workspaces policies
DROP POLICY IF EXISTS "select_workspace_as_member" ON public.workspaces;
CREATE POLICY "select_workspace_as_member" ON public.workspaces FOR SELECT
  TO authenticated USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_workspace_as_admin" ON public.workspaces;
CREATE POLICY "update_workspace_as_admin" ON public.workspaces FOR UPDATE
  TO authenticated USING (
    is_workspace_admin(id, auth.uid())
  );
```

---

## ✅ Testing the Fix

After applying the migration:

1. **Log in to your app**
2. **Try creating a workspace:**
   - Go to: `/workspaces/new`
   - Enter workspace name (e.g., "ADS Manager")
   - Click "Create workspace"
3. **Expected result:** ✅ Workspace created successfully!

---

## 🔍 What Changed?

### Before (❌ Circular Recursion):
```sql
CREATE POLICY "select_own_memberships" ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members  -- 🔴 Queries same table!
      WHERE user_id = auth.uid()
    )
  );
```

### After (✅ No Recursion):
```sql
-- Helper function with SECURITY DEFINER (bypasses RLS)
CREATE FUNCTION is_workspace_admin(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members  -- ✅ Bypasses RLS!
    WHERE workspace_id = workspace_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy now uses helper function
CREATE POLICY "select_own_memberships" ON public.workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())  -- ✅ No recursion!
  );
```

The `SECURITY DEFINER` keyword makes the function execute with the privileges of the function owner (bypassing RLS), preventing the infinite recursion loop.

---

## 🚨 Troubleshooting

### Still Getting the Error?

1. **Check if migration was applied:**
   ```sql
   SELECT * FROM public.is_workspace_admin('00000000-0000-0000-0000-000000000000', auth.uid());
   ```
   - If function exists, you'll see TRUE or FALSE
   - If error "function does not exist", migration didn't apply

2. **Verify policies updated:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'workspace_members';
   ```
   - Should show updated policy definitions

3. **Clear browser cache** and try again

### Need Help?
Check Supabase logs:
- Dashboard → Logs → select "Database"
- Look for policy-related errors

---

## 📝 Summary

- ✅ Fixed infinite recursion in `workspace_members` RLS policies
- ✅ Fixed circular dependencies in `workspaces` policies  
- ✅ Created helper function `is_workspace_admin()` with `SECURITY DEFINER`
- ✅ Migration file: `02_fix_workspace_rls_recursion.sql`
- ✅ Updated base schema: `00_complete_schema.sql`

Now you can create workspaces without errors! 🎉
