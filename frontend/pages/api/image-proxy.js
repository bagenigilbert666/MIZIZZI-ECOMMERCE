export default async function handler(req, res) {
  // Allow: /api/image-proxy?url=<encoded absolute url>
  const { url } = req.query;
  if (!url) {
    res.status(400).send('Missing url query parameter');
    return;
  }

  let target;
  try {
    target = new URL(decodeURIComponent(Array.isArray(url) ? url[0] : url));
  } catch (err) {
    res.status(400).send('Invalid url');
    return;
  }

  // Optional: basic host allowlist to avoid being an open proxy.
  // Add or remove hostnames as needed.
  const ALLOWED_HOSTS = [
    'mizizzi-ecommerce-1.onrender.com',
    'images.unsplash.com',
    'res.cloudinary.com',
    'upload.wikimedia.org',
    'via.placeholder.com',
    'hebbkx1anhila5yf.public.blob.vercel-storage.com',
    'vercel-storage.com',
    'localhost',
    '127.0.0.1',
    // add more hosts you trust (e.g., 'images.pexels.com') or remove check to allow all
  ];

  if (!ALLOWED_HOSTS.some(h => target.hostname === h || target.hostname.endsWith('.' + h))) {
    // If you want to allow any host, comment out this block. Keeping it for safety.
    res.status(403).send('Host not allowed');
    return;
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      res.status(502).send('Upstream fetch failed');
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    // Cache on CDN for a day (adjust as needed)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('image-proxy error', err);
    res.status(500).send('Proxy error');
  }
}
