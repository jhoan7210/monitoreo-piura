const map = L.map('map', { tap: true }).setView([-5.19, -80.63], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let monitoreoData = JSON.parse(localStorage.getItem('mapaPiuraData')) || {};
let selectedLayer = null;

// Corrige nombres del JSON (Ñ y tildes)
function limpiarTexto(t) {
    if (!t) return "";
    return t.replace(/Ã‘/g, "Ñ").replace(/Ã¡/g, "Á").replace(/Ã©/g, "É").replace(/Ã/g, "Í").replace(/Ã³/g, "Ó").replace(/Ãº/g, "Ú");
}

fetch('LIM_DISTRITAL_PIURA_MIN.json')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: (f) => {
                const name = limpiarTexto(f.properties.NOMBDIST);
                const info = monitoreoData[name];
                return { color: "#2c3e50", weight: 1, fillColor: info ? info.color : "#3498db", fillOpacity: 0.6 };
            },
            onEachFeature: (f, l) => {
                const name = limpiarTexto(f.properties.NOMBDIST);
                l.bindTooltip(name, { permanent: true, direction: 'center', className: 'label-distrito' }).addTo(map);
                l.on('click', () => {
                    if (selectedLayer) selectedLayer.setStyle({ weight: 1, color: "#2c3e50" });
                    selectedLayer = l;
                    selectedLayer.setStyle({ weight: 3, color: "#000" });
                    mostrarVistaPrevia(name);
                });
            }
        }).addTo(map);
        actualizarEstadisticas();
    });

function updateStatus(type) {
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    const user = document.getElementById('input-encargado').value;
    const colors = { rojo: '#e74c3c', amarillo: '#f1c40f', verde: '#2ecc71' };
    
    monitoreoData[name] = { encargado: user, color: colors[type] };
    localStorage.setItem('mapaPiuraData', JSON.stringify(monitoreoData));
    
    selectedLayer.setStyle({ fillColor: colors[type], fillOpacity: 0.8 });
    actualizarEstadisticas();
    mostrarVistaPrevia(name);
}

function eliminarEstado() {
    const name = limpiarTexto(selectedLayer.feature.properties.NOMBDIST);
    if(confirm("¿Eliminar estado?")) {
        delete monitoreoData[name];
        localStorage.setItem('mapaPiuraData', JSON.stringify(monitoreoData));
        selectedLayer.setStyle({ fillColor: "#3498db", fillOpacity: 0.6 });
        actualizarEstadisticas();
        regresar();
    }
}

function actualizarEstadisticas() {
    let r=0, a=0, v=0;
    Object.values(monitoreoData).forEach(i => {
        if(i.color === '#e74c3c') r++;
        else if(i.color === '#f1c40f') a++;
        else if(i.color === '#2ecc71') v++;
    });
    document.getElementById('count-rojo').innerText = r;
    document.getElementById('count-amarillo').innerText = a;
    document.getElementById('count-verde').innerText = v;
}

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

    document.getElementById('btn-abrir-editor').onclick = () => {
        document.getElementById('content-view').style.display = 'none';
        document.getElementById('editor').style.display = 'block';
        document.getElementById('edit-distrito-titulo').innerText = n;
        document.getElementById('input-encargado').value = i.encargado === 'Sin asignar' ? '' : i.encargado;
    };
}

function regresar() {
    if (selectedLayer) selectedLayer.setStyle({ weight: 1, color: "#2c3e50" });
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('content-default').style.display = 'block';
}

function cancelarEdicion() {
    mostrarVistaPrevia(limpiarTexto(selectedLayer.feature.properties.NOMBDIST));
}

function exportarCSV() {
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
}
