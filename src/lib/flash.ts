import { cookies } from "next/headers";

export type FlashKey = "saved" | "created" | "sent";

/** Leaves a short message for the next page (shown as a toast by ToastProvider). Call before redirect(). */
export async function flash(key: FlashKey) {
  (await cookies()).set("cfa_flash", key, { path: "/", maxAge: 20, sameSite: "lax", httpOnly: false });
}
