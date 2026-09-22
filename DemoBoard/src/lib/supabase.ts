import { createClient } from "@supabase/supabase-js";

// posts.ts는 서버 컴포넌트/서버 액션에서만 호출되므로 클라이언트에 노출되는
// NEXT_PUBLIC_ 접두사 없이 서버 전용 환경변수를 사용한다.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase 환경변수(SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY)가 설정되지 않았습니다.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
