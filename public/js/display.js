const response = await fetch("./display.json");
const config = await response.json();

console.log(config);

const mtxBaseUrl = `http://${config.mediaMtxServer}:${config.mediaMtxPort}/${config.mediaMtxPath}`;

await new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = `${mtxBaseUrl}/reader.js`;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const wrapper = document.getElementById("videowall-wrapper");
wrapper.style.width = `${config.videowallCols * 100}vw`;
wrapper.style.height = `${config.videowallRows * 100}vh`;
wrapper.style.transform = `translate(${-config.displayCol * 100}vw, ${-config.displayRow * 100}vh)`;

const video = document.getElementById("video");

const reader = new MediaMTXWebRTCReader({
  url: new URL(`${mtxBaseUrl}/whep`),
  user: config.mediaMtxUser,
  pass: config.mediaMtxPass,
  onError: (err) => console.error("[MediaMTX Error]:", err),
  onTrack: (evt) => {
    video.srcObject = evt.streams[0];
  },
});

const RELOAD_INTERVAL = 60 * 60 * 1000; //ONE HOUR

setTimeout(() => {
  window.location.reload();
}, RELOAD_INTERVAL);

window.addEventListener('beforeunload', () => {
  if (reader) reader.close();
});