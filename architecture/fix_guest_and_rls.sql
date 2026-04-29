-- 1. FIX INFINITE RECURSION
-- We create a function to check membership without triggering the RLS again.
CREATE OR REPLACE FUNCTION public.check_group_membership(gid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = gid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. DROP PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "Users can see co-members" ON public.group_members;
DROP POLICY IF EXISTS "Groups are viewable by members" ON public.groups;
DROP POLICY IF EXISTS "Expenses are viewable by group members" ON public.expenses;
DROP POLICY IF EXISTS "Expenses are insertable by group members" ON public.expenses;
DROP POLICY IF EXISTS "Splits are viewable by group members" ON public.expense_splits;
DROP POLICY IF EXISTS "Splits are insertable by group members" ON public.expense_splits;
DROP POLICY IF EXISTS "Settlements are viewable by group members" ON public.settlements;
DROP POLICY IF EXISTS "Settlements are insertable by group members" ON public.settlements;

-- 3. RE-CREATE POLICIES USING THE FUNCTION
CREATE POLICY "Users can see co-members" ON public.group_members
    FOR SELECT USING (public.check_group_membership(group_id));

CREATE POLICY "Groups are viewable by members" ON public.groups
    FOR SELECT USING (public.check_group_membership(id));

CREATE POLICY "Expenses are viewable by group members" ON public.expenses
    FOR SELECT USING (public.check_group_membership(group_id));

CREATE POLICY "Expenses are insertable by group members" ON public.expenses
    FOR INSERT WITH CHECK (public.check_group_membership(group_id));

CREATE POLICY "Splits are viewable by group members" ON public.expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expenses e 
            WHERE e.id = expense_id AND public.check_group_membership(e.group_id)
        )
    );

CREATE POLICY "Splits are insertable by group members" ON public.expense_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses e 
            WHERE e.id = expense_id AND public.check_group_membership(e.group_id)
        )
    );

CREATE POLICY "Settlements are viewable by group members" ON public.settlements
    FOR SELECT USING (public.check_group_membership(group_id));

CREATE POLICY "Settlements are insertable by group members" ON public.settlements
    FOR INSERT WITH CHECK (public.check_group_membership(group_id));

-- 4. MODIFY USERS TABLE FOR GUESTS
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Allow inserts into users for guest creation
-- (Existing users are created via auth trigger, but we need manual insert for guests)
CREATE POLICY "Allow manual insert for guests" ON public.users
    FOR INSERT WITH CHECK (is_guest = true OR id = auth.uid());
