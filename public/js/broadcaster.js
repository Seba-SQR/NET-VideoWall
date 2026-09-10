const response = await fetch("./broadcaster.json");
const config = await response.json();

console.log(config);

const mtxBaseUrl = `http://${config.mediaMtxServer}:${config.mediaMtxPort}/${config.mediaMtxPath}`;

await new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = `${mtxBaseUrl}/publisher.js`;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');

let localStream = null;
let publisher = null;

startBtn.onclick = async () => {
    try {
        statusDiv.innerText = "Selecciona la pantalla a compartir...";

        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 60 } },
            audio: false
        });
                
        statusDiv.innerText = "Pantalla capturada. Conectando al servidor...";
        startBtn.disabled = true;

        localStream.getVideoTracks()[0].onended = () => {
            if (publisher) {
                publisher.close();
            }
            statusDiv.innerText = "Transmisión finalizada por el usuario.";
            startBtn.disabled = false;
        };

        publisher = new MediaMTXWebRTCPublisher({
            url: new URL(`${mtxBaseUrl}/whip`),
            user: config.mediaMtxUser,
            pass: config.mediaMtxPass,

            stream: localStream,

            videoCodec: 'h264',
            videoBitrate: 0,
            
            onConnected: () => {
                statusDiv.innerText = `Transmitiendo pantalla hacia "${config.videowallId}" en H.264.`;
            },
            onError: (err) => {
                console.error("Error en MediaMTXWebRTCPublisher:", err);
                statusDiv.innerText = `Error: ${err}`;
                startBtn.disabled = false;
            }
        });

    } catch (err) {
        console.error("Error al iniciar:", err);
        statusDiv.innerText = "Error: Permiso denegado o falla al capturar pantalla.";
    }
};