const express = require("express");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro_telemedicina_2026";

// Configuración de Supabase (Sustituye por tus credenciales de Supabase)
const supabaseUrl = process.env.SUPABASE_URL || "https://mlfmpelowsjnizwfsdev.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_9Ne_EEEOyZaG61qDxz4N6A_ay41m3uJ";
const supabase = createClient(supabaseUrl, supabaseKey);

function verificarJWT(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ error: "Acceso denegado: falta cabecera Authorization" });
    }

    const partes = authHeader.split(" ");
    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({ error: "Formato de token no válido (debe ser Bearer <token>)" });
    }

    const token = partes[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Token inválido o expirado" });
        }
        req.usuarioAuth = decoded;
        next();
    });
}

function createRESTServer(data, siguientesIds, wsServer) {
    const app = express();

    app.use("/appCliente", express.static("cliente_rest"));
    app.use(express.json());

    // --- UBICACIONES ---
    app.get("/api/ubicaciones", verificarJWT, async function (req, res) {
        const { data: ubicaciones, error } = await supabase
            .from("ubicaciones")
            .select("*");

        if (error) {
            console.log("Error al obtener ubicaciones:", error);
            return res.status(500).json("Error al realizar la consulta");
        }
        res.status(200).json(ubicaciones);
    });

    // --- CATEGORIAS ---
    app.get("/api/categorias", verificarJWT, async function (req, res) {
        const { data: categorias, error } = await supabase
            .from("categorias")
            .select("*");

        if (error) {
            console.log("Error al obtener categorias:", error);
            return res.status(500).json("Error al realizar la consulta");
        }
        res.status(200).json(categorias);
    });

    // --- MODELOS ---
    app.get("/api/models", verificarJWT, async function (req, res) {
        const { data: modelos, error } = await supabase
            .from("modelos")
            .select("*");

        if (error) {
            console.log("Error al obtener modelos:", error);
            return res.status(500).json("Error al realizar la consulta");
        }
        res.status(200).json(modelos);
    });

    // --- RUTA DE LOGIN ---
    app.post("/api/gestores/login", async function (req, res) {
        const { login, password } = req.body;

        const { data: gestores, error } = await supabase
            .from("gestores")
            .select("*")
            .eq("usuario", login)
            .eq("password", password);

        if (error) {
            console.log("Error en login gestor:", error);
            return res.status(500).json("Error en el servidor");
        }

        if (gestores.length === 1) {
            const token = jwt.sign(
                { id: gestores[0].id, usuario: gestores[0].usuario },
                JWT_SECRET,
                { expiresIn: "8h" }
            );
            return res.json({ id: gestores[0].id, token: token });
        } else {
            return res.status(403).send("Credenciales incorrectas");
        }
    });

    // --- REGISTRAR GESTOR ---
    app.post("/api/gestores", async function (req, res) {
        const datos = req.body;

        const { data: existente, error: errCheck } = await supabase
            .from("gestores")
            .select("*")
            .eq("usuario", datos.usuario);

        if (errCheck) {
            console.log("Error al comprobar usuario:", errCheck);
            return res.status(500).json("Error al realizar la consulta");
        }

        if (existente.length > 0) {
            console.log("REGISTRO - Usuario ya existe");
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        const { data: nuevo, error: errInsert } = await supabase
            .from("gestores")
            .insert([{
                nombre: datos.nombre,
                apellidos: datos.apellidos,
                usuario: datos.usuario,
                password: datos.password
            }])
            .select()
            .single();

        if (errInsert) {
            console.log("Error al registrar gestor:", errInsert);
            return res.status(500).json("Error al registrar el gestor");
        }

        console.log("REGISTRO - Gestor creado:", nuevo);
        res.status(201).json(nuevo);
    });

    // --- ACTUALIZAR GESTOR ---
    app.put("/api/gestores/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const datos = req.body;

        const { data: gestorActual, error: errBuscar } = await supabase
            .from("gestores")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (errBuscar) {
            return res.status(500).json("Error al consultar el gestor");
        }
        if (!gestorActual) {
            return res.status(404).send("Gestor no encontrado");
        }

        if (datos.usuario && datos.usuario !== gestorActual.usuario) {
            const { data: existente } = await supabase
                .from("gestores")
                .select("id")
                .eq("usuario", datos.usuario);

            if (existente && existente.length > 0) {
                return res.status(400).json({ error: "El usuario ya existe" });
            }
        }

        const camposActualizados = {
            nombre: datos.nombre !== undefined ? datos.nombre : gestorActual.nombre,
            apellidos: datos.apellidos !== undefined ? datos.apellidos : gestorActual.apellidos,
            usuario: datos.usuario !== undefined ? datos.usuario : gestorActual.usuario,
            password: datos.password !== undefined ? datos.password : gestorActual.password
        };

        const { data: actualizado, error: errUpdate } = await supabase
            .from("gestores")
            .update(camposActualizados)
            .eq("id", id)
            .select()
            .single();

        if (errUpdate) {
            return res.status(500).json("Error al actualizar el gestor");
        }

        res.json(actualizado);
    });

    // --- OBTENER GESTOR ---
    app.get("/api/gestores/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const { data: gestor, error } = await supabase
            .from("gestores")
            .select("id, nombre, apellidos, usuario")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            return res.status(500).json("Error al consultar el gestor");
        }
        if (!gestor) {
            return res.status(404).send("Gestor no encontrado");
        }
        res.json(gestor);
    });

    // --- OBTENER SANITARIO ---
    app.get("/api/sanitarios/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const { data: sanitario, error } = await supabase
            .from("sanitarios")
            .select("id, nombre, apellidos, usuario")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            return res.status(500).json("Error al consultar el sanitario");
        }
        if (!sanitario) {
            return res.status(404).send("Sanitario no encontrado");
        }
        res.json(sanitario);
    });

    // --- RECURSOS (FILTRADO) ---
    app.get("/api/recursos", verificarJWT, async function (req, res) {
        const { categoria, modelo, ubicacion, estado } = req.query;

        let consulta = supabase.from("recursos").select("*, modelos!inner(categoria)");

        if (categoria && categoria !== "Todos" && categoria !== "") {
            consulta = consulta.eq("modelos.categoria", categoria);
        }
        if (modelo && modelo !== "Todos" && modelo !== "") {
            consulta = consulta.eq("modelo", modelo);
        }
        if (ubicacion && ubicacion !== "Todos" && ubicacion !== "") {
            consulta = consulta.eq("ubicacion", ubicacion);
        }
        if (estado && estado !== "Todos" && estado !== "") {
            consulta = consulta.eq("estado", estado);
        }

        const { data: recursos, error } = await consulta;

        if (error) {
            console.log("Error al obtener recursos:", error);
            return res.status(500).json("Error al consultar los recursos");
        }

        // Limpiar el join anidado para mantener el formato original de la respuesta
        const resultadoLimpio = recursos.map(({ modelos, ...resto }) => resto);
        res.json(resultadoLimpio);
    });

    // --- RECURSO POR ID ---
    app.get("/api/recursos/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const { data: recurso, error } = await supabase
            .from("recursos")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            return res.status(500).json("Error al consultar el recurso");
        }
        if (!recurso) {
            return res.status(404).send("Recurso no encontrado");
        }
        res.json(recurso);
    });

    // --- CREAR RECURSO ---
    app.post("/api/recursos", verificarJWT, async function (req, res) {
        const datos = req.body;

        const { data: nuevoRecurso, error } = await supabase
            .from("recursos")
            .insert([{
                modelo: parseInt(datos.modelo),
                ubicacion: parseInt(datos.ubicacion),
                numero_serie: datos.numero_serie,
                estado: parseInt(datos.estado)
            }])
            .select()
            .single();

        if (error) {
            console.log("Error al insertar recurso:", error);
            return res.status(500).json("Error al insertar el recurso");
        }

        // Obtener datos del modelo y categoría para el WebSocket
        const { data: modeloData } = await supabase
            .from("modelos")
            .select("nombre, categorias(nombre)")
            .eq("id", nuevoRecurso.modelo)
            .maybeSingle();

        if (modeloData && wsServer && wsServer.broadcastAvisoNuevoRecurso) {
            wsServer.broadcastAvisoNuevoRecurso(
                modeloData.categorias ? modeloData.categorias.nombre : "",
                modeloData.nombre,
                nuevoRecurso.numero_serie,
                datos.gestorNombre || "Gestor"
            );
        }

        res.status(201).json(nuevoRecurso);
    });

    // --- ACTUALIZAR RECURSO ---
    app.put("/api/recursos/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const datos = req.body;

        const { data: actual, error: errBuscar } = await supabase
            .from("recursos")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (errBuscar) {
            return res.status(500).json("Error al consultar el recurso");
        }
        if (!actual) {
            return res.status(404).send("Recurso no encontrado");
        }

        const updateData = {
            modelo: datos.modelo !== undefined ? parseInt(datos.modelo) : actual.modelo,
            ubicacion: datos.ubicacion !== undefined ? parseInt(datos.ubicacion) : actual.ubicacion,
            numero_serie: datos.numero_serie !== undefined ? datos.numero_serie : actual.numero_serie,
            estado: datos.estado !== undefined ? parseInt(datos.estado) : actual.estado
        };

        const { data: actualizado, error: errUpdate } = await supabase
            .from("recursos")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (errUpdate) {
            return res.status(500).json("Error al actualizar el recurso");
        }

        res.json(actualizado);
    });

    // --- BORRAR RECURSO ---
    app.delete("/api/recursos/:id", verificarJWT, async function (req, res) {
        const id = req.params.id;

        const { data, error } = await supabase
            .from("recursos")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.log("Error al borrar el recurso:", error);
            return res.status(500).json("Error al realizar el borrado");
        }

        if (data && data.length > 0) {
            res.status(200).json("Recurso eliminado");
        } else {
            res.status(404).json("No se ha encontrado el recurso a borrar");
        }
    });

    // --- RESERVAS DEL RECURSO ---
    app.get("/api/recursos/:id/reservas", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const { data: reservas, error } = await supabase
            .from("reservas")
            .select("*")
            .eq("recurso", id);

        if (error) {
            return res.status(500).json("Error al consultar reservas");
        }
        res.json(reservas);
    });

    // --- RESEÑAS DEL RECURSO ---
    app.get("/api/recursos/:id/resenvas", verificarJWT, async function (req, res) {
        const id = req.params.id;
        const { data: resenvas, error } = await supabase
            .from("resenvas")
            .select("*")
            .eq("recurso", id);

        if (error) {
            return res.status(500).json("Error al consultar resenvas");
        }
        res.json(resenvas);
    });

    // --- CONTADOR DE RESERVAS SIN ACTIVAR ---
    app.get("/api/reservas/sin-activar/count", verificarJWT, async function (req, res) {
        const { count, error } = await supabase
            .from("reservas")
            .select("*", { count: "exact", head: true })
            .is("fecha_inicio", null);

        if (error) {
            return res.status(500).json("Error al contar reservas");
        }
        res.status(200).json({ count: count || 0 });
    });

    return app;
}

module.exports = createRESTServer;
