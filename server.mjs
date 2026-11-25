import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const staticDir = path.join(__dirname, 'Vridhi--2-main');

app.disable('x-powered-by');

const SAFE_HOST_RE = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d{1,5})?$/i;

function buildCsp(isHttps) {
  const backupOrigin = String(process.env.BACKUP_SERVICE_ORIGIN || '').trim();
  const extraConnect = /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(backupOrigin) ? ` ${backupOrigin}` : '';
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' https://*.supabase.co${extraConnect}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (isHttps) {
    directives.push('upgrade-insecure-requests');
  }
  return directives.join('; ');
}

app.use((req, res, next) => {
  const protoHeader = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const hostHeader = String(req.headers.host || '').trim();
  if (protoHeader === 'http' && hostHeader && SAFE_HOST_RE.test(hostHeader) && !LOCAL_HOST_RE.test(hostHeader)) {
    return res.redirect(301, `https://${hostHeader}${req.originalUrl}`);
  }
  const isHttps = req.secure || protoHeader === 'https';
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', buildCsp(isHttps));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Keep server-only, documentation, header config, and test files private
app.use(['/supabase', '/backup-service', '/tests', '/_headers', '/README.md', '/DEPLOY.md', '/.git'], (_req, res) => {
  res.status(404).end();
});

app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.type('application/json');
  res.sendFile(path.join(staticDir, '.well-known', 'assetlinks.json'));
});

// Interactive Stress Test wireframe preview routes
app.get(['/wireframes', '/wireframes/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'wireframes', 'index.html'));
});
app.get('/wireframes/engine-rp.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(staticDir, 'modules', 'retirement-planner', 'engine.js'));
});
app.get('/wireframes/engine-st.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(staticDir, 'modules', 'stress-test', 'engine.js'));
});
app.use('/wireframes/assets', express.static(path.join(__dirname, 'src', 'assets', 'images')));

app.use(
  express.static(staticDir, {
    index: 'index.html',
    dotfiles: 'ignore',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.webmanifest')) {
        res.type('application/manifest+json');
      }
    },
  })
);

// Only fall back to index.html for navigation routes, not missing .js/.css assets
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).end();
  }
  return res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Vriddhi server listening on http://${HOST}:${PORT}`);
});
