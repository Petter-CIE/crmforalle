-- Functions that only make sense for a signed-in user: anonymous callers are refused up front
-- (they already check the user's role inside; this is an extra layer).
revoke execute on function public.calendar_link(boolean) from anon, public;
revoke execute on function public.campaign_cancel(uuid) from anon, public;
revoke execute on function public.campaign_preview(uuid, jsonb) from anon, public;
revoke execute on function public.campaign_send(uuid) from anon, public;
revoke execute on function public.card_checkout_verify(uuid, text) from anon, public;
revoke execute on function public.order_subscription_invoice(uuid, public.plan_type, text, boolean, text, text) from anon, public;
grant execute on function public.calendar_link(boolean) to authenticated;
grant execute on function public.campaign_cancel(uuid) to authenticated;
grant execute on function public.campaign_preview(uuid, jsonb) to authenticated;
grant execute on function public.campaign_send(uuid) to authenticated;
grant execute on function public.card_checkout_verify(uuid, text) to authenticated;
grant execute on function public.order_subscription_invoice(uuid, public.plan_type, text, boolean, text, text) to authenticated;
