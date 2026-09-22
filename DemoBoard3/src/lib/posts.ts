import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostRow, SearchField } from "@/lib/types";

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    userId: row.user_id,
    authorName: row.author_name,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function searchFilter(q: string, field: SearchField): string {
  const escaped = q.replace(/[%,]/g, "");
  if (field === "title") return `title.ilike.%${escaped}%`;
  if (field === "content") return `content.ilike.%${escaped}%`;
  return `title.ilike.%${escaped}%,content.ilike.%${escaped}%`;
}

export async function listPosts(
  supabase: SupabaseClient,
  q: string,
  field: SearchField,
  page: number,
  pageSize: number,
) {
  const query = q.trim();

  const filter = query ? searchFilter(query, field) : null;

  const countQuery = supabase.from("posts").select("*", { count: "exact", head: true });
  const { count, error: countError } = await (filter ? countQuery.or(filter) : countQuery);
  if (countError) throw countError;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize;
  const to = from + pageSize - 1;

  const rowsQuery = supabase.from("posts").select("*").order("id", { ascending: false }).range(from, to);
  const { data, error } = await (filter ? rowsQuery.or(filter) : rowsQuery);
  if (error) throw error;

  return {
    posts: (data as PostRow[]).map(toPost),
    total,
    totalPages,
    page: current,
  };
}

export async function getPost(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toPost(data as PostRow) : null;
}

export async function increaseViews(supabase: SupabaseClient, id: number, currentViews: number) {
  await supabase.from("posts").update({ views: currentViews + 1 }).eq("id", id);
}

export async function createPost(
  supabase: SupabaseClient,
  input: { title: string; content: string; userId: string; authorName: string },
) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title,
      content: input.content,
      user_id: input.userId,
      author_name: input.authorName,
    })
    .select()
    .single();
  if (error) throw error;
  return toPost(data as PostRow);
}

export async function updatePost(
  supabase: SupabaseClient,
  id: number,
  input: { title: string; content: string },
) {
  const { data, error } = await supabase
    .from("posts")
    .update({ title: input.title, content: input.content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data as PostRow) : null;
}

export async function deletePost(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase.from("posts").delete().eq("id", id).select().maybeSingle();
  if (error) throw error;
  return data !== null;
}
