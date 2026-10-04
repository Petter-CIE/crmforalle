/** The version that is deployed right now; compared with the one the open app was built with. */
export function GET() {
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
