-- FIX: Infinite Recursion in RLS Policies
-- Run this in the Supabase SQL Editor

-- 1. Drop problematic policies
DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can see their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can see co-members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

DROP POLICY IF EXISTS "Groups are viewable by members" ON public.groups;
DROP POLICY IF EXISTS "Expenses are viewable by group members" ON public.expenses;
DROP POLICY IF EXISTS "Expenses are insertable by group members" ON public.expenses;
DROP POLICY IF EXISTS "Splits are viewable by group members" ON public.expense_splits;
DROP POLICY IF EXISTS "Splits are insertable by group members" ON public.expense_splits;
DROP POLICY IF EXISTS "Settlements are viewable by group members" ON public.settlements;
DROP POLICY IF EXISTS "Settlements are insertable by group members" ON public.settlements;

-- 2. Re-create non-recursive policies

-- Group Members
CREATE POLICY "Users can see their own memberships" ON public.group_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can see co-members" ON public.group_members
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join groups" ON public.group_members
    FOR INSERT WITH CHECK (true);

-- Groups
CREATE POLICY "Groups are viewable by members" ON public.groups
    FOR SELECT USING (
        id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

-- Expenses
CREATE POLICY "Expenses are viewable by group members" ON public.expenses
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Expenses are insertable by group members" ON public.expenses
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

-- Splits
CREATE POLICY "Splits are viewable by group members" ON public.expense_splits
    FOR SELECT USING (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON gm.group_id = e.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Splits are insertable by group members" ON public.expense_splits
    FOR INSERT WITH CHECK (
        expense_id IN (
            SELECT e.id FROM public.expenses e
            JOIN public.group_members gm ON gm.group_id = e.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

-- Settlements
CREATE POLICY "Settlements are viewable by group members" ON public.settlements
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Settlements are insertable by group members" ON public.settlements
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );
