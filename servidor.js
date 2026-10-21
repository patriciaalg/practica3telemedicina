var express = require("express");
var http = require('http');
var datosServidor = require('./datos.js');
var createRESTServer = require('./servidor_rest.js');
var createRPCServer = require('./servidor_rpc.js');
var createWebSocketServer = require('./servidor_ws.js');

var app = express();
var server = http.createServer(app);

var siguientesIds = {
    gestor: 3,
    recurso: 6,
    reserva: 4,
    resenva: 3
};

app.use("/gestor", express.static("cliente"));
app.use("/sanitario", express.static("cliente_sanitario"));

// Crear servidor WebSocket
const wsServer = createWebSocketServer(server);

// Crear servidor REST (pasar wsServer para notificaciones de nuevos recursos)
const restApp = createRESTServer(datosServidor, siguientesIds, wsServer);
app.use(restApp);

// Crear servidor RPC (pasar wsServer para notificaciones de reservas)
const rpcServer = createRPCServer(wsServer);

// En Render el puerto se define por la variable de entorno PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, function() {
    console.log("Servidor HTTP corriendo en el puerto " + PORT);
    console.log("App gestor disponible en /gestor/gestor.html");
    console.log("App sanitario disponible en /sanitario/sanitario.html");
    console.log("Servicios REST disponibles en /api/...");
});
