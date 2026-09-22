import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment, CommentRow } from "@/lib/types";

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listComments(supabase: SupabaseClient, postId: number) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as CommentRow[]).map(toComment);
}

export async function createComment(
  supabase: SupabaseClient,
  input: { postId: number; content: string; userId: string; authorName: string },
) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      content: input.content,
      user_id: input.userId,
      author_name: input.authorName,
    })
    .select()
    .single();
  if (error) throw error;
  return toComment(data as CommentRow);
}

export async function deleteComment(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase.from("comments").delete().eq("id", id).select().maybeSingle();
  if (error) throw error;
  return data !== null;
}
