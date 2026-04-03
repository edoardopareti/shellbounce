export function buildWsUrl(): string {
  const configuredUrl = import.meta.env.VITE_SERVER_WS_URL as string | undefined;
  if (configuredUrl !== undefined && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${protocol}://${host}/ws`;
}
