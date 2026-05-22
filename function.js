// =========================
// MAP
// =========================

var mymap = L.map('map', {

    zoomControl: false

}).setView(
    [-2.9925, 120.1969],
    11
);

// create custom panes for vector layers so geojson stays above basemap
mymap.createPane('geojsonPane');
mymap.getPane('geojsonPane').style.zIndex = 450;
mymap.getPane('geojsonPane').style.pointerEvents = 'auto';

mymap.createPane('bufferPane');
mymap.getPane('bufferPane').style.zIndex = 460;
mymap.getPane('bufferPane').style.pointerEvents = 'auto';

// =========================
// ZOOM CONTROL
// =========================

L.control.zoom({

    position: 'topright'

}).addTo(mymap);

// =========================
// BASEMAP
// =========================

// OPENSTREETMAP
var osm = L.tileLayer(

    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

    {

        maxZoom: 19,

        attribution:
            '&copy; OpenStreetMap'

    }

);

// ESRI SATELLITE
var esriSatellite = L.tileLayer(

    'https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Imagery/MapServer/tile/{z}/{y}/{x}',

    {

        attribution:
            'Tiles &copy; Esri'

    }

);

// ESRI TOPO
var esriTopo = L.tileLayer(

    'https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Topo_Map/MapServer/tile/{z}/{y}/{x}',

    {

        attribution:
            'Tiles &copy; Esri'

    }

);

// CARTO LIGHT
var cartoLight = L.tileLayer(

    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',

    {

        attribution:
            '&copy; CartoDB'

    }

);

// CARTO DARK
var cartoDark = L.tileLayer(

    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',

    {

        attribution:
            '&copy; CartoDB'

    }

);

// DEFAULT BASEMAP
osm.addTo(mymap);

// =========================
// SCALE
// =========================

var scaleControl = L.control.scale({

    metric: true,

    imperial: false,

    maxWidth: 150,

    position: 'bottomright'

}).addTo(mymap);

// =========================
// BASEMAP CONTROL
// =========================

var baseMaps = {

    "OpenStreetMap": osm,

    "ESRI Satellite": esriSatellite,

    "ESRI Topographic": esriTopo,

    "Carto Light": cartoLight,

    "Carto Dark": cartoDark

};

// =========================
// FEATURE GROUP
// =========================

var drawnItems = new L.FeatureGroup();

mymap.addLayer(drawnItems);

// =========================
// VARIABLE
// =========================

var selectedLayers = [];

var measurementCount = 0;

var bufferLayer;

var geojsonLayer;

// =========================
// OVERLAY MAPS
// =========================

var overlayMaps = {

    "Hasil Digitasi": drawnItems

};

// =========================
// LAYER CONTROL
// =========================

var layerControl = L.control.layers(

    baseMaps,

    overlayMaps,

    {

        collapsed: false,

        position: 'topright'

    }

).addTo(mymap);

// =========================
// GEOJSON - load multiple files in specific order
// =========================

(async function loadGeoJSONsInOrder() {

    var layersOrder = [
        { path: 'Admin.geojson', title: 'Admin' },
        { path: 'Ladang.geojson', title: 'Ladang' },
        { path: 'Sawah.geojson', title: 'Sawah' },
        { path: 'Kebun.geojson', title: 'Kebun' },
        { path: 'Jalan.geojson', title: 'Jalan' },
        { path: 'Pemerintah.geojson', title: 'Pemerintah' },
        { path: 'RumahSakit.geojson', title: 'Rumah Sakit' },
        { path: 'Pendidikan.geojson', title: 'Pendidikan' },
        { path: 'Terminal.geojson', title: 'Terminal Bus' }
    ];

    // default styles per layer (cycled)
    var colors = [
        { color: 'orange', fillColor: 'yellow' },
        { color: 'green', fillColor: 'lightgreen' },
        { color: 'brown', fillColor: 'wheat' },
        { color: 'purple', fillColor: 'plum' },
        { color: 'blue', fillColor: 'lightblue' },
        { color: 'darkred', fillColor: 'pink' },
        { color: 'red', fillColor: 'salmon' },
        { color: 'teal', fillColor: 'cyan' },
        { color: 'gray', fillColor: 'lightgray' }
    ];

    var combinedBounds = L.latLngBounds();

    for (var i = 0; i < layersOrder.length; i++) {

        var info = layersOrder[i];
        try {
            var resp = await fetch(info.path);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var data = await resp.json();

            var styleObj = Object.assign({
                weight: 2,
                fillOpacity: 0.5
            }, colors[i % colors.length]);

            var layer = L.geoJSON(data, {

                pane: 'geojsonPane',

                style: function(feature) {
                    return styleObj;
                },

                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, {
                        pane: 'geojsonPane',
                        radius: 6,
                        fillColor: styleObj.color || 'red',
                        color: 'black',
                        weight: 1,
                        fillOpacity: 0.8
                    });
                },

                onEachFeature: function(feature, layer) {
                    enableFeatureSelection(layer);
                }

            }).addTo(mymap);

            layer.bringToFront();

            // add to layer control in the same order
            layerControl.addOverlay(layer, info.title);

            // extend combined bounds if available
            try {
                var b = layer.getBounds();
                if (b && b.isValid && b.isValid()) combinedBounds.extend(b);
            } catch (e) {
                // ignore bounds errors for point-only layers
            }

        } catch (err) {
            console.error('Failed to load geojson', info.path, err);
        }

    }

    // Do not override the initial view.
    // if (combinedBounds.isValid && combinedBounds.isValid()) {
    //     mymap.fitBounds(combinedBounds);
    // }

})();

// =========================
// SISTEM SATUAN
// =========================

document.getElementById(
    'measurementSystem'
).addEventListener('change', function () {

    var system = this.value;

    var unitSelect =
        document.getElementById(
            'bufferUnit'
        );

    unitSelect.innerHTML = "";

    // HAPUS SCALE LAMA
    mymap.removeControl(scaleControl);

    // METRIC
    if (system == "metric") {

        unitSelect.innerHTML = `

            <option value="meters">
                Meter
            </option>

            <option value="kilometers">
                Kilometer
            </option>

        `;

        scaleControl = L.control.scale({

            metric: true,

            imperial: false,

            maxWidth: 150,

            position: 'bottomright'

        }).addTo(mymap);

    }

    // IMPERIAL
    else {

        unitSelect.innerHTML = `

            <option value="feet">
                Feet
            </option>

            <option value="miles">
                Miles
            </option>

        `;

        scaleControl = L.control.scale({

            metric: false,

            imperial: true,

            maxWidth: 150,

            position: 'bottomright'

        }).addTo(mymap);

    }

});

// =========================
// DIGITASI GARIS
// =========================

document.getElementById(
    'drawLineBtn'
).addEventListener('click', function () {

    var drawer =

        new L.Draw.Polyline(
            mymap,
            {

                shapeOptions: {

                    color: 'red',

                    weight: 3

                }

            }
        );

    drawer.enable();

});

// =========================
// DIGITASI POLYGON
// =========================

document.getElementById(
    'drawPolygonBtn'
).addEventListener('click', function () {

    var drawer =

        new L.Draw.Polygon(
            mymap,
            {

                allowIntersection: false,

                shapeOptions: {

                    color: 'blue',

                    weight: 2

                }

            }
        );

    drawer.enable();

});

// =========================
// PILIH FEATURE
// =========================

function enableFeatureSelection(layer) {

    layer.on('click', function () {

        // SUDAH TERPILIH
        if (
            selectedLayers.includes(layer)
        ) {

            selectedLayers =
                selectedLayers.filter(
                    l => l !== layer
                );

            // RESET STYLE
            if (layer.setStyle) {

                layer.setStyle({

                    color: 'blue',

                    weight: 2

                });

            }

        }

        // BELUM TERPILIH
        else {

            selectedLayers.push(layer);

            // STYLE SELECTED
            if (layer.setStyle) {

                layer.setStyle({

                    color: 'lime',

                    weight: 5

                });

            }

        }

        // UPDATE HASIL
        calculateSelectedFeatures();

    });

}

// =========================
// HASIL PENGUKURAN
// =========================

function addMeasurementResult(
    type,
    value
) {

    measurementCount++;

    var container =
        document.getElementById(
            'measurementResults'
        );

    // HAPUS DEFAULT
    if (
        container.innerHTML ==
        'Belum ada pengukuran'
    ) {

        container.innerHTML = '';

    }

    container.innerHTML += `

        <div class="measure-item">

            <b>${measurementCount}. ${type}</b>

            <br>

            ${value}

        </div>

    `;

}

// =========================
// HITUNG FEATURE
// =========================

function calculateSelectedFeatures() {

    var container =
        document.getElementById(
            'measurementResults'
        );

    // RESET
    container.innerHTML = '';

    measurementCount = 0;

    // TIDAK ADA SELEKSI
    if (selectedLayers.length == 0) {

        container.innerHTML =
            'Belum ada pengukuran';

        return;

    }

    selectedLayers.forEach(function(layer) {

        var geoJSON =
            layer.toGeoJSON();

        // GARIS
        if (
            geoJSON.geometry.type ==
            'LineString'
        ) {

            var distance = turf.length(

                geoJSON,

                {
                    units: 'kilometers'
                }

            );

            var distanceM =
                (distance * 1000).toFixed(2);

            var distanceKM =
                distance.toFixed(4);

            addMeasurementResult(

                'Panjang',

                distanceM +
                ' meter (' +
                distanceKM +
                ' km)'

            );

        }

        // POLYGON
        if (
            geoJSON.geometry.type ==
            'Polygon'
        ) {

            var area =
                turf.area(geoJSON);

            var areaMeter2 =
                area.toFixed(2);

            var areaKm2 =
                (area / 1000000).toFixed(4);

            addMeasurementResult(

                'Luas',

                areaMeter2 +
                ' m² (' +
                areaKm2 +
                ' km²)'

            );

        }

    });

}

// =========================
// HAPUS DIGITASI TERPILIH
// =========================

document.getElementById(
    'deleteSelectedBtn'
).addEventListener('click', function () {

    if (selectedLayers.length == 0) {

        return;

    }

    selectedLayers.forEach(function(layer) {

        drawnItems.removeLayer(layer);

    });

    // RESET
    selectedLayers = [];

    calculateSelectedFeatures();

});

// =========================
// HAPUS SEMUA DIGITASI
// =========================

document.getElementById(
    'deleteAllDigitasiBtn'
).addEventListener('click', function () {

    drawnItems.clearLayers();

    selectedLayers = [];

    calculateSelectedFeatures();

});

// =========================
// BUFFER
// =========================

function createBuffer() {

    // HAPUS BUFFER LAMA
    if (bufferLayer) {

        mymap.removeLayer(bufferLayer);

    }

    // TIDAK ADA SELEKSI
    if (selectedLayers.length == 0) {

        alert('Pilih fitur digitasi atau klik layer GeoJSON (akan berubah warna hijau) terlebih dahulu sebelum membuat buffer.');
        return;

    }

    // VALIDASI: pastikan fitur yang dipilih benar-benar feature individual, bukan layer group
    var validFeatures = [];
    selectedLayers.forEach(function(layer) {
        if (layer.toGeoJSON) {
            validFeatures.push(layer);
        }
    });

    if (validFeatures.length == 0) {
        alert('Tidak ada fitur individual yang dipilih. Klik pada feature GeoJSON secara langsung (akan berubah warna hijau).');
        return;
    }

    // INPUT BUFFER
    var distance = parseFloat(

        document.getElementById(
            'bufferDistance'
        ).value

    );

    var unit = document.getElementById(
        'bufferUnit'
    ).value;

    // validasi input
    if (isNaN(distance) || distance <= 0) {
        alert('Masukkan jarak buffer lebih besar dari 0.');
        return;
    }

    // AMBIL FEATURE
    var features = [];

    validFeatures.forEach(function(layer) {

        features.push(
            layer.toGeoJSON()
        );

    });

    var sourceGeoJSON = {

        type: "FeatureCollection",

        features: features

    };

    // BUFFER
    var buffered = turf.buffer(

        sourceGeoJSON,

        distance,

        {
            units: unit
        }

    );

    // TAMPILKAN BUFFER
    bufferLayer = L.geoJSON(

        buffered,

        {

            pane: 'bufferPane',

            style: {

                color: 'cyan',

                fillColor: 'lightblue',

                fillOpacity: 0.4,

                weight: 2

            }

        }

    ).addTo(mymap);

    bufferLayer.bringToFront();

    mymap.fitBounds(
        bufferLayer.getBounds()
    );

}

// =========================
// HAPUS BUFFER
// =========================

document.getElementById(
    'deleteBufferBtn'
).addEventListener('click', function () {

    if (bufferLayer) {

        mymap.removeLayer(bufferLayer);

        bufferLayer = null;

    }

});

// =========================
// HAPUS SELEKSI
// =========================

document.getElementById(
    'clearSelectionBtn'
).addEventListener('click', function () {

    selectedLayers.forEach(function(layer) {
        if (layer.setStyle) {
            layer.setStyle({
                color: 'blue',
                weight: 2
            });
        }
    });

    selectedLayers = [];

    calculateSelectedFeatures();

    alert('Semua seleksi telah dihapus. Klik pada feature untuk memilihnya kembali.');

});

// =========================
// HASIL DIGITASI
// =========================

mymap.on('draw:created', function (event) {

    var layer = event.layer;

    drawnItems.addLayer(layer);

    // AKTIFKAN SELEKSI
    enableFeatureSelection(layer);

    // AUTO SELECT
    selectedLayers.push(layer);

    // STYLE SELECTED
    if (layer.setStyle) {

        layer.setStyle({

            color: 'lime',

            weight: 5

        });

    }

    // UPDATE HASIL
    calculateSelectedFeatures();

});

// =========================
// TOGGLE TOOL PANEL
// =========================

document.getElementById(
    'toggleControlPanel'
).addEventListener('click', function () {

    document.getElementById(
        'controlPanel'
    ).classList.toggle('hidden');

});

// =========================
// TOGGLE LEGEND
// =========================

document.getElementById(
    'toggleLegend'
).addEventListener('click', function () {

    var legend =
        document.querySelector(
            '.leaflet-control-layers'
        );

    legend.classList.toggle('hidden');

});
