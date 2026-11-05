-- Read-only audit. Run in Supabase SQL Editor against the deployed database.
-- Every expected column should report OK. No timestamps are modified.
with expected(table_name, column_name) as (
  values
    ('profiles', 'created_at'),
    ('videos', 'created_at'),
    ('comments', 'created_at'),
    ('video_likes', 'created_at'),
    ('video_saves', 'created_at'),
    ('follows', 'created_at'),
    ('media_posts', 'created_at'),
    ('media_posts', 'published_at'),
    ('post_comments', 'created_at'),
    ('post_likes', 'created_at'),
    ('post_saves', 'created_at'),
    ('sounds', 'created_at'),
    ('sound_uploads', 'created_at'),
    ('sound_uploads', 'completed_at')
)
select e.table_name, e.column_name, c.data_type, c.column_default,
  case
    when c.column_name is null then 'MISSING'
    when c.data_type = 'timestamp with time zone' then 'OK'
    else 'REVIEW TYPE'
  end as status
from expected e
left join information_schema.columns c
  on c.table_schema = 'public'
  and c.table_name = e.table_name and c.column_name = e.column_name
order by e.table_name, e.column_name;

-- Detect additional timestamp columns created outside the migrations.
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and data_type = 'timestamp without time zone'
order by table_name, column_name;

-- Session timezone affects textual representation, not the stored instant.
show timezone;
