-- Ten preset colours, or a custom colour as #rrggbb.
alter table public.projects drop constraint if exists projects_color_check;
alter table public.projects add constraint projects_color_check check (
  color in ('green','teal','blue','indigo','purple','pink','red','orange','amber','gray')
  or color ~ '^#[0-9a-f]{6}$'
);
