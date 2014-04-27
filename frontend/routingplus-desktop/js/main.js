/*
 * If you want to query another API append this something like
 * &host=http://graphhopper.com/routing
 * to the URL or overwrite the 'host' variable.
 */
var tmpArgs = parseUrlWithHisto();
//var host = "http://graphhopper.com/routing";
var host = "http://localhost:8989";

if (host == null) {
    if (location.port === '') {
        host = location.protocol + '//' + location.hostname;
    } else {
        host = location.protocol + '//' + location.hostname + ":" + location.port;
    }
}

var ghRequest = new GHRequest(host);
var bounds = {};

//var nominatim = "http://open.mapquestapi.com/nominatim/v1/search.php";
//var nominatim_reverse = "http://open.mapquestapi.com/nominatim/v1/reverse.php";
var nominatim = "http://nominatim.openstreetmap.org/search";
var nominatim_reverse = "http://nominatim.openstreetmap.org/reverse";
var routingLayer;
var map;
var browserTitle = "GraphHopper Maps - Driving Directions";
var firstClickToRoute;
var defaultTranslationMap = null;
var enTranslationMap = null;
var routeSegmentPopup = null;

var iconFrom = L.icon({
    iconUrl: 'img/marker-icon-green.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

var iconTo = L.icon({
    iconUrl: 'img/marker-icon-red.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

$(document).ready(function(e) {
    // fixing cross domain support e.g in Opera
    jQuery.support.cors = true;
    var History = window.History;
    if (History.enabled) {
        History.Adapter.bind(window, 'statechange', function() {
            // No need for workaround?
            // Chrome and Safari always emit a popstate event on page load, but Firefox doesn’t
            // https://github.com/defunkt/jquery-pjax/issues/143#issuecomment-6194330

            var state = History.getState();
            console.log(state);
            initFromParams(state.data, true);
        });
    }

    $('#locationform').submit(function(e) {
        // no page reload
        e.preventDefault();
        mySubmit();
    });

    $('#gpxExportButton a').click(function(e) {
        // no page reload
        e.preventDefault();
        exportGPX();
    });

    var urlParams = parseUrlWithHisto();
    $.when(ghRequest.fetchTranslationMap(urlParams.locale), ghRequest.getInfo())
        .then(function(arg1, arg2) {
            // init translation retrieved from first call (fetchTranslationMap)
            var translations = arg1[0];

            // init language
            // 1. determined by Accept-Language header, falls back to 'en' if no translation map available
            // 2. can be overwritten by url parameter        
            ghRequest.setLocale(translations["locale"]);
            defaultTranslationMap = translations["default"];
            enTranslationMap = translations["en"];
            if (defaultTranslationMap == null)
                defaultTranslationMap = enTranslationMap;

            initI18N();

            // init bounding box from getInfo result
            var json = arg2[0];
            var tmp = json.bbox;
            bounds.initialized = true;
            bounds.minLon = tmp[0];
            bounds.minLat = tmp[1];
            bounds.maxLon = tmp[2];
            bounds.maxLat = tmp[3];
            var vehiclesDiv = $("#vehicles");

            function createButton(vehicle) {
                vehicle = vehicle.toLowerCase();
                var button = $("<button class='vehicle-btn' title='" + tr(vehicle) + "'/>")
                button.attr('id', vehicle);
                button.html("<img src='img/" + vehicle + ".png' alt='" + tr(vehicle) + "'></img>");
                button.click(function() {
                    ghRequest.vehicle = vehicle;
                    resolveFrom();
                    resolveTo();
                    routeLatLng(ghRequest);
                });
                return button;
            }

            if (json.supportedVehicles) {
                var vehicles = json.supportedVehicles.split(",");
                if (vehicles.length > 1)
                    ghRequest.vehicle = vehicles[0];
                for (var i = 0; i < vehicles.length; i++) {
                    vehiclesDiv.append(createButton(vehicles[i]));
                }
            }

            initMap();

            //        var data = JSON.parse("[[10.4049076,48.2802518],[10.405231,48.2801396],...]");
            //        var tempFeature = {
            //            "type": "Feature", "geometry": { "type": "LineString", "coordinates": data }
            //        };        
            //        routingLayer.addData(tempFeature);

            // execute query
            initFromParams(urlParams, true);
        }, function(err) {
            console.log(err);
            $('#error').html('GraphHopper API offline? ' + host);

            bounds = {
                "minLon": -180,
                "minLat": -90,
                "maxLon": 180,
                "maxLat": 90
            };
            initMap();
        });
});


function initMap() {
    var mapDiv = $("#map");
    var width = $(window).width() - 100;

    if (width < 100)
        width = $(window).width() - 5;

    var height = $(window).height() - 5;

    mapDiv.width(width).height(height);

    if (height > 350)
        height -= 265;

    $("#info").css("max-height", height);
    console.log("init map at " + JSON.stringify(bounds));

    // mapquest provider
    var moreAttr = 'Data &copy; <a href="http://www.openstreetmap.org/copyright">OSM</a>,' + 'JS: <a href="http://leafletjs.com/">Leaflet</a>';

    var tp = "ls";
    if (L.Browser.retina)
        tp = "lr";

    var lyrk = L.tileLayer('http://{s}.tiles.lyrk.org/' + tp + '/{z}/{x}/{y}?apikey=6e8cfef737a140e2a58c8122aaa26077', {
        attribution: '<a href="http://geodienste.lyrk.de/">Lyrk</a>,' + moreAttr,
        subdomains: ['a', 'b', 'c']
    });

    var mapquest = L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
        attribution: '<a href="http://open.mapquest.co.uk">MapQuest</a>,' + moreAttr,
        subdomains: ['otile1', 'otile2', 'otile3', 'otile4']
    });

    var mapquestAerial = L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png', {
        attribution: '<a href="http://open.mapquest.co.uk">MapQuest</a>,' + moreAttr,
        subdomains: ['otile1', 'otile2', 'otile3', 'otile4']
    });

    var thunderTransport = L.tileLayer('http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.thunderforest.com/transport/">Thunderforest Transport</a>,' + moreAttr,
        subdomains: ['a', 'b', 'c']
    });

    var thunderCycle = L.tileLayer('http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.thunderforest.com/opencyclemap/">Thunderforest Cycle</a>,' + moreAttr,
        subdomains: ['a', 'b', 'c']
    });

    var thunderOutdoors = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.thunderforest.com/outdoors/">Thunderforest Outdoors</a>,' + moreAttr,
        subdomains: ['a', 'b', 'c']
    });

    //    var mapbox = L.tileLayer('http://a.tiles.mapbox.com/v3/mapbox.world-bright/{z}/{x}/{y}.png', {
    //        attribution: '<a href="http://www.mapbox.com">MapBox</a>,' + moreAttr, 
    //        subdomains: ['a','b','c']
    //    });    

    var wrk = L.tileLayer('http://{s}.wanderreitkarte.de/topo/{z}/{x}/{y}.png', {
        attribution: '<a href="http://wanderreitkarte.de">WanderReitKarte</a>,' + moreAttr,
        subdomains: ['topo4', 'topo', 'topo2', 'topo3']
    });

    var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
        attribution: '<a href="http://cloudmade.com">Cloudmade</a>,' + moreAttr,
        key: '43b079df806c4e03b102055c4e1a8ba8',
        styleId: 997
    });

    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: moreAttr
    });

    var osmde = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
        attribution: moreAttr
    });

    // only work if you zoom a bit deeper
    var lang = "en_US";
    var apple = L.tileLayer('http://gsp2.apple.com/tile?api=1&style=slideshow&layers=default&lang=' + lang + '&z={z}&x={x}&y={y}&v=9', {
        maxZoom: 17,
        attribution: 'Map data and Imagery &copy; <a href="http://www.apple.com/ios/maps/">Apple</a>,' + moreAttr
    });

    // default
    map = L.map('map', {
        layers: [cloudmade],
        zoomControl: false
    });


    var baseMaps = {
        "Lyrk": lyrk,
        "MapQuest": mapquest,
        "MapQuest Aerial": mapquestAerial,
        "TF Transport": thunderTransport,
        "TF Cycle": thunderCycle,
        "TF Outdoors": thunderOutdoors,
        "Apple": apple, // didn't found a usage policy for this 
        "WanderReitKarte": wrk,
        "Cloudmade": cloudmade,
        "OpenStreetMap": osm,
        "OpenStreetMap.de": osmde
    };

    //    var overlays = {
    //        "MapQuest Hybrid": mapquest
    //    };

    // no layers for small browser windows
    if ($(window).width() > 400) {
        L.control.layers(baseMaps /*, overlays*/ ).addTo(map);
        // Could add hide js functions here
    }


    /* Leaflet sidebar start */

    var sidebar = L.control.sidebar('sidebar', {
        position: 'left'
    }).addTo(map);

    //Auto show sidebar
    setTimeout(function() {
        sidebar.show();
    }, 1000);

    // Change map control location
    //map.zoomControl('topright');


    // sidebar switcher
    document.getElementById('toggle-sidebar').onclick = function() {
        // Show sidebar
        sidebar.show();
    };

    // sidebar input switcher
    document.getElementById('toggle-sidebar-input').onclick = function() {
        // Show sidebar
        sidebar.hide();
    };

    map.locate({
        setView: true,
        maxZoom: 14
    });

    function onLocationFound(e) {

        L.marker(e.latlng).addTo(map).bindPopup("You").openPopup();
    }

    map.on('locationfound', onLocationFound);

    L.control.scale().addTo(map);

    map.fitWorld(new L.LatLngBounds(new L.LatLng(bounds.minLat, bounds.minLon),
        new L.LatLng(bounds.maxLat, bounds.maxLon)));

    map.attributionControl.setPrefix('');

    var myStyle = {
        "color": 'black',
        "weight": 2,
        "opacity": 0.3
    };
    var geoJson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [bounds.minLon, bounds.minLat],
                [bounds.maxLon, bounds.minLat],
                [bounds.maxLon, bounds.maxLat],
                [bounds.minLon, bounds.maxLat],
                [bounds.minLon, bounds.minLat]
            ]
        }
    };

    if (bounds.initialized)
        L.geoJson(geoJson, {
            "style": myStyle
        }).addTo(map);

    routingLayer = L.geoJson().addTo(map);
    firstClickToRoute = true;

    function onMapClick(e) {
        var latlng = e.latlng;
        latlng.lng = makeValidLng(latlng.lng);
        if (firstClickToRoute) {
            // set start point
            routingLayer.clearLayers();
            firstClickToRoute = false;
            ghRequest.from.setCoord(latlng.lat, latlng.lng);
            resolveFrom();
            sidebar.show(); //when the start point is selected, the sidebar will show
        } else {
            // set end point
            ghRequest.to.setCoord(latlng.lat, latlng.lng);
            resolveTo();
            // do not wait for resolving
            routeLatLng(ghRequest);
            // sidebar.hide(); //hide the sidebar when the end point is choosen
            firstClickToRoute = true;
        }
    }

    map.on('click', onMapClick);
}

function makeValidLng(lon) {
    if (lon < 180 && lon > -180)
        return lon;
    if (lon > 180)
        return (lon + 180) % 360 - 180;
    return (lon - 180) % 360 + 180;
}


function focus(coord, zoom, isFrom) {
    if (coord.lat && coord.lng) {
        if (!zoom)
            zoom = 10;
        routingLayer.clearLayers();

        zoom.paddingTopLeft = 1;
        map.setView(new L.LatLng(coord.lat, coord.lng - 1), zoom - 2);
        console.log("Set view ");

        map.panBy([200, 300]);
        conosole.log("Pan by 200,300 ");

        setFlag(coord, isFrom);
    }
}

function routeLatLng(request, doQuery) {
    // doZoom should not show up in the URL but in the request object to avoid zooming for history change
    var doZoom = request.doZoom;
    request.doZoom = false;

    var urlForHistory = request.createFullURL();
    // not enabled e.g. if no cookies allowed (?)
    // if disabled we have to do the query and cannot rely on the statechange history event    
    if (!doQuery && History.enabled) {
        // 2. important workaround for encoding problems in history.js
        var params = parseUrl(urlForHistory);
        console.log(params);
        params.doZoom = doZoom;
        // force a new request even if we have the same parameters
        params.mathRandom = Math.random();
        History.pushState(params, browserTitle, urlForHistory);
        return;
    }

    $("#info").empty();
    $("#info").show();
    var descriptionDiv = $("<div/>");
    $("#info").append(descriptionDiv);

    var from = request.from.toString();
    var to = request.to.toString();
    if (!from || !to) {
        descriptionDiv.html('<small>' + tr('locationsNotFound') + '</small>');
        return;
    }

    routingLayer.clearLayers();
    setFlag(request.from, true);
    setFlag(request.to, false);

    $("#vehicles button").removeClass("selectvehicle");
    $("button#" + request.vehicle.toLowerCase()).addClass("selectvehicle");

    var urlForAPI = request.createURL("point=" + from + "&point=" + to);
    descriptionDiv.html('<img src="img/indicator.gif"/> Search Route ...');
    request.doRequest(urlForAPI, function(json) {
        descriptionDiv.html("");
        if (json.info.errors) {
            var tmpErrors = json.info.errors;
            console.log(tmpErrors);
            for (var m = 0; m < tmpErrors.length; m++) {
                descriptionDiv.append("<div class='error'>" + tmpErrors[m].message + "</div>");
            }
            return;
        } else if (json.info.routeFound === false) {
            descriptionDiv.html('Route not found! Disconnected areas?');
            return;
        }
        var geojsonFeature = {
            "type": "Feature",
            // "style": myStyle,                
            "geometry": json.route.data
        };

        routingLayer.addData(geojsonFeature);
        if (json.route.bbox && doZoom) {
            var minLon = json.route.bbox[0];
            var minLat = json.route.bbox[1];
            var maxLon = json.route.bbox[2];
            var maxLat = json.route.bbox[3];
            var tmpB = new L.LatLngBounds(new L.LatLng(minLat, minLon), new L.LatLng(maxLat, maxLon));
            map.fitBounds(tmpB);
        }

        var tmpTime = createTimeString(json.route.time);
        var tmpDist = createDistanceString(json.route.distance);
        descriptionDiv.html(tr("routeInfo", [tmpDist, tmpTime]));

        var hiddenDiv = $("<div id='routeDetails'/>");
        hiddenDiv.hide();

        var toggly = $("<button style='font-size:14px; float: right; font-weight: bold; padding: 0px'>+</button>");
        toggly.click(function() {
            hiddenDiv.toggle();
        });
        $("#info").prepend(toggly);
        var infoStr = "took: " + round(json.info.took, 1000) + "s" + ", points: " + json.route.data.coordinates.length;
        //if (json.route.instructions)
        //    infoStr += ", instructions: " + json.route.instructions.descriptions.length;
        hiddenDiv.append("<span>" + infoStr + "</span>");
        $("#info").append(hiddenDiv);

        var exportLink = $("#exportLink a");
        exportLink.attr('href', urlForHistory);
        var startOsmLink = $("<a>start</a>");
        startOsmLink.attr("href", "http://www.openstreetmap.org/?zoom=14&mlat=" + request.from.lat + "&mlon=" + request.from.lng);
        var endOsmLink = $("<a>end</a>");
        endOsmLink.attr("href", "http://www.openstreetmap.org/?zoom=14&mlat=" + request.to.lat + "&mlon=" + request.to.lng);
        hiddenDiv.append("<br/><span>View on OSM: </span>").append(startOsmLink).append(endOsmLink);

        var osrmLink = $("<a>OSRM</a>");
        osrmLink.attr("href", "http://map.project-osrm.org/?loc=" + from + "&loc=" + to);
        hiddenDiv.append("<br/><span>Compare with: </span>");
        hiddenDiv.append(osrmLink);
        var googleLink = $("<a>Google</a> ");
        var addToGoogle = "";
        var addToBing = "";
        if (request.vehicle.toUpperCase() == "FOOT") {
            addToGoogle = "&dirflg=w";
            addToBing = "&mode=W";
        } else if ((request.vehicle.toUpperCase() == "BIKE") ||
            (request.vehicle.toUpperCase() == "RACINGBIKE") ||
            (request.vehicle.toUpperCase() == "MTB")) {
            addToGoogle = "&dirflg=b";
            // ? addToBing = "&mode=B";
        }
        googleLink.attr("href", "http://maps.google.com/?q=from:" + from + "+to:" + to + addToGoogle);
        hiddenDiv.append(googleLink);
        var bingLink = $("<a>Bing</a> ");
        bingLink.attr("href", "http://www.bing.com/maps/default.aspx?rtp=adr." + from + "~adr." + to + addToBing);
        hiddenDiv.append(bingLink);

        if (host.indexOf("gpsies.com") > 0)
            hiddenDiv.append("<div id='hosting'>The routing API is hosted by <a href='http://gpsies.com'>GPSies.com</a></div>");

        $('.defaulting').each(function(index, element) {
            $(element).css("color", "black");
        });

        if (json.route.instructions) {
            var instructionsElement = $("<table id='instructions'><colgroup>" + "<col width='10%'><col width='65%'><col width='25%'></colgroup>");
            $("#info").append(instructionsElement);
            var descriptions = json.route.instructions.descriptions;
            var distances = json.route.instructions.distances;
            var indications = json.route.instructions.indications;
            var millis = json.route.instructions.millis;
            var latLngs = json.route.instructions.latLngs;
            for (var m = 0; m < descriptions.length; m++) {
                var indi = indications[m];
                if (m == 0)
                    indi = "marker-from";
                else if (indi == -3)
                    indi = "sharp_left";
                else if (indi == -2)
                    indi = "left";
                else if (indi == -1)
                    indi = "slight_left";
                else if (indi == 0)
                    indi = "continue";
                else if (indi == 1)
                    indi = "slight_right";
                else if (indi == 2)
                    indi = "right";
                else if (indi == 3)
                    indi = "sharp_right";
                else if (indi == 4)
                    indi = "marker-to";
                else
                    throw "did not found indication " + indi;

                addInstruction(instructionsElement, indi, descriptions[m], distances[m], millis[m], latLngs[m]);
            }
        }
    });
}



function mySubmit() {
    var fromStr = $("#fromInput").val();
    var toStr = $("#toInput").val();
    if (toStr == "To" && fromStr == "From") {
        // TODO print warning
        return;
    }
    if (fromStr == "From") {
        // no special function
        return;
    }
    if (toStr == "To") {
        // lookup area
        ghRequest.from = new GHInput(fromStr);
        alert("derp");
        $.when(resolveFrom()).done(function() {
            focus(ghRequest.from);
        });
        return;
    }
    // route!
    resolveCoords(fromStr, toStr);
}