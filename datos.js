
var sanitarios = [
    { id: 1, nombre: "Ana", apellidos: "García López", usuario: "agarcia", password: "1234" },
    { id: 2, nombre: "Carlos", apellidos: "Martínez Ruiz", usuario: "cmartinez", password: "1234" }
];

var gestores = [
    { id: 1, nombre: "Admin", apellidos: "Principal", usuario: "admin", password: "admin" },
    { id: 2, nombre: "María", apellidos: "Sánchez Pérez", usuario: "msanchez", password: "1234" }
];

var ubicaciones = [
    { id: 1, nombre: "Planta 1 - Almacén" },
    { id: 2, nombre: "Planta 2 - Sala de curas" },
    { id: 3, nombre: "Planta 3 - Laboratorio" },
    { id: 4, nombre: "Urgencias" }
];

var categorias = [
    { id: 1, nombre: "Termómetros" },
    { id: 2, nombre: "Estetoscopios" },
    { id: 3, nombre: "Sillas de ruedas" },
    { id: 4, nombre: "Monitores" }
];

var modelos = [
    { id: 1, nombre: "Termómetro digital básico", categoria: 1, horas_maximas: 48 },
    { id: 2, nombre: "Termómetro infrarrojo", categoria: 1, horas_maximas: 24 },
    { id: 3, nombre: "Estetoscopio profesional", categoria: 2, horas_maximas: 72 },
    { id: 4, nombre: "Silla de ruedas estándar", categoria: 3, horas_maximas: 168 },
    { id: 5, nombre: "Monitor signos vitales", categoria: 4, horas_maximas: 48 }
];

var recursos = [
    { id: 1, modelo: 1, ubicacion: 1, numero_serie: "TERM001", estado: 0 },
    { id: 2, modelo: 1, ubicacion: 2, numero_serie: "TERM002", estado: 0 },
    { id: 3, modelo: 2, ubicacion: 3, numero_serie: "TERM003", estado: 0 },
    { id: 4, modelo: 3, ubicacion: 2, numero_serie: "EST001", estado: 0 },
    { id: 5, modelo: 4, ubicacion: 4, numero_serie: "SILLA001", estado: 0 }
];

var reservas = [
    { 
        id: 1, 
        recurso: 1, 
        sanitario: 1, 
        horas_estimadas: 4, 
        fecha_peticion: new Date(2026, 1, 20, 10, 30), 
        fecha_inicio: new Date(2026, 1, 20, 11, 0), 
        fecha_fin: new Date(2026, 1, 20, 15, 0) 
    },
    { 
        id: 2, 
        recurso: 2, 
        sanitario: 2, 
        horas_estimadas: 24, 
        fecha_peticion: new Date(2026, 1, 21, 9, 0), 
        fecha_inicio: new Date(2026, 1, 21, 10, 0), 
        fecha_fin: null 
    },
    { 
        id: 3, 
        recurso: 3, 
        sanitario: 1, 
        horas_estimadas: 2, 
        fecha_peticion: new Date(2026, 1, 22, 8, 0), 
        fecha_inicio: null, 
        fecha_fin: null 
    }
];

var resenvas = [
    { 
        id: 1, 
        recurso: 1, 
        sanitario: 1, 
        fecha: new Date(2026, 1, 21, 12, 0), 
        valor: 4, 
        descripcion: "Funciona correctamente" 
    },
    { 
        id: 2, 
        recurso: 2, 
        sanitario: 2, 
        fecha: new Date(2026, 1, 22, 14, 0), 
        valor: 5, 
        descripcion: "Muy preciso" 
    }
];


module.exports.sanitarios = sanitarios;
module.exports.gestores = gestores;
module.exports.ubicaciones = ubicaciones;
module.exports.categorias = categorias;
module.exports.modelos = modelos;
module.exports.recursos = recursos;
module.exports.reservas = reservas;
module.exports.resenvas = resenvas;