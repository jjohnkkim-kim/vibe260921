"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUpAction(formData: FormData) {
  const { email, password } = parseCredentials(formData);
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email) redirect("/signup?error=email_required");
  if (password.length < 6) redirect("/signup?error=password_too_short");
  if (password !== passwordConfirm) redirect("/signup?error=password_mismatch");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) redirect("/signup?error=signup_failed");

  if (!data.session) {
    redirect("/login?status=confirm_email");
  }

  redirect("/");
}

export async function loginAction(formData: FormData) {
  const { email, password } = parseCredentials(formData);
  if (!email || !password) redirect("/login?error=credentials_required");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/login?error=invalid_credentials");

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
