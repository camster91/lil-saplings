require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://www.google-analytics.com"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Gzip/Brotli compression
app.use(compression());

// Parse JSON bodies for the contact form API
app.use(express.json());

// Serve static files with caching headers
app.use(express.static(path.join(__dirname), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve robots.txt and sitemap.xml explicitly
app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Clean URL routes
const pages = ['about', 'services', 'packages', 'contact', 'blog'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Redirect .html URLs to clean versions for SEO
app.get(/\.html$/, (req, res) => {
    const clean = req.path.replace('.html', '');
    if (clean === '/index') {
        return res.redirect(301, '/');
    }
    res.redirect(301, clean);
});

// ── Mailgun contact form API ──
app.post('/api/contact', async (req, res) => {
    const { name, email, service, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
        console.error('Mailgun environment variables not set');
        return res.status(500).json({ error: 'Email service not configured.' });
    }

    const formData = new URLSearchParams();
    formData.append('from', `Lil Saplings Website <noreply@${MAILGUN_DOMAIN}>`);
    formData.append('to', 'lilsaplingschildcare@gmail.com');
    formData.append('subject', `New Inquiry from ${name} — ${service || 'General'}`);
    formData.append('text', `Name: ${name}\nEmail: ${email}\nService: ${service || 'Not specified'}\n\nMessage:\n${message}`);
    formData.append('h:Reply-To', email);

    try {
        const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
            },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Mailgun error:', errText);
            return res.status(502).json({ error: 'Failed to send email.' });
        }

        res.json({ success: true, message: 'Your message has been sent! I\'ll get back to you within 24 hours.' });
    } catch (err) {
        console.error('Mailgun request failed:', err);
        res.status(502).json({ error: 'Failed to send email.' });
    }
});

// Fallback: 404 for unknown routes
app.get(/(.*)/, (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, '500.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
