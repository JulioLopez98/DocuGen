export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /dashboard
Disallow: /generar
Disallow: /historial
Disallow: /ajustes
Disallow: /onboarding
Disallow: /plantillas

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
