-- Divid-o Core Schema
-- Amounts are stored as BIGINT to represent cents (Behavioral Rule 01)

-- 1. Users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Groups
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 4. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES public.users(id),
    description TEXT NOT NULL,
    amount BIGINT NOT NULL, -- Cents
    currency TEXT DEFAULT 'USD',
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expense Splits
CREATE TABLE IF NOT EXISTS public.expense_splits (
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount_owed BIGINT NOT NULL, -- Cents
    PRIMARY KEY (expense_id, user_id)
);

-- 6. Settlements
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES public.users(id),
    paid_to UUID REFERENCES public.users(id),
    amount BIGINT NOT NULL, -- Cents
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Users: Users can see all users (to find friends), but only update their own.
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Groups: Users can see groups they are a member of.
CREATE POLICY "Groups are viewable by members" ON public.groups
    FOR SELECT USING (
        id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON public.groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members: Users can see members of groups they belong to.
CREATE POLICY "Users can see their own memberships" ON public.group_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can see co-members" ON public.group_members
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join groups" ON public.group_members
    FOR INSERT WITH CHECK (true); -- Simplified for now, in a real app you'd check invitations


-- Expenses: Users can see expenses in groups they belong to.
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


-- Expense Splits: Users can see splits for expenses in groups they belong to.
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


-- Settlements: Users can see settlements in groups they belong to.
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

