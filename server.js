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

// Fallback to index.html for SPA behavior
app.get(/^(?!\/health$).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
