const STATUS_MESSAGES: Record<string, string> = {
  created: "게시글이 등록되었습니다.",
  updated: "게시글이 수정되었습니다.",
  deleted: "게시글이 삭제되었습니다.",
  commented: "댓글이 등록되었습니다.",
  confirm_email: "가입 확인 메일을 보냈습니다. 메일함을 확인한 뒤 로그인해주세요.",
};

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "권한이 없습니다. 본인이 작성한 글/댓글만 수정하거나 삭제할 수 있습니다.",
  load: "데이터를 불러오는 중 오류가 발생했습니다.",
  login_required: "로그인이 필요합니다.",
  title_required: "제목을 입력하세요.",
  title_too_long: "제목은 150자 이내로 입력하세요.",
  content_required: "내용을 입력하세요.",
  content_too_long: "내용은 20,000자 이내로 입력하세요.",
  comment_login_required: "댓글을 작성하려면 로그인이 필요합니다.",
  comment_empty: "댓글 내용을 입력하세요.",
  comment_too_long: "댓글은 1,000자 이내로 입력하세요.",
  email_required: "이메일을 입력하세요.",
  password_too_short: "비밀번호는 6자 이상이어야 합니다.",
  password_mismatch: "비밀번호가 일치하지 않습니다.",
  signup_failed: "회원가입에 실패했습니다. 이미 가입된 이메일이거나 잘못된 형식일 수 있습니다.",
  credentials_required: "이메일과 비밀번호를 입력하세요.",
  invalid_credentials: "로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.",
};

export function StatusBanner({ status, error }: { status?: string; error?: string }) {
  if (status && STATUS_MESSAGES[status]) {
    return (
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {STATUS_MESSAGES[status]}
      </div>
    );
  }
  if (error) {
    return (
      <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {ERROR_MESSAGES[error] ?? "오류가 발생했습니다."}
      </div>
    );
  }
  return null;
}
