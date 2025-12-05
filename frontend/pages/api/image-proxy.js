export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw) {
    res.status(400).end('Missing url query parameter');
    return;
  }

  let target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (err) {
    res.status(400).end('Invalid url');
    return;
  }

  // Allow only http(s) schemes
  if (!['http:', 'https:'].includes(target.protocol)) {
    res.status(400).end('Invalid protocol');
    return;
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      res.status(502).end('Upstream fetch failed');
      return;
    }

    const contentType = upstream.headers.get('content-type') || '';
    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      res.status(415).end('Unsupported media type');
      return;
    }

    // Forward content-type and safe cache-control
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('image-proxy error', err);
    res.status(500).end('Proxy error');
  }
}
