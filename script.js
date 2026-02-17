import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

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

// MAPA
const map = L.map('map', { tap: true }).setView([-5.19, -80.63], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let monitoreoData = {};
let selectedLayer = null;
let geoLayer;

function limpiarTexto(t) {
    if (!t) return "";
    return t.replace(/Ã‘/g, "Ñ").replace(/Ã¡/g, "Á").replace(/Ã©/g, "É").replace(/Ã/g, "Í").replace(/Ã³/g, "Ó").replace(/Ãº/g, "Ú");
}

// 2. SINCRONIZACIÓN (Esto llenará el "null" que ves)
onValue(ref(db, 'monitoreo'), (snapshot) => {
    monitoreoData = snapshot.val() || {};
    
    if (geoLayer) {
        geoLayer.setStyle(f => {
            const name = limpiarTexto(f.properties.NOMBDIST);
            const info = monitoreoData[name];
            return { fillColor: info ? info.color : "#3498db", fillOpacity: 0.6 };
        });
    }
    
    // Actualizar Resumen
    let r=0, a=0, v=0;
    Object.values(monitoreoData).forEach(d => {
        if(d.color === '#e74c3c') r++;
        else if(d.color === '#f1c40f') a++;
        else if(d.color === '#2ecc71') v++;
    });
    document.getElementById('count-rojo').innerText = r;
    document.getElementById('count-amarillo').innerText = a;
    document.getElementById('count-verde').innerText = v;
});

// 3. CARGAR DISTRITOS
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
                    mostrarPanel(name);
                });
            }
        }).addTo(map);
    });

// 4. LÓGICA DE BOTONES (ESTO ES LO QUE TE FALTA)
function guardarDato(colorHex) {
    if (!selectedLayer) return;
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    const resp = document.getElementById('input-encargado').value || "Sin asignar";
    
    // Guardar en Firebase
    set(ref(db, 'monitoreo/' + name), {
        encargado: resp,
        color: colorHex
    }).then(() => {
        console.log("Guardado con éxito en la nube");
    });
}

// ASIGNACIÓN MANUAL (Asegúrate de que estos IDs existan en tu HTML)
document.getElementById('btn-rojo').addEventListener('click', () => guardarDato('#e74c3c'));
document.getElementById('btn-amarillo').addEventListener('click', () => guardarDato('#f1c40f'));
document.getElementById('btn-verde').addEventListener('click', () => guardarDato('#2ecc71'));
document.getElementById('btn-eliminar').addEventListener('click', () => {
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    if(confirm("¿Borrar?")) remove(ref(db, 'monitoreo/' + name));
});

// INTERFAZ
function mostrarPanel(n) {
    const i = monitoreoData[n] || { encargado: 'Sin asignar', color: '#3498db' };
    document.getElementById('content-default').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
    document.getElementById('content-view').style.display = 'block';
    document.getElementById('view-distrito').innerText = n;
    document.getElementById('view-encargado').innerText = i.encargado;
}

document.getElementById('btn-abrir-editor').onclick = () => {
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('edit-distrito-titulo').innerText = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
};

document.getElementById('btn-cerrar-view').onclick = () => {
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('content-default').style.display = 'block';
};

document.getElementById('btn-cancelar-edit').onclick = () => {
    document.getElementById('editor').style.display = 'none';
    document.getElementById('content-view').style.display = 'block';
};
