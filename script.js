// 1. Configuración del mapa
const map = L.map('map').setView([-5.19, -80.63], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

// 2. Persistencia de datos
let monitoreoData = JSON.parse(localStorage.getItem('mapaPiuraData')) || {};
let selectedLayer = null;

// 3. FUNCIÓN PARA CORREGIR CARACTERES EXTRAÑOS (Limpiador de Nombres)
function limpiarNombre(texto) {
    if (!texto) return "";
    return texto
        .replace(/Ã‘/g, "Ñ")
        .replace(/Ã‘/g, "Ñ")
        .replace(/Ã¡/g, "Á")
        .replace(/Ã©/g, "É")
        .replace(/Ã/g, "Í")
        .replace(/Ã³/g, "Ó")
        .replace(/Ãº/g, "Ú")
        .replace(/Ã/g, "Á")
        .replace(/Ã‰/g, "É")
        .replace(/Ã/g, "Í")
        .replace(/Ã“/g, "Ó")
        .replace(/Ãš/g, "Ú");
}

// 4. Cargar y Procesar GeoJSON
fetch('LIM_DISTRITAL_PIURA_MIN.json')
    .then(res => res.json())
    .then(geoData => {
        L.geoJSON(geoData, {
            style: function(feature) {
                // Limpiamos el nombre para buscarlo en la "base de datos" local
                const distName = limpiarNombre(feature.properties.NOMBDIST);
                const info = monitoreoData[distName];
                return {
                    color: "#2c3e50", weight: 1,
                    fillColor: info ? info.color : "#3498db",
                    fillOpacity: 0.6
                };
            },
            onEachFeature: function (feature, layer) {
                // Aplicamos la limpieza al nombre que irá en el mapa
                const distName = limpiarNombre(feature.properties.NOMBDIST);

                // Tooltip sin recuadro (estilo plano integrado)
                layer.bindTooltip(distName, {
                    permanent: true, 
                    direction: 'center', 
                    className: 'label-distrito',
                    opacity: 1
                }).addTo(map);

                layer.on('click', function (e) {
                    if (selectedLayer) {
                        selectedLayer.setStyle({ weight: 1, color: "#2c3e50" });
                    }
                    selectedLayer = layer;
                    selectedLayer.setStyle({ weight: 3, color: "#000" });
                    mostrarVistaPrevia(distName);
                });
            }
        }).addTo(map);
        
        actualizarEstadisticas();
    });

// 5. Lógica del Panel de Información
function mostrarVistaPrevia(distName) {
    const info = monitoreoData[distName] || { encargado: 'Sin asignar', color: '#3498db' };
    
    document.getElementById('content-default').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
    document.getElementById('content-view').style.display = 'block';

    document.getElementById('view-distrito').innerText = distName;
    document.getElementById('view-encargado').innerText = info.encargado;
    
    let estado = "Pendiente";
    if(info.color === '#e74c3c') estado = "Crítico";
    else if(info.color === '#f1c40f') estado = "En Proceso";
    else if(info.color === '#2ecc71') estado = "Completado";
    document.getElementById('view-estado').innerText = estado;

    document.getElementById('btn-abrir-editor').onclick = () => {
        abrirEditor(distName, info.encargado);
    };
}

function abrirEditor(distName, encargadoActual) {
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('edit-distrito-titulo').innerText = "Editando: " + distName;
    document.getElementById('input-encargado').value = encargadoActual === 'Sin asignar' ? '' : encargadoActual;
}

// 6. Guardar y Actualizar
function updateStatus(colorType) {
    if (!selectedLayer) return;
    const distName = limpiarNombre(selectedLayer.feature.properties.NOMBDIST);
    const nombre = document.getElementById('input-encargado').value;
    let hex = colorType === 'rojo' ? '#e74c3c' : (colorType === 'amarillo' ? '#f1c40f' : '#2ecc71');

    monitoreoData[distName] = { encargado: nombre, color: hex };
    localStorage.setItem('mapaPiuraData', JSON.stringify(monitoreoData));

    selectedLayer.setStyle({ fillColor: hex, fillOpacity: 0.8 });
    actualizarEstadisticas();
    mostrarVistaPrevia(distName);
}

// 7. Eliminar Estado
function eliminarEstado() {
    if (!selectedLayer) return;
    const distName = limpiarNombre(selectedLayer.feature.properties.NOMBDIST);
    
    if (confirm(`¿Reiniciar monitoreo de ${distName}?`)) {
        delete monitoreoData[distName];
        localStorage.setItem('mapaPiuraData', JSON.stringify(monitoreoData));
        selectedLayer.setStyle({ fillColor: "#3498db", fillOpacity: 0.6 });
        actualizarEstadisticas();
        regresar();
    }
}

// 8. Estadísticas
function actualizarEstadisticas() {
    let r = 0, a = 0, v = 0;
    Object.values(monitoreoData).forEach(i => {
        if (i.color === '#e74c3c') r++;
        else if (i.color === '#f1c40f') a++;
        else if (i.color === '#2ecc71') v++;
    });
    document.getElementById('count-rojo').innerText = r;
    document.getElementById('count-amarillo').innerText = a;
    document.getElementById('count-verde').innerText = v;
}

// 9. Exportación Corregida para Excel
function exportarCSV() {
    let csv = "\ufeffDistrito;Encargado;Estado\n";
    Object.keys(monitoreoData).forEach(d => {
        const info = monitoreoData[d];
        let est = info.color === '#e74c3c' ? "Critico" : (info.color === '#f1c40f' ? "En Proceso" : "Completado");
        csv += `${d};${info.encargado || 'Sin asignar'};${est}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte_monitoreo_piura.csv";
    link.click();
}

// 10. Navegación
function regresar() {
    if (selectedLayer) selectedLayer.setStyle({ weight: 1, color: "#2c3e50" });
    document.getElementById('content-view').style.display = 'none';
    document.getElementById('content-default').style.display = 'block';
}

function cancelarEdicion() {
    mostrarVistaPrevia(limpiarNombre(selectedLayer.feature.properties.NOMBDIST));
}