-- Idempotent schema: `pnpm db:migrate` runs this whole file on every call.
-- Columns mirror the `Solicitation` contract in src/lib/solicitation.ts.

create extension if not exists pg_trgm;

create table if not exists solicitations (
  id text primary key,
  solicitation_number text not null,
  nsn text,
  part_number text,
  fsc text,
  nomenclature text,
  quantity integer,
  unit_of_issue text,
  purchase_request_number text,
  issue_date date not null,
  return_by_date date,
  set_aside text,
  has_technical_documents boolean,
  dibbs_url text not null,
  pdf_url text,
  extra jsonb not null default '{}',
  fetched_at timestamptz not null,
  -- Buying activity code, e.g. "SPE7M1". Derived so ingestion never has to know about it.
  office text generated always as (left(solicitation_number, 6)) stored,
  -- Search target. Plain `||` with coalesce instead of concat_ws, because generated
  -- columns need immutable expressions and concat_ws is only stable.
  haystack text generated always as (
    lower(
      solicitation_number || ' ' || coalesce(nsn, '') || ' ' ||
      coalesce(part_number, '') || ' ' || coalesce(nomenclature, '')
    )
  ) stored
);

-- Trigram GIN index serves `like '%term%'`, so partial NSNs and part numbers are indexed.
create index if not exists solicitations_haystack_trgm on solicitations using gin (haystack gin_trgm_ops);
create index if not exists solicitations_return_by_date on solicitations (return_by_date);
create index if not exists solicitations_issue_date on solicitations (issue_date);
create index if not exists solicitations_fsc on solicitations (fsc);
