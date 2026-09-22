import { promises as fs } from "fs";
import path from "path";

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

// 별도 DB 없이 JSON 파일에 저장한다. (data/ 는 gitignore 대상)
const DB_PATH = path.join(process.cwd(), "data", "posts.json");

async function readAll(): Promise<Post[]> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf-8")) as Post[];
  } catch {
    return [];
  }
}

async function writeAll(posts: Post[]) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(posts, null, 2), "utf-8");
}

export async function listPosts(query: string, page: number, pageSize: number) {
  const q = query.trim().toLowerCase();
  const all = (await readAll()).sort((a, b) => b.id - a.id);
  const filtered = q
    ? all.filter((p) =>
        [p.title, p.content, p.author].some((s) => s.toLowerCase().includes(q)),
      )
    : all;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    posts: filtered.slice((current - 1) * pageSize, current * pageSize),
    total: filtered.length,
    totalPages,
    page: current,
  };
}

export async function getPost(id: number) {
  return (await readAll()).find((p) => p.id === id) ?? null;
}

export async function increaseViews(id: number) {
  const all = await readAll();
  const post = all.find((p) => p.id === id);
  if (!post) return null;
  post.views += 1;
  await writeAll(all);
  return post;
}

export async function createPost(input: PostInput) {
  const all = await readAll();
  const now = new Date().toISOString();
  const post: Post = {
    id: all.reduce((m, p) => Math.max(m, p.id), 0) + 1,
    ...input,
    views: 0,
    createdAt: now,
    updatedAt: now,
  };
  await writeAll([...all, post]);
  return post;
}

export async function updatePost(id: number, input: PostInput) {
  const all = await readAll();
  const post = all.find((p) => p.id === id);
  if (!post) return null;
  Object.assign(post, input, { updatedAt: new Date().toISOString() });
  await writeAll(all);
  return post;
}

export async function deletePost(id: number) {
  const all = await readAll();
  await writeAll(all.filter((p) => p.id !== id));
}
