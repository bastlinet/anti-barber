import { auth } from "@/lib/auth";

export default auth((req) => {
  // logic handled in auth.config callback
});

export const config = {
  matcher: ["/admin/:path*"],
};
