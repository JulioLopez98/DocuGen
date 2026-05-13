export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /historial
Disallow: /ajustes
Disallow: /onboarding

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
