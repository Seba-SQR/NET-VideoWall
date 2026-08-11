const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Unificamos Websockets y HTTP en el mismo servidor para evitar el error 'Upgrade Required'
const wss = new WebSocket.Server({ server });

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

let videowalls = new Map();

wss.on('connection', (ws, req) => {
    // Extraer parámetros de la URL de conexión, ej: ?role=display&vid=vw1&did=1
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const role = urlParams.get('role');
    const videowallId = urlParams.get('vid');
    const displayId = urlParams.get('did');

    if (!videowalls.has(videowallId)) {
        videowalls.set(videowallId, {
            broadcaster: null,
            displays: new Map()
        });
    }

    const videowall = videowalls.get(videowallId);

    if (role === 'broadcaster') {
        videowall.broadcaster = ws;
        console.log(`--- Emisor [ID: ${videowallId}] conectado ---`);
    } else if (role === 'display') {
        videowall.displays.set(displayId, ws);
        console.log(`--- Display [${videowallId}/${displayId}] conectado/recargado ---`);
        
        // Si el emisor ya está activo, le pedimos una oferta exclusiva para esta nueva pantalla
        if (videowall.broadcaster && videowall.broadcaster.readyState === WebSocket.OPEN) {
            videowall.broadcaster.send(JSON.stringify({ type: 'new_viewer', displayId }));
        }
    }

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return console.error("Error parseando JSON recibido:", e);
        }

        switch (data.type) {
            case 'offer':
                // display envía una oferta dirigida a broadcaster
                if (!videowall.broadcaster || videowall.broadcaster.readyState !== WebSocket.OPEN) {
                    break;
                }
            
                videowall.broadcaster.send(JSON.stringify({
                    type: 'offer',
                    displayId: data.displayId,
                    offer: data.offer
                }));
                break;

            case 'answer':
                // broadcaster envía una respuesta dirigida a un display
                const targetDisplay = videowall.displays.get(data.displayId);

                if (!targetDisplay || targetDisplay.readyState !== WebSocket.OPEN) {
                    break;
                }

                targetDisplay.send(JSON.stringify({
                    type: 'answer',
                    answer: data.answer
                }));
                break;

            case 'candidate':
                // Enrutamiento de candidatos ICE bidireccional
                if (data.to === 'broadcaster') {
                    if (videowall.broadcaster && videowall.broadcaster.readyState === WebSocket.OPEN) {
                        videowall.broadcaster.send(JSON.stringify({ type: 'candidate', displayId: data.displayId, candidate: data.candidate }));
                    }
                } else if (data.to === 'display') {
                    const targetDisp = videowall.displays.get(data.displayId);
                    if (targetDisp && targetDisp.readyState === WebSocket.OPEN) {
                        targetDisp.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        if (role === 'broadcaster') {
            if (videowall.broadcaster === ws) {
                videowall.broadcaster = null;
                console.log(`--- Broadcaster [${videowallId}] desconectado ---`);
            }
        } else if (role === 'display') {
            if (videowall.displays.get(displayId) === ws) {
                videowall.displays.delete(displayId);
                console.log(`--- Display [${videowallId}/${displayId}] desconectado ---`);
            }
        }
    });
});

// Levantar todo en el puerto 3000
server.listen(3000, () => {
    console.log('Servidor del Video Wall corriendo en http://localhost:3000');
});