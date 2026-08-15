const express = require('express');
const path = require('path');

const app = express();

const config = require("./config/config.json");

app.use("/css", express.static("public/css"));
app.use("/js", express.static("public/js"));
app.use("/assets", express.static("public/assets"));

for (const [videowallId, videowall] of Object.entries(config.videowalls)) {

    // Ruta del broadcaster
    app.get(`/${videowallId}/broadcaster.html`, (req, res) => {
        res.sendFile(path.join(__dirname, "public", "broadcaster.html"));
    });

    app.get(`/${videowallId}/config.json`, (req, res) => {
            res.json({
                vid: videowallId,
                rows: videowall.rows,
                cols: videowall.cols,
            });
        });

    console.log(`Registered broadcaster: /${videowallId}/broadcaster.html`);

    // Rutas de los displays
    for (const [displayId, display] of Object.entries(videowall.displays)) {

        app.get(`/${videowallId}/${displayId}/display.html`, (req, res) => {
            res.sendFile(path.join(__dirname, "public", "display.html"));
        });

        app.get(`/${videowallId}/${displayId}/config.json`, (req, res) => {
            res.json({
                vid: videowallId,
                did: displayId,
                rows: videowall.rows,
                cols: videowall.cols,
                row: display.row,
                col: display.col
            });
        });

        console.log(`Registered display: /${videowallId}/${displayId}/display.html`);

    }
}

app.listen(3000, () => {
    console.log('Servidor del Video Wall corriendo en http://localhost:3000');
});