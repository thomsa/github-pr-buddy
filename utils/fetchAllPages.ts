/**
 * Parses a Link header into an object mapping relation types (e.g., "next") to URLs.
 */
function parseLinkHeader(header: string): { [key: string]: string } {
  const links: { [key: string]: string } = {};
  const parts = header.split(",");

  parts.forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);

    if (match) {
      const url = match[1];
      const rel = match[2];

      links[rel] = url;
    }
  });

  return links;
}
/**
 * Fetches all pages of GitHub API results for the provided URL.
 */
export async function fetchAllPages(
  url: string,
  token: string,
): Promise<any[]> {
  let results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`GitHub API error: ${errorText}`);
    }
    const data = await response.json();

    results = results.concat(data);

    const linkHeader = response.headers.get("Link");

    if (linkHeader) {
      const links = parseLinkHeader(linkHeader);

      nextUrl = links.next || null;
    } else {
      nextUrl = null;
    }
  }

  return results;
}
