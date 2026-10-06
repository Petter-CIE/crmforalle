-- Storage policies (attachments, logos) and the feedback policies call private.is_platform_admin().
-- Postgres evaluates every permissive policy, so without execute rights any signed-in user reading
-- or deleting an attachment got "permission denied for function is_platform_admin".
-- The function only answers "is the current user a platform admin", so it is safe to expose.
grant execute on function private.is_platform_admin() to authenticated;
