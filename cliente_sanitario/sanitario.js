let currentSanitarioId = null;
let currentRecursoResena = null;
let categorias = [];
let modelos = [];
let rpcClient = {};
let wsClient = null;

document.addEventListener('DOMContentLoaded', function() {

    const appRPC = rpc("localhost", 3501, "sanitario");

    function createAsyncProcedure(nombre) {
        const proc = appRPC.procedure(nombre);
        return (...args) => new Promise((resolve) => {
            proc(...args, (res) => resolve(res));
        });
    }

    const listaProcedimientos = [
        'obtenerCategorias', 'obtenerModelos', 'loginSanitario', 'crearSanitario',
        'actualizarSanitario', 'obtenerSanitario', 'obtenerRecursos', 'tiempoPendiente',
        'obtenerReservas', 'obtenerResenvas', 'crearResenva', 'reservarRecurso',
        'cancelarReserva', 'iniciarReserva', 'finalizarReserva', 'obtenerRecurso'
    ];

    listaProcedimientos.forEach(name => {
        rpcClient[name] = createAsyncProcedure(name);
    });

    wsClient = Object.create(WSClient);
    cargarDatosIniciales();
});

async function cargarDatosIniciales() {
    try {
        categorias = await rpcClient.obtenerCategorias();
        modelos = await rpcClient.obtenerModelos();
        console.log('Categorías cargadas:', categorias);
        console.log('Modelos cargados:', modelos);
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

function mostrarVista(vista) {
    const views = ['login', 'registro', 'main', 'nuevaReserva', 'nuevaResena'];
    views.forEach(v => {
        const element = document.getElementById(v + 'View');
        if (element) element.classList.add('hidden');
    });
    
    const viewToShow = document.getElementById(vista + 'View');
    if (viewToShow) viewToShow.classList.remove('hidden');
}

function mostrarRegistro() {
    document.getElementById('registroTitulo').textContent = 'Registro de Sanitario';
    document.getElementById('sanitarioId').value = '';
    document.getElementById('regNombre').value = '';
    document.getElementById('regApellidos').value = '';
    document.getElementById('regUsuario').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPassword').required = true;
    document.getElementById('passwordHelp').style.display = 'none';
    document.getElementById('registroError').textContent = '';
    mostrarVista('registro');
}

function volverLogin() {
    mostrarVista('login');
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.textContent = '';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginPassword').value = '';
}

function volverMain() {
    mostrarVista('main');
    cargarReservas();
}

async function login() {
    const usuario = document.getElementById('loginUsuario').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!usuario || !password) {
        errorDiv.textContent = 'Por favor, complete todos los campos';
        return;
    }

    try {
        const id = await rpcClient.loginSanitario(usuario, password);
        
        if (id) {
            currentSanitarioId = id;
            
            const sanitario = await rpcClient.obtenerSanitario(id);
            if (sanitario) {
                await wsClient.conectar(id, 'sanitario', sanitario.nombre + ' ' + sanitario.apellidos);
                
                wsClient.onAviso(function(aviso) {
                    agregarAvisoATabla(aviso);
                });
            }
            
            await cargarDatosSanitario();
            mostrarVista('main');
            errorDiv.textContent = '';
        } else {
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
        }
    } catch (error) {
        errorDiv.textContent = 'Error en la conexión';
        console.error(error);
    }
}

function agregarAvisoATabla(aviso) {
    var tablaAvisos = document.getElementById('avisosBody');
    if (!tablaAvisos) return;
    
    var fila = document.createElement('tr');
    var claseColor = "";
    if (aviso.color === "rojo") claseColor = "aviso-rojo";
    else if (aviso.color === "azul") claseColor = "aviso-azul";
    else if (aviso.color === "verde") claseColor = "aviso-verde";
    fila.className = claseColor;
    
    fila.innerHTML = 
        "<td style='border:1px solid #ddd;padding:8px'>" + aviso.fecha + "</td>" +
        "<td style='border:1px solid #ddd;padding:8px'>" + aviso.origen + "</td>" +
        "<td style='border:1px solid #ddd;padding:8px'>" + aviso.texto + "</td>";
    
    tablaAvisos.insertBefore(fila, tablaAvisos.firstChild);
    
    while (tablaAvisos.children.length > 50) {
        tablaAvisos.removeChild(tablaAvisos.lastChild);
    }
}

async function cargarDatosSanitario() {
    try {
        const sanitario = await rpcClient.obtenerSanitario(currentSanitarioId);
        if (sanitario) {
            document.getElementById('sanitarioNombre').textContent = 
                `${sanitario.nombre} ${sanitario.apellidos}`;
        }
        await cargarReservas();
    } catch (error) {
        console.error('Error cargando datos del sanitario:', error);
    }
}

function guardarRegistro() {
    if (document.getElementById('sanitarioId').value) {
        actualizarPerfil();
    } else {
        const datos = {
            nombre: document.getElementById('regNombre').value,
            apellidos: document.getElementById('regApellidos').value,
            usuario: document.getElementById('regUsuario').value,
            password: document.getElementById('regPassword').value
        };
        
        if (!datos.nombre || !datos.apellidos || !datos.usuario || !datos.password) {
            document.getElementById('registroError').textContent = 'Todos los campos son obligatorios';
            return;
        }
        
        rpcClient.crearSanitario(datos)
            .then(id => {
                if (id) {
                    alert('Registro exitoso. Por favor, inicie sesión.');
                    volverLogin();
                } else {
                    document.getElementById('registroError').textContent = 'El usuario ya existe';
                }
            })
            .catch(error => {
                document.getElementById('registroError').textContent = 'Error en la conexión';
                console.error(error);
            });
    }
}

async function editarPerfil() {
    try {
        const sanitario = await rpcClient.obtenerSanitario(currentSanitarioId);
        if (sanitario) {
            document.getElementById('registroTitulo').textContent = 'Editar Perfil';
            document.getElementById('sanitarioId').value = currentSanitarioId;
            document.getElementById('regNombre').value = sanitario.nombre;
            document.getElementById('regApellidos').value = sanitario.apellidos;
            document.getElementById('regUsuario').value = sanitario.usuario;
            document.getElementById('regPassword').value = '';
            document.getElementById('regPassword').required = false;
            document.getElementById('passwordHelp').style.display = 'block';
            document.getElementById('registroError').textContent = '';
            
            mostrarVista('registro');
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
    }
}

async function actualizarPerfil() {
    const datos = {
        nombre: document.getElementById('regNombre').value,
        apellidos: document.getElementById('regApellidos').value,
        usuario: document.getElementById('regUsuario').value
    };
    
    const password = document.getElementById('regPassword').value;
    if (password) {
        datos.password = password;
    }
    
    const errorDiv = document.getElementById('registroError');

    if (!datos.nombre || !datos.apellidos || !datos.usuario) {
        errorDiv.textContent = 'Nombre, apellidos y usuario son obligatorios';
        return;
    }

    try {
        const resultado = await rpcClient.actualizarSanitario(currentSanitarioId, datos);
        
        if (resultado) {
            alert('Perfil actualizado correctamente');
            await cargarDatosSanitario();
            volverMain();
        } else {
            errorDiv.textContent = 'Error al actualizar el perfil (usuario ya existe)';
        }
    } catch (error) {
        errorDiv.textContent = 'Error en la conexión';
        console.error(error);
    }
}

async function cargarReservas() {
    try {
        const reservas = await rpcClient.obtenerReservas(currentSanitarioId);
        
        const pendientes = reservas.filter(r => !r.fecha_inicio);
        const historial = reservas.filter(r => r.fecha_inicio);
        
        const pendientesBody = document.getElementById('pendientesBody');
        const historialBody = document.getElementById('historialBody');
        
        if (pendientesBody) pendientesBody.innerHTML = '';
        if (historialBody) historialBody.innerHTML = '';

        if (pendientes.length === 0) {
            if (pendientesBody) pendientesBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay reservas pendientes</td></tr>';
        } else {
            for (const reserva of pendientes) {
                const tiempoEspera = await rpcClient.tiempoPendiente(reserva.recurso);
                
                const fila = document.createElement('tr');
                fila.className = 'reserva-pendiente';
                fila.innerHTML = `
                    <td>${reserva.categoria_nombre || 'N/A'}</td>
                    <td>${reserva.modelo_nombre || 'N/A'}</td>
                    <td>${reserva.recurso_obj?.numero_serie || 'N/A'}</td>
                    <td>${reserva.recurso_obj?.ubicacion_nombre || 'N/A'}</td>
                    <td>${new Date(reserva.fecha_peticion).toLocaleString()}</td>
                    <td>${tiempoEspera.toFixed(1)}h</td>
                    <td>
                        <button class="btn btn-success" onclick="retirarReserva(${reserva.id})">Retirar</button>
                        <button class="btn btn-warning" onclick="cancelarReserva(${reserva.id})">Cancelar</button>
                    </td>
                `;
                if (pendientesBody) pendientesBody.appendChild(fila);
            }
        }

        if (historial.length === 0) {
            if (historialBody) historialBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay reservas en el historial</td></tr>';
        } else {
            for (const reserva of historial) {
                const estaActiva = !reserva.fecha_fin;
                
                let horasRestantes = null;
                let estadoTexto = '';
                let boton = '';
                
                if (estaActiva) {
                    const ahora = new Date();
                    const inicio = new Date(reserva.fecha_inicio);
                    const horasUsadas = (ahora - inicio) / (1000 * 60 * 60);
                    horasRestantes = Math.max(0, reserva.horas_estimadas - horasUsadas);
                    estadoTexto = horasRestantes <= 0 ? 'Excedido' : `${horasRestantes.toFixed(1)}h restantes`;
                    boton = `<button class="btn btn-primary" onclick="devolverReserva(${reserva.id})">Devolver</button>`;
                } else {
                    estadoTexto = new Date(reserva.fecha_fin).toLocaleString();
                    boton = `<button class="btn" onclick="mostrarNuevaResena(${reserva.recurso})">Reseñar</button>`;
                }
                
                const fila = document.createElement('tr');
                fila.className = estaActiva ? (horasRestantes <= 0 ? 'reserva-excedida' : 'reserva-activa') : 'reserva-finalizada';
                fila.innerHTML = `
                    <td>${reserva.categoria_nombre || 'N/A'}</td>
                    <td>${reserva.modelo_nombre || 'N/A'}</td>
                    <td>${reserva.recurso_obj?.numero_serie || 'N/A'}</td>
                    <td>${reserva.horas_estimadas}h</td>
                    <td>${new Date(reserva.fecha_inicio).toLocaleString()}</td>
                    <td>${estadoTexto}</td>
                    <td>${boton}</td>
                `;
                if (historialBody) historialBody.appendChild(fila);
            }
        }
    } catch (error) {
        console.error('Error cargando reservas:', error);
    }
}

async function cancelarReserva(idReserva) {
    if (confirm('¿Está seguro de cancelar esta reserva?')) {
        try {
            const resultado = await rpcClient.cancelarReserva(idReserva);
            if (resultado) {
                alert('Reserva cancelada correctamente');
                cargarReservas();
            } else {
                alert('No se pudo cancelar la reserva');
            }
        } catch (error) {
            console.error('Error cancelando reserva:', error);
            alert('Error al cancelar la reserva');
        }
    }
}

async function retirarReserva(idReserva) {
    if (confirm('¿Confirmar retirada del recurso?')) {
        try {
            const resultado = await rpcClient.iniciarReserva(idReserva);
            if (resultado) {
                alert('Recurso retirado correctamente');
                cargarReservas();
            } else {
                alert('No se pudo retirar el recurso');
            }
        } catch (error) {
            console.error('Error retirando reserva:', error);
            alert('Error al retirar el recurso');
        }
    }
}

async function devolverReserva(idReserva) {
    if (confirm('¿Confirmar devolución del recurso?')) {
        try {
            const resultado = await rpcClient.finalizarReserva(idReserva);
            if (resultado) {
                alert('Recurso devuelto correctamente');
                cargarReservas();
            } else {
                alert('No se pudo devolver el recurso');
            }
        } catch (error) {
            console.error('Error devolviendo reserva:', error);
            alert('Error al devolver el recurso');
        }
    }
}

function mostrarNuevaReserva() {
    const selectCategoria = document.getElementById('filtroCategoria');
    if (selectCategoria) {
        selectCategoria.innerHTML = '<option value="">Seleccione categoría</option>';
        categorias.forEach(cat => {
            selectCategoria.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
        });
    }
    
    const selectModelo = document.getElementById('filtroModelo');
    if (selectModelo) {
        selectModelo.innerHTML = '<option value="">Primero seleccione categoría</option>';
        selectModelo.disabled = true;
    }
    
    const tiempoInput = document.getElementById('tiempoEstimado');
    if (tiempoInput) tiempoInput.value = '';
    
    const recursosContainer = document.getElementById('recursosDisponibles');
    if (recursosContainer) recursosContainer.innerHTML = '';
    
    mostrarVista('nuevaReserva');
}

function cargarModelos() {
    const categoriaId = parseInt(document.getElementById('filtroCategoria').value);
    const selectModelo = document.getElementById('filtroModelo');
    const recursosContainer = document.getElementById('recursosDisponibles');
    
    if (recursosContainer) recursosContainer.innerHTML = '';
    
    if (!categoriaId) {
        if (selectModelo) {
            selectModelo.innerHTML = '<option value="">Seleccione categoría</option>';
            selectModelo.disabled = true;
        }
        return;
    }

    const modelosFiltrados = modelos.filter(m => m.categoria === categoriaId);
    if (selectModelo) {
        selectModelo.innerHTML = '<option value="">Seleccione modelo</option>';
        modelosFiltrados.forEach(m => {
            selectModelo.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
        });
        selectModelo.disabled = false;
    }
}

async function buscarRecursos() {
    const modeloId = parseInt(document.getElementById('filtroModelo').value);
    const tiempoEstimado = document.getElementById('tiempoEstimado').value;
    
    if (!modeloId) {
        alert('Seleccione un modelo');
        return;
    }
    
    if (!tiempoEstimado || parseInt(tiempoEstimado) <= 0) {
        alert('Ingrese un tiempo estimado válido (horas)');
        return;
    }

    try {
        const container = document.getElementById('recursosDisponibles');
        if (container) container.innerHTML = '<p class="text-center">Cargando recursos...</p>';
        
        const recursos = await rpcClient.obtenerRecursos(modeloId);
        
        if (container) container.innerHTML = '';

        if (!recursos || recursos.length === 0) {
            if (container) container.innerHTML = '<p class="text-center">No hay recursos disponibles de este modelo</p>';
            return;
        }

        for (const recurso of recursos) {
            const tiempoPendiente = await rpcClient.tiempoPendiente(recurso.id);
            const resenas = await rpcClient.obtenerResenvas(recurso.id);
            
            let valoracionMedia = 0;
            if (resenas && resenas.length > 0) {
                valoracionMedia = resenas.reduce((sum, r) => sum + r.valor, 0) / resenas.length;
            }
            
            const disponible = tiempoPendiente === 0;
            
            const card = document.createElement('div');
            card.className = 'recurso-card';
            
            const estrellasLlenas = '★'.repeat(Math.round(valoracionMedia));
            const estrellasVacias = '☆'.repeat(5 - Math.round(valoracionMedia));
            
            card.innerHTML = `
                <h3>Recurso #${recurso.numero_serie}</h3>
                <p><strong>Ubicación:</strong> ${recurso.ubicacion_nombre}</p>
                <p><strong>Estado:</strong> <span class="${disponible ? 'disponible' : 'ocupado'}">
                    ${disponible ? '✓ Disponible' : `⏱ Ocupado (${tiempoPendiente.toFixed(1)}h restantes)`}
                </span></p>
                <p><strong>Valoración media:</strong> 
                    <span class="valoracion">${estrellasLlenas}${estrellasVacias}</span>
                    (${resenas ? resenas.length : 0} reseñas)
                </p>
                <button class="btn btn-primary" onclick="crearNuevaReserva(${recurso.id}, ${parseInt(tiempoEstimado)})">
                    Reservar
                </button>
            `;
            
            if (container) container.appendChild(card);
        }
    } catch (error) {
        console.error('Error buscando recursos:', error);
        alert('Error al buscar recursos: ' + error.message);
    }
}

async function crearNuevaReserva(idRecurso, horasEstimadas) {
    try {
        const idReserva = await rpcClient.reservarRecurso(idRecurso, currentSanitarioId, horasEstimadas);
        
        if (idReserva) {
            alert('Reserva creada correctamente. Puede retirar el recurso cuando esté disponible.');
            volverMain();
        } else {
            alert('No se pudo crear la reserva');
        }
    } catch (error) {
        console.error('Error creando reserva:', error);
        alert('Error al crear la reserva: ' + error.message);
    }
}

function mostrarNuevaResena(idRecurso) {
    currentRecursoResena = idRecurso;
    
    rpcClient.obtenerRecurso(idRecurso).then(recurso => {
        const infoElement = document.getElementById('resenaRecursoInfo');
        if (infoElement) {
            infoElement.textContent = `Recurso: ${recurso.numero_serie} - ${recurso.modelo_nombre}`;
        }
    }).catch(error => {
        console.error('Error obteniendo recurso:', error);
        const infoElement = document.getElementById('resenaRecursoInfo');
        if (infoElement) {
            infoElement.textContent = `Recurso ID: ${idRecurso}`;
        }
    });
    
    const valorSelect = document.getElementById('resenaValor');
    if (valorSelect) valorSelect.value = 5;
    
    const descripcionTextarea = document.getElementById('resenaDescripcion');
    if (descripcionTextarea) descripcionTextarea.value = '';
    
    const errorDiv = document.getElementById('resenaError');
    if (errorDiv) errorDiv.textContent = '';
    
    mostrarVista('nuevaResena');
}

async function guardarResena() {
    const valor = parseInt(document.getElementById('resenaValor').value);
    const descripcion = document.getElementById('resenaDescripcion').value;
    const errorDiv = document.getElementById('resenaError');
    
    if (!valor || !descripcion) {
        if (errorDiv) errorDiv.textContent = 'Complete todos los campos';
        return;
    }

    try {
        const recurso = await rpcClient.obtenerRecurso(currentRecursoResena);
        const modelo = modelos.find(m => m.id === recurso.modelo);
        const categoria = categorias.find(c => c.id === modelo?.categoria);
        
        const id = await rpcClient.crearResenva(currentRecursoResena, currentSanitarioId, valor, descripcion);
        
        if (id) {
            if (wsClient && categoria && modelo) {
                wsClient.enviarAvisoResena(categoria.nombre, modelo.nombre, recurso.numero_serie, valor);
            }
            alert('Reseña guardada correctamente');
            volverMain();
        } else {
            if (errorDiv) errorDiv.textContent = 'Error al guardar la reseña';
        }
    } catch (error) {
        if (errorDiv) errorDiv.textContent = 'Error en la conexión';
        console.error(error);
    }
}

function logout() {
    if (wsClient) {
        wsClient.desconectar();
    }
    currentSanitarioId = null;
    mostrarVista('login');
    const usuarioInput = document.getElementById('loginUsuario');
    const passwordInput = document.getElementById('loginPassword');
    if (usuarioInput) usuarioInput.value = '';
    if (passwordInput) passwordInput.value = '';
}