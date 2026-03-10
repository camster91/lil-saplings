const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve robots.txt and sitemap.xml explicitly so they are not caught by the SPA fallback
app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Clean URL routes — serve .html files without the extension
const pages = ['about', 'services', 'packages', 'contact'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Redirect .html URLs to clean versions for SEO (avoid duplicate content)
app.get('*.html', (req, res) => {
    const clean = req.path.replace('.html', '');
    // index.html -> /
    if (clean === '/index') {
        return res.redirect(301, '/');
    }
    res.redirect(301, clean);
});

// Fallback to index.html for SPA behavior
app.get(/^(?!\/health$).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
