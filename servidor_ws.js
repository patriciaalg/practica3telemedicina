// servidor_ws.js
var WebSocketServer = require("websocket").server;

function createWebSocketServer(httpServer) {
    var wsServer = new WebSocketServer({
        httpServer: httpServer
    });
    
    var clientes = []; // { connection, type, id, nombre }
    
    // AVISO ROJO - Inicio de reserva (a TODOS los sanitarios conectados)
    wsServer.broadcastAvisoInicioReserva = function(categoria, modelo, codigo, sanitarioNombre) {
        var aviso = {
            tipo: "aviso",
            color: "rojo",
            fecha: new Date().toLocaleString(),
            origen: sanitarioNombre,
            texto: "🔴 SE HA INICIADO LA RESERVA DEL " + categoria + " MODELO " + modelo + " CON CÓDIGO " + codigo
        };
        
        console.log("Enviando aviso ROJO (inicio) a TODOS los sanitarios conectados");
        
        var enviados = 0;
        for (var i = 0; i < clientes.length; i++) {
            if (clientes[i].type === "sanitario" && clientes[i].connection.connected) {
                clientes[i].connection.sendUTF(JSON.stringify(aviso));
                enviados++;
                console.log("  -> Enviado a sanitario ID:", clientes[i].id, clientes[i].nombre);
            }
        }
        console.log("Aviso ROJO (inicio) enviado a " + enviados + " sanitarios");
    };
    
    // AVISO ROJO - Finalización de reserva (a TODOS los sanitarios conectados)
    wsServer.broadcastAvisoFinReserva = function(categoria, modelo, codigo, sanitarioNombre) {
        var aviso = {
            tipo: "aviso",
            color: "rojo",
            fecha: new Date().toLocaleString(),
            origen: sanitarioNombre,
            texto: "🔴 SE HA FINALIZADO LA RESERVA DEL " + categoria + " MODELO " + modelo + " CON CÓDIGO " + codigo
        };
        
        console.log("Enviando aviso ROJO (finalización) a TODOS los sanitarios conectados");
        
        var enviados = 0;
        for (var i = 0; i < clientes.length; i++) {
            if (clientes[i].type === "sanitario" && clientes[i].connection.connected) {
                clientes[i].connection.sendUTF(JSON.stringify(aviso));
                enviados++;
                console.log("  -> Enviado a sanitario ID:", clientes[i].id, clientes[i].nombre);
            }
        }
        console.log("Aviso ROJO (finalización) enviado a " + enviados + " sanitarios");
    };
    
    // AVISO AZUL - Nuevo recurso (a TODOS los sanitarios conectados)
    wsServer.broadcastAvisoNuevoRecurso = function(categoria, modelo, codigo, gestorNombre) {
        var aviso = {
            tipo: "aviso",
            color: "azul",
            fecha: new Date().toLocaleString(),
            origen: gestorNombre,
            texto: "🔵 SE HA CREADO UN NUEVO RECURSO " + categoria + " MODELO " + modelo + " CON CÓDIGO " + codigo
        };
        
        console.log("Enviando aviso AZUL a todos los sanitarios");
        
        var enviados = 0;
        for (var i = 0; i < clientes.length; i++) {
            if (clientes[i].type === "sanitario" && clientes[i].connection.connected) {
                clientes[i].connection.sendUTF(JSON.stringify(aviso));
                enviados++;
            }
        }
        console.log("Aviso AZUL enviado a " + enviados + " sanitarios");
    };
    
    // AVISO VERDE - Nueva reseña (a TODOS los gestores conectados)
    wsServer.broadcastAvisoResena = function(categoria, modelo, codigo, puntuacion, sanitarioNombre) {
        var aviso = {
            tipo: "aviso",
            color: "verde",
            fecha: new Date().toLocaleString(),
            origen: sanitarioNombre,
            texto: "🟢 SE HA CREADO UNA RESEÑA PARA EL " + categoria + " MODELO " + modelo + " CON CÓDIGO " + codigo + " Y PUNTUACIÓN " + puntuacion
        };
        
        console.log("Enviando aviso VERDE a todos los gestores");
        
        var enviados = 0;
        for (var i = 0; i < clientes.length; i++) {
            if (clientes[i].type === "gestor" && clientes[i].connection.connected) {
                clientes[i].connection.sendUTF(JSON.stringify(aviso));
                enviados++;
            }
        }
        console.log("Aviso VERDE enviado a " + enviados + " gestores");
    };
    
    wsServer.on("request", function(request) {
        var connection = request.accept(null, request.origin);
        
        var cliente = {
            connection: connection,
            type: null,
            id: null,
            nombre: null
        };
        
        clientes.push(cliente);
        console.log("Cliente WebSocket conectado. Total:", clientes.length);
        
        connection.on("message", function(message) {
            if (message.type === "utf8") {
                console.log("Mensaje WS recibido:", message.utf8Data);
                try {
                    var msg = JSON.parse(message.utf8Data);
                    
                    if (msg.tipo === "registro") {
                        cliente.type = msg.tipo_usuario;
                        cliente.id = msg.id;
                        cliente.nombre = msg.nombre;
                        console.log("Registrado: " + cliente.type + " - " + cliente.nombre + " (ID: " + cliente.id + ")");
                    }
                } catch(e) {
                    console.error("Error parseando mensaje:", e);
                }
            }
        });
        
        connection.on("close", function() {
            for (var i = 0; i < clientes.length; i++) {
                if (clientes[i] === cliente) {
                    clientes.splice(i, 1);
                    console.log("Cliente desconectado: " + cliente.nombre + ". Total: " + clientes.length);
                    break;
                }
            }
        });
    });
    
    return wsServer;
}

module.exports = createWebSocketServer;