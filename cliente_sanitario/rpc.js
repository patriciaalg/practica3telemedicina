// cliente_sanitario/rpc.js
(function() {
    function RPCClient(appName) {
        this.appName = appName || 'sanitario';
        this.baseUrl = 'http://localhost:3501/RPC/' + this.appName;
        console.log("RPCClient creado con URL:", this.baseUrl);
    }

    RPCClient.prototype.call = function(method, ...args) {
        console.log("Llamando a RPC " + method + " con args:", args);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = this.baseUrl + '/' + method;
            console.log("URL completa:", url);
            
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = function() {
                console.log("Respuesta de " + method + ": status=" + xhr.status + ", response=", xhr.responseText);
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        console.error("Error parseando JSON:", e);
                        reject(e);
                    }
                } else {
                    reject(new Error("HTTP Error: " + xhr.status + " - " + xhr.responseText));
                }
            };

            xhr.onerror = function() {
                console.error("Error de red en RPC call");
                reject(new Error('Network Error - ¿El servidor RPC está corriendo en puerto 3501?'));
            };

            const body = JSON.stringify(args);
            console.log("Enviando body:", body);
            xhr.send(body);
        });
    };

    const rpcMethods = [
        'obtenerCategorias',
        'obtenerModelos',
        'obtenerUbicaciones',
        'loginSanitario',
        'crearSanitario',
        'actualizarSanitario',
        'obtenerSanitario',
        'obtenerRecursos',
        'tiempoPendiente',
        'obtenerReservas',
        'obtenerResenvas',
        'crearResenva',
        'reservarRecurso',
        'cancelarReserva',
        'iniciarReserva',
        'finalizarReserva',
        'obtenerRecurso'
    ];

    rpcMethods.forEach(method => {
        RPCClient.prototype[method] = function(...args) {
            return this.call(method, ...args);
        };
    });

    window.RPCClient = RPCClient;
    console.log("RPCClient disponible en window");
})();