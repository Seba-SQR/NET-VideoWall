const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Unificamos Websockets y HTTP en el mismo servidor para evitar el error 'Upgrade Required'
const wss = new WebSocket.Server({ server });

// Servir los archivos HTML desde la misma carpeta donde ejecutes el script
app.use(express.static(__dirname));

let broadcaster = null;
let displays = new Map(); // Guarda las pantallas conectadas (ID -> WebSocket)

wss.on('connection', (ws, req) => {
    // Extraer parámetros de la URL de conexión, ej: ?role=display&id=1
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const role = urlParams.get('role');
    const displayId = urlParams.get('id');

    if (role === 'broadcaster') {
        broadcaster = ws;
        console.log('--- Emisor (Broadcaster) conectado ---');
    } else if (role === 'display') {
        displays.set(displayId, ws);
        console.log(`--- Pantalla [ID: ${displayId}] conectada/recargada ---`);
        
        // Si el emisor ya está activo, le pedimos una oferta exclusiva para esta nueva pantalla
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            broadcaster.send(JSON.stringify({ type: 'new_viewer', displayId }));
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
                if (!broadcaster || broadcaster.readyState !== WebSocket.OPEN) {
                    break;
                }
            
                broadcaster.send(JSON.stringify({
                    type: 'offer',
                    displayId: data.displayId,
                    offer: data.offer
                }));
                break;

            case 'answer':
                // broadcaster envía una respuesta dirigida a un display
                const targetDisplay = displays.get(data.displayId);

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
                    if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
                        broadcaster.send(JSON.stringify({ type: 'candidate', displayId: data.displayId, candidate: data.candidate }));
                    }
                } else if (data.to === 'display') {
                    const targetDisp = displays.get(data.displayId);
                    if (targetDisp && targetDisp.readyState === WebSocket.OPEN) {
                        targetDisp.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        if (ws === broadcaster) {
            broadcaster = null;
            console.log('Emisor desconectado');
        } else {
            // Eliminar la pantalla del mapa cuando se cierra la pestaña
            for (let [id, connectedWs] of displays.entries()) {
                if (connectedWs === ws) {
                    displays.delete(id);
                    console.log(`Pantalla [ID: ${id}] desconectada`);
                    break;
                }
            }
        }
    });
});

// Levantar todo en el puerto 3000
server.listen(3000, () => {
    console.log('Servidor del Video Wall corriendo en http://localhost:3000');
    console.log('Abre http://localhost:3000/broadcaster.html para transmitir.');
});