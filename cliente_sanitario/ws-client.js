// cliente_sanitario/ws-client.js
var WSClient = {
    conexion: null,
    userId: null,
    userType: null,
    userName: null,
    avisos: [],
    onAvisoCallback: null,
    
    conectar: function(userId, userType, userName) {
        var self = this;
        this.userId = userId;
        this.userType = userType;
        this.userName = userName;
        
        return new Promise(function(resolve, reject) {
            self.conexion = new WebSocket("ws://localhost:3000");
            
            self.conexion.onopen = function() {
                console.log("WebSocket conectado");
                self.conexion.send(JSON.stringify({
                    tipo: "registro",
                    tipo_usuario: userType,
                    id: userId,
                    nombre: userName
                }));
                resolve();
            };
            
            self.conexion.onerror = function(error) {
                console.error("WebSocket error:", error);
                reject(error);
            };
            
            self.conexion.onclose = function() {
                console.log("WebSocket desconectado");
            };
            
            self.conexion.onmessage = function(msg) {
                var data = JSON.parse(msg.data);
                if (data.tipo === "aviso") {
                    self.avisos.unshift(data);
                    if (self.onAvisoCallback) {
                        self.onAvisoCallback(data);
                    }
                }
            };
        });
    },
    
    desconectar: function() {
        if (this.conexion && this.conexion.readyState === WebSocket.OPEN) {
            this.conexion.close();
        }
        this.conexion = null;
        this.avisos = [];
    },
    
    onAviso: function(callback) {
        this.onAvisoCallback = callback;
    },
    
    enviarAvisoReserva: function(recursoId, accion, categoria, modelo, codigo) {
        if (this.conexion && this.conexion.readyState === WebSocket.OPEN) {
            this.conexion.send(JSON.stringify({
                tipo: "aviso_reserva",
                recurso_id: recursoId,
                accion: accion,
                categoria: categoria,
                modelo: modelo,
                codigo: codigo
            }));
        }
    },
    
    enviarAvisoRecurso: function(categoria, modelo, codigo) {
        if (this.conexion && this.conexion.readyState === WebSocket.OPEN) {
            this.conexion.send(JSON.stringify({
                tipo: "aviso_recurso",
                categoria: categoria,
                modelo: modelo,
                codigo: codigo
            }));
        }
    },
    
   enviarAvisoResena: function(categoria, modelo, codigo, puntuacion) {
    console.log("📤 ws-client.enviarAvisoResena LLAMADA");
    console.log("   - categoria:", categoria);
    console.log("   - modelo:", modelo);
    console.log("   - codigo:", codigo);
    console.log("   - puntuacion:", puntuacion);
    console.log("   - conexion:", this.conexion);
    console.log("   - readyState:", this.conexion ? this.conexion.readyState : "NO CONEXION");
    
    if (this.conexion && this.conexion.readyState === WebSocket.OPEN) {
        const mensaje = {
            tipo: "aviso_resena",
            categoria: categoria,
            modelo: modelo,
            codigo: codigo,
            puntuacion: puntuacion
        };
        console.log("📤 Enviando mensaje:", mensaje);
        this.conexion.send(JSON.stringify(mensaje));
        console.log("📤 Mensaje enviado!");
    } else {
        console.error("❌ WebSocket NO está conectado!");
    }
},
    
    getAvisos: function() {
        return this.avisos;
    }
};