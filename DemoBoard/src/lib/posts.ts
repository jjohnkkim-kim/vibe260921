import { supabase } from "./supabase";

export type Post = {
  id: number;
  title: string;
  author: string;
  content: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

type PostInput = Pick<Post, "title" | "author" | "content">;

type PostRow = {
  id: number;
  title: string;
  author: string;
  content: string;
  views: number;
  created_at: string;
  updated_at: string;
};

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    content: row.content,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPosts(query: string, page: number, pageSize: number) {
  const q = query.trim();

  let countQuery = supabase.from("posts").select("*", { count: "exact", head: true });
  if (q) countQuery = countQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize;
  const to = from + pageSize - 1;

  let rowsQuery = supabase.from("posts").select("*").order("id", { ascending: false }).range(from, to);
  if (q) rowsQuery = rowsQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`);
  const { data, error } = await rowsQuery;
  if (error) throw error;

  return {
    posts: (data as PostRow[]).map(toPost),
    total,
    totalPages,
    page: current,
  };
}

export async function getPost(id: number) {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toPost(data as PostRow) : null;
}

export async function increaseViews(id: number) {
  const post = await getPost(id);
  if (!post) return null;
  const { data, error } = await supabase
    .from("posts")
    .update({ views: post.views + 1 })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toPost(data as PostRow);
}

export async function createPost(input: PostInput) {
  const { data, error } = await supabase.from("posts").insert(input).select().single();
  if (error) throw error;
  return toPost(data as PostRow);
}

export async function updatePost(id: number, input: PostInput) {
  const { data, error } = await supabase
    .from("posts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data as PostRow) : null;
}

export async function deletePost(id: number) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
