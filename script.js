import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

// 1. Configuración
const firebaseConfig = {
    apiKey: "AIzaSyDx33MvRnQJa-Q8l6FQrLoyz5z2RG4Mg3A",
    authDomain: "monitoreo-piura.firebaseapp.com",
    databaseURL: "https://monitoreo-piura-default-rtdb.firebaseio.com",
    projectId: "monitoreo-piura",
    storageBucket: "monitoreo-piura.firebasestorage.app",
    messagingSenderId: "621398081719",
    appId: "1:621398081719:web:91f508ffb2dcecfe578d32",
    measurementId: "G-BQD5D9JP6G"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. Mapa
const map = L.map('map', { tap: true }).setView([-5.19, -80.63], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let monitoreoData = {};
let selectedLayer = null;
let geoLayer;

// 3. Limpiador de texto (Ñ y tildes)
function limpiarTexto(t) {
    if (!t) return "";
    return t.replace(/Ã‘/g, "Ñ").replace(/Ã¡/g, "Á").replace(/Ã©/g, "É").replace(/Ã/g, "Í").replace(/Ã³/g, "Ó").replace(/Ãº/g, "Ú");
}

// 4. Sincronización en Tiempo Real (Actualiza Mapa y Resumen)
onValue(ref(db, 'monitoreo'), (snapshot) => {
    monitoreoData = snapshot.val() || {};
    
    // Actualiza colores en el mapa
    if (geoLayer) {
        geoLayer.setStyle(f => {
            const name = limpiarTexto(f.properties.NOMBDIST);
            const info = monitoreoData[name];
            return { fillColor: info ? info.color : "#3498db", fillOpacity: 0.6 };
        });
    }
    
    // Actualiza los números del cuadro RESUMEN
    let r=0, a=0, v=0;
    Object.values(monitoreoData).forEach(i => {
        if(i.color === '#e74c3c') r++;
        else if(i.color === '#f1c40f') a++;
        else if(i.color === '#2ecc71') v++;
    });
    document.getElementById('count-rojo').innerText = r;
    document.getElementById('count-amarillo').innerText = a;
    document.getElementById('count-verde').innerText = v;
});

// 5. Cargar Distritos
fetch('LIM_DISTRITAL_PIURA_MIN.json')
    .then(res => res.json())
    .then(data => {
        geoLayer = L.geoJSON(data, {
            style: { color: "#2c3e50", weight: 1, fillColor: "#3498db", fillOpacity: 0.6 },
            onEachFeature: (f, l) => {
                const name = limpiarTexto(f.properties.NOMBDIST);
                l.bindTooltip(name, { permanent: true, direction: 'center', className: 'label-distrito' }).addTo(map);
                l.on('click', () => {
                    if (selectedLayer) selectedLayer.setStyle({ weight: 1 });
                    selectedLayer = l;
                    selectedLayer.setStyle({ weight: 3, color: "#000" });
                    mostrarVistaPrevia(name);
                });
            }
        }).addTo(map);
    });

// 6. Funciones de Guardado
function guardarDato(colorHex) {
    if (!selectedLayer) return;
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    const responsable = document.getElementById('input-encargado').value || "Sin asignar";
    
    set(ref(db, 'monitoreo/' + name), {
        encargado: responsable,
        color: colorHex
    });
    mostrarVistaPrevia(name);
}

window.eliminarEstado = function() {
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    if(confirm("¿Borrar datos de " + name + "?")) {
        remove(ref(db, 'monitoreo/' + name));
        regresar();
    }
};

// 7. Interfaz
function mostrarVistaPrevia(n) {
    const i = monitoreoData[n] || { encargado: 'Sin asignar', color: '#3498db' };
    document.getElementById('content-default').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
    document.getElementById('content-view').style.display = 'block';
    document.getElementById('view-distrito').innerText = n;
    document.getElementById('view-encargado').innerText = i.encargado;
    
    let est = "Pendiente";
    if(i.color==='#e74c3c') est="Crítico";
    else if(i.color==='#f1c40f') est="En Proceso";
    else if(i.color==='#2ecc71') est="Completado";
    document.getElementById('view-estado').innerText = est;
}

function regresar() {
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('content-default').style.display = 'block';
}

// 8. Eventos de Botones
document.getElementById('btn-abrir-editor').onclick = () => {
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    const info = monitoreoData[name] || { encargado: '' };
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('edit-distrito-titulo').innerText = name;
    document.getElementById('input-encargado').value = info.encargado === 'Sin asignar' ? '' : info.encargado;
};

document.getElementById('btn-rojo').onclick = () => guardarDato('#e74c3c');
document.getElementById('btn-amarillo').onclick = () => guardarDato('#f1c40f');
document.getElementById('btn-verde').onclick = () => guardarDato('#2ecc71');
document.getElementById('btn-eliminar').onclick = () => eliminarEstado();
document.getElementById('btn-cerrar-view').onclick = () => regresar();
document.getElementById('btn-cancelar-edit').onclick = () => mostrarVistaPrevia(limpiarTexto(selectedLayer.feature.properties.NOMBDIST));

document.getElementById('btn-csv').onclick = () => {
    let csv = "\ufeffDistrito;Encargado;Estado\n";
    Object.keys(monitoreoData).forEach(d => {
        const i = monitoreoData[d];
        let e = i.color==='#e74c3c'?"Critico":(i.color==='#f1c40f'?"Proceso":"Hecho");
        csv += `${d};${i.encargado};${e}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reporte_piura.csv";
    link.click();
};
