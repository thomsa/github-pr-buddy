export const fetcher = (url: string, token: string) =>
  fetch(url, {
    headers: {
      ...(token ? { Authorization: `token ${token.replace('"', "")}` } : {}),
    },
  }).then((res) => res.json());
