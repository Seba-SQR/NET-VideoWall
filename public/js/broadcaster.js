const response = await fetch("./config.json");
const config = await response.json();

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
            url: new URL(`http://${window.location.hostname}:8889/${config.vid}/whip`),
            stream: localStream,

            videoCodec: 'h264',
            videoBitrate: 0,
            
            onConnected: () => {
                statusDiv.innerText = `Transmitiendo pantalla hacia "${videowallId}" en H.264.`;
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