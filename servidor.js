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

// Redirección en la raíz para evitar "Cannot GET /"
app.get("/", function(req, res) {
    res.redirect("/gestor/gestor.html");
});

// Crear servidor WebSocket
const wsServer = createWebSocketServer(server);

// Crear servidor REST (pasar wsServer para notificaciones de nuevos recursos)
const restApp = createRESTServer(datosServidor, siguientesIds, wsServer);
app.use(restApp);

// Crear servidor RPC (pasar wsServer para notificaciones de reservas)
const rpcServer = createRPCServer(wsServer);

server.listen(3000, function() {
    console.log("Servidor HTTP corriendo en http://localhost:3000");
    console.log("App gestor en http://localhost:3000/gestor/gestor.html");
    console.log("App sanitario en http://localhost:3000/sanitario/sanitario.html");
    console.log("Servicios REST en http://localhost:3000/api/...");
});
