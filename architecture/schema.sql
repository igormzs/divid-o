-- Divid-o Initial Schema

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users on delete cascade,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_url text,
  created_by uuid REFERENCES public.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.group_members (
  group_id uuid REFERENCES public.groups(id) on delete cascade,
  user_id uuid REFERENCES public.users(id) on delete cascade,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) on delete cascade NOT NULL,
  paid_by uuid REFERENCES public.users(id) NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.expense_splits (
  expense_id uuid REFERENCES public.expenses(id) on delete cascade,
  user_id uuid REFERENCES public.users(id) on delete cascade,
  amount_owed numeric(12,2) NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) on delete cascade NOT NULL,
  paid_by uuid REFERENCES public.users(id) NOT NULL,
  paid_to uuid REFERENCES public.users(id) NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Temporary: Allow all operations for rapid prototyping.
-- Strict policies will be enforced prior to production launch.
CREATE POLICY "Allow all" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.groups FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.group_members FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.expense_splits FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.settlements FOR ALL USING (true);
