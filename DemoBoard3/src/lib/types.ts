export type Post = {
  id: number;
  title: string;
  content: string;
  userId: string;
  authorName: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type PostRow = {
  id: number;
  title: string;
  content: string;
  user_id: string;
  author_name: string;
  views: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: number;
  postId: number;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type CommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export type SearchField = "title" | "content" | "both";
