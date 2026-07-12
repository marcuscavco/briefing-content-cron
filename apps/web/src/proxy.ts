import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ex-middleware no Next <16): renova a sessão Supabase a cada request
 * e protege as rotas do grupo (app).
 * Padrão canônico do @supabase/ssr: o client é recriado com os cookies do
 * request e getUser() valida o JWT no servidor de auth (nunca confiar em getSession aqui).
 */
export async function proxy(request: NextRequest) {
  // Encurtador bnrd.me: host próprio, público, sem sessão. bnrd.me/<code> é
  // reescrito para /r/<code> (registra clique + 302 para a notícia).
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (host === "bnrd.me" || host === "www.bnrd.me") {
    const path = request.nextUrl.pathname;
    if (path === "/" ) {
      // raiz do encurtador (sem código) → app principal
      return NextResponse.redirect("https://briefingnerd.com/", 302);
    }
    if (!path.startsWith("/r/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/r${path}`;
      return NextResponse.rewrite(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  // Rotas com autenticação própria (Bearer CRON_SECRET / token HMAC no link
  // do email) ou públicas por natureza (encurtador) — nunca caem no login.
  const isSelfAuthed =
    path.startsWith("/api/cron") || path.startsWith("/api/unsubscribe") || path.startsWith("/r/");

  // Landing e onboarding são públicos: o fluxo único de entrada começa sem conta.
  const isPublic = path === "/" || path.startsWith("/onboarding");

  if (!user && !isPublic && !isAuthPage && !isSelfAuthed && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Deep links (ex.: /b/<id> do WhatsApp) continuam após o login.
    if (path !== "/" && path !== "/dashboard") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Tudo exceto assets estáticos e favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
