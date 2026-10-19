const rpc = require('./lib_rpc_servidor.js');
const conexionBD = require('./conexion_mysql.js');

function createRPCServer(wsServer) {
    const rpcServer = rpc.server(3501, () => {
        console.log("Servidor RPC corriendo en puerto 3501");
    });

    const app = rpcServer.createApp('sanitario');

    // Procedimientos RPC
    app.registerAsync(function obtenerCategorias(callback) {
        conexionBD.query("SELECT * FROM categorias", (err, rows) => {
            callback(err ? [] : rows);
        });
    });

    app.registerAsync(function obtenerModelos(callback) {
        conexionBD.query("SELECT * FROM modelos", (err, rows) => {
            callback(err ? [] : rows);
        });
    });

    app.registerAsync(function loginSanitario(usuario, password, callback) {
        conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ? AND password = ?", [usuario, password], (err, rows) => {
            if (err || rows.length === 0) return callback(null);
            callback(rows[0].id);
        });
    });

    app.registerAsync(function crearSanitario(datosSanitario, callback) {
        conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ?", [datosSanitario.usuario], (err, rows) => {
            if (err || rows.length > 0) return callback(null);
            conexionBD.query(
                "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)",
                [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password],
                (errInsert, resInsert) => {
                    if (errInsert) return callback(null);
                    callback(resInsert.insertId);
                }
            );
        });
    });

    app.registerAsync(function actualizarSanitario(idSanitario, datosSanitario, callback) {
        conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ? AND id != ?", [datosSanitario.usuario, idSanitario], (err, rows) => {
            if (err || rows.length > 0) return callback(null);
            
            let sql = "UPDATE sanitarios SET nombre = ?, apellidos = ?, usuario = ?";
            let params = [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario];
            
            if (datosSanitario.password) {
                sql += ", password = ?";
                params.push(datosSanitario.password);
            }
            sql += " WHERE id = ?";
            params.push(idSanitario);

            conexionBD.query(sql, params, (errUpd) => {
                callback(errUpd ? null : true);
            });
        });
    });

    app.registerAsync(function obtenerSanitario(idSanitario, callback) {
        conexionBD.query("SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?", [idSanitario], (err, rows) => {
            if (err || rows.length === 0) return callback(null);
            callback(rows[0]);
        });
    });

    app.registerAsync(function obtenerRecursos(idModelo, callback) {
        const sql = `
            SELECT r.*, u.nombre AS ubicacion_nombre 
            FROM recursos r 
            LEFT JOIN ubicaciones u ON r.ubicacion = u.id 
            WHERE r.modelo = ? AND r.estado = 0
        `;
        conexionBD.query(sql, [idModelo], (err, rows) => {
            callback(err ? [] : rows);
        });
    });

    app.registerAsync(function tiempoPendiente(idRecurso, callback) {
        const sql = `
            SELECT horas_estimadas, fecha_peticion, fecha_inicio 
            FROM reservas 
            WHERE recurso = ? AND fecha_fin IS NULL
        `;
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            if (err || rows.length === 0) return callback(0);

            const ahora = new Date();
            let tiempoTotal = 0;
            for (const reserva of rows) {
                if (reserva.fecha_inicio) {
                    const transcurrido = (ahora - new Date(reserva.fecha_inicio)) / (1000 * 60 * 60);
                    tiempoTotal += Math.max(0, reserva.horas_estimadas - transcurrido);
                } else {
                    tiempoTotal += reserva.horas_estimadas;
                }
            }
            callback(Math.max(0, tiempoTotal));
        });
    });

    app.registerAsync(function obtenerReservas(idSanitario, callback) {
        const sql = `
            SELECT res.*, m.nombre AS modelo_nombre, c.nombre AS categoria_nombre, 
                   rec.numero_serie, u.nombre AS ubicacion_nombre
            FROM reservas res
            JOIN recursos rec ON res.recurso = rec.id
            JOIN modelos m ON rec.modelo = m.id
            JOIN categorias c ON m.categoria = c.id
            JOIN ubicaciones u ON rec.ubicacion = u.id
            WHERE res.sanitario = ?
        `;
        conexionBD.query(sql, [idSanitario], (err, rows) => {
            if (err) return callback([]);
            // Estructura compatible con el frontend existente
            const formato = rows.map(r => ({
                ...r,
                recurso_obj: {
                    numero_serie: r.numero_serie,
                    ubicacion_nombre: r.ubicacion_nombre
                }
            }));
            callback(formato);
        });
    });

    app.registerAsync(function obtenerResenvas(idRecurso, callback) {
        const sql = `
            SELECT res.*, CONCAT(s.nombre, ' ', s.apellidos) AS sanitario_nombre 
            FROM resenvas res
            JOIN sanitarios s ON res.sanitario = s.id
            WHERE res.recurso = ?
        `;
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            callback(err ? [] : rows);
        });
    });

    app.registerAsync(function crearResenva(idRecurso, idSanitario, valoracion, descripcion, callback) {
        const sql = "INSERT INTO resenvas (recurso, sanitario, fecha, valor, descripcion) VALUES (?, ?, NOW(), ?, ?)";
        conexionBD.query(sql, [idRecurso, idSanitario, valoracion, descripcion], (err, result) => {
            if (err) return callback(null);
            
            // Notificación por WebSocket
            if (wsServer) {
                const infoSql = `
                    SELECT c.nombre AS cat, m.nombre AS modNombre, r.numero_serie, CONCAT(s.nombre, ' ', s.apellidos) AS sNom
                    FROM recursos r
                    JOIN modelos m ON r.modelo = m.id
                    JOIN categorias c ON m.categoria = c.id
                    JOIN sanitarios s ON s.id = ?
                    WHERE r.id = ?
                `;
                conexionBD.query(infoSql, [idSanitario, idRecurso], (_, rows) => {
                    if (rows && rows.length > 0) {
                        wsServer.broadcastAvisoResena(rows[0].cat, rows[0].modNombre, rows[0].numero_serie, valoracion, rows[0].sNom);
                    }
                });
            }
            callback(result.insertId);
        });
    });

    app.registerAsync(function reservarRecurso(idRecurso, idSanitario, horasEstimadas, callback) {
        const sql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion) VALUES (?, ?, ?, NOW())";
        conexionBD.query(sql, [idRecurso, idSanitario, horasEstimadas], (err, result) => {
            callback(err ? null : result.insertId);
        });
    });

    app.registerAsync(function cancelarReserva(idReserva, callback) {
        conexionBD.query("DELETE FROM reservas WHERE id = ? AND fecha_inicio IS NULL", [idReserva], (err, result) => {
            callback(err || result.affectedRows === 0 ? null : true);
        });
    });

    app.registerAsync(function iniciarReserva(idReserva, callback) {
        conexionBD.query("UPDATE reservas SET fecha_inicio = NOW() WHERE id = ? AND fecha_inicio IS NULL", [idReserva], (err, result) => {
            if (err || result.affectedRows === 0) return callback(null);

            if (wsServer) {
                const infoSql = `
                    SELECT c.nombre AS cat, m.nombre AS modNombre, rec.numero_serie, CONCAT(s.nombre, ' ', s.apellidos) AS sNom
                    FROM reservas res
                    JOIN recursos rec ON res.recurso = rec.id
                    JOIN modelos m ON rec.modelo = m.id
                    JOIN categorias c ON m.categoria = c.id
                    JOIN sanitarios s ON res.sanitario = s.id
                    WHERE res.id = ?
                `;
                conexionBD.query(infoSql, [idReserva], (_, rows) => {
                    if (rows && rows.length > 0) {
                        wsServer.broadcastAvisoInicioReserva(rows[0].cat, rows[0].modNombre, rows[0].numero_serie, rows[0].sNom);
                    }
                });
            }
            callback(true);
        });
    });

    app.registerAsync(function finalizarReserva(idReserva, callback) {
        conexionBD.query("UPDATE reservas SET fecha_fin = NOW() WHERE id = ? AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL", [idReserva], (err, result) => {
            if (err || result.affectedRows === 0) return callback(null);

            if (wsServer) {
                const infoSql = `
                    SELECT c.nombre AS cat, m.nombre AS modNombre, rec.numero_serie, CONCAT(s.nombre, ' ', s.apellidos) AS sNom
                    FROM reservas res
                    JOIN recursos rec ON res.recurso = rec.id
                    JOIN modelos m ON rec.modelo = m.id
                    JOIN categorias c ON m.categoria = c.id
                    JOIN sanitarios s ON res.sanitario = s.id
                    WHERE res.id = ?
                `;
                conexionBD.query(infoSql, [idReserva], (_, rows) => {
                    if (rows && rows.length > 0) {
                        wsServer.broadcastAvisoFinReserva(rows[0].cat, rows[0].modNombre, rows[0].numero_serie, rows[0].sNom);
                    }
                });
            }
            callback(true);
        });
    });

    app.registerAsync(function obtenerRecurso(idRecurso, callback) {
        const sql = `
            SELECT r.*, m.nombre AS modelo_nombre, u.nombre AS ubicacion_nombre 
            FROM recursos r
            JOIN modelos m ON r.modelo = m.id
            JOIN ubicaciones u ON r.ubicacion = u.id
            WHERE r.id = ?
        `;
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            if (err || rows.length === 0) return callback(null);
            callback(rows[0]);
        });
    });

    /*app.registerAsync(function totalPartes(idRecurso, callback){
        const sql = "SELECT COUNT(*) AS total FROM partes_mantenimiento WHERE recurso = ?";
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            if(err|| !rows ||rows.length === 0) return callback(0);
            callback(parseInt(rows[0].total));
        })
    });

    app.registerAsync(function totalDesinfecciones(idRecurso, callback){
        const sql = "SELECT COUNT(*) AS total FROM desinfecciones WHERE recurso = ?";
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            if(err|| !rows ||rows.length === 0) return callback(0);
            callback(parseInt(rows[0].total));
        })
    });

     app.registerAsync(function totalBajas(idRecurso, callback){
        const sql = "SELECT COUNT(*) AS total FROM recursos WHERE estado = 1";
        conexionBD.query(sql, [idRecurso], (err, rows) => {
            if(err|| !rows ||rows.length === 0) return callback(0);
            callback(parseInt(rows[0].total));
        })
    });*/
  

    return rpcServer;
}

module.exports = createRPCServer;