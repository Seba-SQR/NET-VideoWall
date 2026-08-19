package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "path/filepath"
)

type Config struct {
    Server struct {
        Port int `json:"port"`
    } `json:"server"`

    Mediamtx struct {
        Server        string `json:"server"`
        WebrtcAddress string `json:"webrtc_address"`
    } `json:"mediamtx"`

    Videowalls map[string]struct {
        Rows         int    `json:"rows"`
        Cols         int    `json:"cols"`
        MediamtxPath string `json:"mediamtx_path"`
    } `json:"videowalls"`
}

func main() {
    configFile, err := os.Open("./config.json")
    if err != nil {
        log.Fatalf("No se pudo abrir config.json: %v", err)
    }
    defer configFile.Close()

    var config Config
    if err := json.NewDecoder(configFile).Decode(&config); err != nil {
        log.Fatalf("Error al parsear config.json: %v", err)
    }

    mux := http.NewServeMux()

    // Servir archivos estáticos
    mux.Handle("GET /css/", http.StripPrefix("/css/", http.FileServer(http.Dir("public/css"))))
    mux.Handle("GET /js/", http.StripPrefix("/js/", http.FileServer(http.Dir("public/js"))))
    mux.Handle("GET /assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("public/assets"))))

    // Registro directo usando las variables del bucle
    for videowallId, videowall := range config.Videowalls {

        // Broadcaster HTML
        mux.HandleFunc(fmt.Sprintf("GET /%s/broadcaster.html", videowallId), func(w http.ResponseWriter, r *http.Request) {
            http.ServeFile(w, r, filepath.Join("public", "broadcaster.html"))
        })

        // Broadcaster JSON
        mux.HandleFunc(fmt.Sprintf("GET /%s/broadcaster.json", videowallId), func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(map[string]any{
                "videowallId":    videowallId,
                "mediaMtxServer": config.Mediamtx.Server,
                "mediaMtxPort":   config.Mediamtx.WebrtcAddress,
                "mediaMtxPath":   videowall.MediamtxPath,
            })
        })

        fmt.Printf("Registered broadcaster: /%s/broadcaster.html\n", videowallId)

        totalDisplays := videowall.Rows * videowall.Cols

        for i := 1; i <= totalDisplays; i++ {
            displayId := fmt.Sprintf("%d", i)
            index := i - 1
            row := index / videowall.Cols
            col := index % videowall.Cols

            // Display HTML
            mux.HandleFunc(fmt.Sprintf("GET /%s/%s/display.html", videowallId, displayId), func(w http.ResponseWriter, r *http.Request) {
                http.ServeFile(w, r, filepath.Join("public", "display.html"))
            })

            // Display JSON
            mux.HandleFunc(fmt.Sprintf("GET /%s/%s/display.json", videowallId, displayId), func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(map[string]any{
                    "videowallId":         videowallId,
                    "displayId":           displayId,
                    "videowallCols":       videowall.Cols,
                    "videowallRows":       videowall.Rows,
                    "displayCol":          col,
                    "displayRow":          row,
                    "mediaMtxServer":      config.Mediamtx.Server,
                    "mediaMtxPort":        config.Mediamtx.WebrtcAddress,
                    "mediaMtxPath":        videowall.MediamtxPath,
                })
            })

            fmt.Printf("Registered display: /%s/%s/display.html\n", videowallId, displayId)
        }
    }

    port := config.Server.Port
    if port == 0 {
        port = 3000
    }

    serverAddr := fmt.Sprintf(":%d", port)
    fmt.Printf("Servidor del Video Wall corriendo en http://localhost:%d\n", port)

    if err := http.ListenAndServe(serverAddr, mux); err != nil {
        log.Fatalf("Error al iniciar el servidor: %v", err)
    }
}