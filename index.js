const express = require("express")
const cors = require("cors")
const crypto = require("crypto")

const app = express()

const PORT = process.argv[2] || 4000
const COORDINATOR_URL = process.argv[3]
const PUBLIC_URL = process.argv[4]
const PULSE_INTERVAL = 2000

if (!COORDINATOR_URL || !PUBLIC_URL) {
    console.log("Uso: node index.js <PORT> <COORDINATOR_URL> <PUBLIC_URL>")
    process.exit(1)
}

const id = crypto.randomUUID()

let lastHeartbeat = null
let coordinatorConnected = false

app.use(cors())
app.use(express.json())



app.get("/status", (req, res) => {

    res.json({

        worker: {
            id: id,
            port: PORT,
            publicUrl: PUBLIC_URL,
            heartbeatInterval: PULSE_INTERVAL,
            timestamp: Date.now()
        },

        coordinator: {
            url: COORDINATOR_URL,
            connected: coordinatorConnected,
            lastHeartbeat: lastHeartbeat
        }

    })

})



async function register() {

    try {

        await fetch(`${COORDINATOR_URL}/register`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                id: id,
                url: PUBLIC_URL
            })

        })

        console.log("Worker registrado correctamente")

    } catch (error) {

        console.log("Error registrando worker:", error.message)

    }

}



async function sendPulse() {

    try {

        const response = await fetch(`${COORDINATOR_URL}/pulse`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                id: id,
                url: PUBLIC_URL
            })

        })

        if (!response.ok)
            throw new Error("Coordinator no responde correctamente")

        lastHeartbeat = Date.now()
        coordinatorConnected = true

        console.log("Heartbeat enviado")

    }
    catch (error) {

        coordinatorConnected = false

        console.log("Error heartbeat:", error.message)

    }

}



app.get("/", (req, res) => {

res.send(`

<html>

<head>
<title>Worker Dashboard</title>
</head>

<body>

<h2>Worker</h2>

<div id="worker">Cargando...</div>

<h2>Coordinator</h2>

<div id="coordinator">Cargando...</div>

<script>

async function loadStatus(){

try{

const response = await fetch("/status")

const data = await response.json()

document.getElementById("worker").innerHTML = \`
ID: \${data.worker.id}<br>
Puerto: \${data.worker.port}<br>
URL pública: \${data.worker.publicUrl}<br>
Intervalo heartbeat: \${data.worker.heartbeatInterval} ms<br>
Timestamp: \${new Date(data.worker.timestamp).toLocaleString()}
\`

document.getElementById("coordinator").innerHTML = \`
URL coordinator: \${data.coordinator.url}<br>
Estado: \${data.coordinator.connected ? "Conectado" : "Error"}<br>
Último heartbeat: \${data.coordinator.lastHeartbeat
? new Date(data.coordinator.lastHeartbeat).toLocaleString()
: "Sin heartbeat"}
\`

}
catch{

document.getElementById("coordinator").innerHTML =
"Error obteniendo datos del coordinator"

}

}

setInterval(loadStatus, 1000)

loadStatus()

</script>

</body>

</html>

`)

})


app.listen(PORT, async () => {

    console.log("Worker iniciado")
    console.log("ID:", id)
    console.log("Puerto:", PORT)
    console.log("Public URL:", PUBLIC_URL)
    console.log("Coordinator:", COORDINATOR_URL)

    await register()

    sendPulse()

    setInterval(sendPulse, PULSE_INTERVAL)

})