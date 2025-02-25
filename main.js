

// Variables globales
let map, sidebar; 

document.addEventListener("DOMContentLoaded", function () {
    init(); // Llama a las funciones que deben ejecutarse al cargar la página
});

function init() {
    makeMap();          // Inicializa el mapa y agrega la imagen satelital
    addTileLayer();     // Agrega la capa de OpenStreetMap
    addSidebar();       // Agrega el panel lateral
    addGeoJSON();       // Agrega la capa de escuelas (agregamos el sidebar primero porque usamos eso en geojson)

    /* Inspeccionar zoom.
    map.on('zoomend', function () {
        console.log("Nivel de zoom actual:", map.getZoom());
    });
    */
}

function makeMap() {
    /*
    Estos son los límites de la imagen satelital
    let center = [-25.29196, -57.48639]; (CENTRO DE LA IMAGEN SATELITAL)
    */
    let lowerLeft = [-25.70095, -57.83323]; 
    let upperRight = [-24.8821, -57.14187];
    let center = [-25.295239, -57.625608]; // Arbitrario, desicion estetica de taka.

    // Definir los límites del mapa según la imagen satelital
    let bounds = L.latLngBounds(lowerLeft, upperRight);

    let imageBounds = [lowerLeft, upperRight];

    // Inicializamos el mapa y establecemos su vista en las coordenadas geográficas elegidas y un nivel de zoom
    map = L.map('map', {
        center: center,
        zoom: 14.5,
        minZoom: 11.5, 
        maxBounds: bounds, // Restringe el área visible
        maxBoundsViscosity: 1.0 // Mantiene al usuario dentro de los límites
    });

    /* Para ver donde clickeamos en el mapa
    let location = L.popup();

    function onMapClick(e) {
        location
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(map);
    }
    
    map.on('click', onMapClick);
    */

    // PopUp con las instrucciones
    L.popup({
        autoPan: true,
        autoPanPadding: L.point(10, 10)  // 10px de margen en todos los lados
    })
    .setLatLng(map.getBounds().getNorthEast()) 
    .setContent('<div id="popUp"><h3 id="popupStart">Instrucciones<br >popup</h3><p>textoPopup</p></div>')
    .openOn(map);
    
    let imageUrl = 'https://tania-karo.github.io/pilot2-mapa-calor-asu/imagenes/mapa-calor-asu.png';
    
    // Agregamos la imagen satelital
    let imageLayer = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.7 });
    imageLayer.addTo(map);
    
}

function addTileLayer() {

    let tileOSM = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tileOSM.on('tileload', function (event) {
        event.tile.style.filter = "grayscale(100%)"; // Aplica el filtro a cada imagen
    });

    L.Control.geocoder().addTo(map);
}

// Función para configurar la interacción de los marcadores con el sidebar
// Llamada en addGeoJSON()
function configureMarkerInteraction(layer) {
    let name = layer.feature.properties?.Name || "Sin nombre";

    layer.bindPopup(name);

    layer.on('click', function () {
        document.getElementById("escuelaName").innerHTML = `Local Educativo Seleccionado`;
        document.getElementById("escuelaContent").innerHTML = `<div><p>Nombre: <b>${name}</b></p></div>`;
        // document.getElementById("escuelaInfo").textContent = `Información sobre ${name}`;
        sidebar.open('escuelas');

        let latlng = layer.getLatLng();
        let offsetLng = -0.0015 / 3; // Ajusta este valor según el nivel de zoom para moverlo 400px
    
        map.setView([latlng.lat, latlng.lng + offsetLng], 18, { animate: true });
    });
    
}

function addGeoJSON() {
    let geojsonUrl = 'https://raw.githubusercontent.com/Tania-Karo/pilot2-mapa-calor-asu/refs/heads/main/escuelas-piloto-3.geojson';

    function getIconSize(zoom) {
        let size = Math.max(10, zoom * 1.5); // Ajusta el tamaño dinámicamente, mínimo 10px
        return [size, size];
    }

    function createIcon(zoom) {
        let [width, height] = getIconSize(zoom);
        return L.divIcon({
            className: "custom-div-icon",
            html: `<i class="bi bi-mortarboard" style="font-size: ${width}px; color: #0b3954;"></i>`,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2],
            popupAnchor: [width / 2, -height / 2]
        });
    }

    fetch(geojsonUrl)
        .then(response => response.ok ? response.json() : Promise.reject(`Error fetching GeoJSON: ${response.status}`))
        .then(data => {
            let geoJsonLayer = L.geoJSON(data, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: createIcon(map.getZoom()) }),
                onEachFeature: (feature, layer) => configureMarkerInteraction(layer)
            }).addTo(map);

            map.on('zoomend', function () {
                let newZoom = map.getZoom();
                geoJsonLayer.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        layer.setIcon(createIcon(newZoom));
                    }
                });
            });
        })
        .catch(error => console.error('Error cargando GeoJSON:', error));
}

function addSidebar() {
    sidebar = L.control.sidebar({
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether to add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(map);
    
    // sidebar.open('home');

    /* Para que cierre automáticamente cuando el usuario haga clic fuera de él*/
    map.on("click", function () {
        let sidebarElement = document.querySelector(".leaflet-sidebar");
        if (!sidebarElement.classList.contains("collapsed")) {
            sidebar.close();
        }
    });
    
    // Detecta si el usuario hace clic fuera del sidebar y, si está abierto, lo cierra.
    function closeSidebar(event) {
        let sidebar = document.querySelector(".leaflet-sidebar");

        // Verifica si el clic/toque fue fuera del sidebar y si está abierto
        if (!sidebar.contains(event.target) && sidebar.classList.contains("open")) {
            sidebar.close(); // Cierra el sidebar
        }
    }

    document.addEventListener("click", closeSidebar);
    document.addEventListener("touchstart", closeSidebar);
}



