// Plan to put unused js functions here
// so we can work on the used ones in main.js
// Toggle settings
$(document).ready(function() {
    $("#settings").hide();
    $("#settings-js-btn").click(function() {
        $("#settings").toggle();
        // Change text on btn aswel
        $("#route").toggle();
    });
});

// do not print everything as nominatim slows down or doesn't properly handle if continent etc is included
function dataToText(data) {
    var data = data.locationDetails;
    var text = "";
    if (data.road)
        text += data.road;

    if (data.city) {
        if (text.length > 0)
            text += ", ";
        text += data.city;
    }

    if (data.postcode) {
        if (text.length > 0)
            text += ", ";
        text += data.postcode;
    }

    if (data.country) {
        if (text.length > 0)
            text += ", ";
        var tmp = $.trim(data.country.replace(data.city, '').replace(data.city + ", ", ''));
        text += tmp;
    }
    return text;
}

function dataToHtml(data) {
    var data = data.locationDetails;
    var text = "";
    if (data.road)
        text += "<div class='roadseg'>" + data.road + "</div>";
    if (data.city) {
        text += "<div class='cityseg'>" + insComma(data.city, data.country) + "</div>";
    }
    if (data.country)
        text += "<div class='moreseg'>" + data.more + "</div>";
    return text;
}


function setAutoCompleteList(fromOrTo, ghRequestLoc) {
    function formatValue(suggestionValue, currentValue) {
        var pattern = '(' + $.Autocomplete.utils.escapeRegExChars(currentValue) + ')';
        return suggestionValue.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
    }
    var isFrom = fromOrTo === "from";
    var pointIndex = isFrom ? 1 : 2;
    var fakeCurrentInput = ghRequestLoc.input.toLowerCase();
    var valueDataList = [];
    var list = ghRequestLoc.resolvedList;
    for (var index in list) {
        var dataItem = list[index];
        valueDataList.push({
            value: dataToText(dataItem),
            data: dataItem
        });
    }

    var options = {
        maxHeight: 510,
        triggerSelectOnValidInput: false,
        autoSelectFirst: false,
        lookup: valueDataList,
        onSearchError: function(element, q, jqXHR, textStatus, errorThrown) {
            console.log(element + ", " + q + ", textStatus " + textStatus + ", " + errorThrown);
        },
        formatResult: function(suggestion, currInput) {
            // avoid highlighting for now as this breaks the html sometimes
            return dataToHtml(suggestion.data);
        },
        lookupFilter: function(suggestion, originalQuery, queryLowerCase) {
            if (queryLowerCase === fakeCurrentInput)
                return true;
            return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
        }
    };
    options.onSelect = function(suggestion) {
        options.onPreSelect(suggestion);
    };
    options.onPreSelect = function(suggestion) {
        var data = suggestion.data;
        ghRequestLoc.setCoord(data.lat, data.lng);
        ghRequestLoc.input = dataToText(suggestion.data);
        if (ghRequest.from.isResolved() && ghRequest.to.isResolved())
            routeLatLng(ghRequest);
        else if (suggestion.data.boundingbox) {
            var bbox = suggestion.data.box;
            focusWithBounds(ghRequestLoc, [
                [bbox[0], bbox[2]],
                [bbox[1], bbox[3]]
            ], isFrom);
        } else
            alert("derpee");
        focus(ghRequestLoc, 15, isFrom);
    };

    options.containerClass = "complete-" + pointIndex;
    var myAutoDiv = getAutoCompleteDiv(fromOrTo);
    myAutoDiv.autocomplete(options);
    myAutoDiv.autocomplete().forceSuggest("");
    myAutoDiv.focus();
}

function initI18N() {
    $('#searchButton').attr("value", tr("searchButton"));
    $('#fromInput').attr("placeholder", tr("fromHint"));
    $('#toInput').attr("placeholder", tr("toHint"));
}

function exportGPX() {
    if (ghRequest.from.isResolved() && ghRequest.to.isResolved())
        window.open(ghRequest.createGPXURL());
    return false;
}

function getAutoCompleteDiv(fromOrTo) {
    if (fromOrTo === "from")
        return $('#fromInput')
    else
        return $('#toInput');
}


function stringFormat(str, args) {
    if (typeof args === 'string')
        args = [args];

    if (str.indexOf("%1$s") >= 0) {
        // with position arguments ala %2$s
        return str.replace(/\%(\d+)\$s/g, function(match, matchingNum) {
            matchingNum--;
            return typeof args[matchingNum] != 'undefined' ? args[matchingNum] : match;
        });
    } else {
        // no position so only values ala %s
        var matchingNum = 0;
        return str.replace(/\%s/g, function(match) {
            var val = typeof args[matchingNum] != 'undefined' ? args[matchingNum] : match;
            matchingNum++;
            return val;
        });
    }
}

function floor(val, precision) {
    if (!precision)
        precision = 1e6;
    return Math.floor(val * precision) / precision;
}

function round(val, precision) {
    if (precision === undefined)
        precision = 1e6;
    return Math.round(val * precision) / precision;
}

function tr(key, args) {
    return tr2("web." + key, args);
}

function tr2(key, args) {
    if (key == null) {
        console.log("ERROR: key was null?");
        return "";
    }
    if (defaultTranslationMap == null) {
        console.log("ERROR: defaultTranslationMap was not initialized?");
        return key;
    }
    key = key.toLowerCase();
    var val = defaultTranslationMap[key];
    if (val == null && enTranslationMap)
        val = enTranslationMap[key];
    if (val == null)
        return key;

    return stringFormat(val, args);
}

function parseUrlWithHisto() {
    if (window.location.hash)
        return parseUrl(window.location.hash);

    return parseUrl(window.location.search);
}

function parseUrlAndRequest() {
    return parseUrl(window.location.search);
}

function parseUrl(query) {
    var index = query.indexOf('?');
    if (index >= 0)
        query = query.substring(index + 1);
    var res = {};
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var indexPos = vars[i].indexOf("=");
        if (indexPos < 0)
            continue;

        var key = vars[i].substring(0, indexPos);
        var value = vars[i].substring(indexPos + 1);
        value = decodeURIComponent(value.replace(/\+/g, ' '));

        if (typeof res[key] === "undefined")
            res[key] = value;
        else if (typeof res[key] === "string") {
            var arr = [res[key], value];
            res[key] = arr;
        } else
            res[key].push(value);

    }
    return res;
}

function showRouteSegmentPopup(html, latLng) {
    hideRouteSegmentPopup();
    routeSegmentPopup = L.popup().setLatLng(latLng).setContent(html).openOn(map);
}

function hideRouteSegmentPopup() {
    if (routeSegmentPopup) {
        map.removeLayer(routeSegmentPopup);
        routeSegmentPopup = null;
    }
}

function getCenter(bounds) {
    var center = {
        lat: 0,
        lng: 0
    };
    if (bounds.initialized) {
        center.lat = (bounds.minLat + bounds.maxLat) / 2;
        center.lng = (bounds.minLon + bounds.maxLon) / 2;
    }
    return center;
}

function addInstruction(main, indi, title, distance, milliEntry, latLng) {
    var indiPic = "<img class='instr_pic' style='vertical-align: middle' src='" +
        window.location.pathname + "img/" + indi + ".png'/>";
    var str = "<td class='instr_title'>" + title + "</td>";

    if (distance > 0) {
        str += " <td class='instr_distance_td'><span class='instr_distance'>" + createDistanceString(distance) + "<br/>" + createTimeString(milliEntry) + "</span></td>";
    }

    if (indi !== "continue")
        str = "<td>" + indiPic + "</td>" + str;
    else
        str = "<td/>" + str;
    var instructionDiv = $("<tr class='instruction'/>");
    instructionDiv.html(str);
    if (latLng) {
        instructionDiv.click(function() {
            hideRouteSegmentPopup();
            showRouteSegmentPopup(indiPic + " " + title, latLng);
        });
    }
    main.append(instructionDiv);
}

function createDistanceString(dist) {
    if (dist < 900)
        return round(dist, 1) + tr2("mAbbr");

    dist = round(dist / 1000, 100);
    if (dist > 100)
        dist = round(dist, 1);
    return dist + tr2("kmAbbr");
}

function createTimeString(time) {
    var tmpTime = round(time / 60 / 1000, 1000);
    var resTimeStr;
    if (tmpTime > 60) {
        if (tmpTime / 60 > 24) {
            resTimeStr = floor(tmpTime / 60 / 24, 1) + tr2("dayAbbr");
            tmpTime = floor(((tmpTime / 60) % 24), 1);
            if (tmpTime > 0)
                resTimeStr += " " + tmpTime + tr2("hourAbbr");
        } else {
            resTimeStr = floor(tmpTime / 60, 1) + tr2("hourAbbr");
            tmpTime = floor(tmpTime % 60, 1);
            if (tmpTime > 0)
                resTimeStr += " " + tmpTime + tr2("minAbbr");
        }
    } else
        resTimeStr = round(tmpTime % 60, 1) + tr2("minAbbr");
    return resTimeStr;
}

function doGeoCoding(input, limit, timeout) {
    // see https://trac.openstreetmap.org/ticket/4683 why limit=3 and not 1
    if (!limit)
        limit = 10;
    var url = nominatim + "?format=json&addressdetails=1&q=" + encodeURIComponent(input) + "&limit=" + limit;
    if (bounds.initialized) {
        // minLon, minLat, maxLon, maxLat => left, top, right, bottom
        url += "&bounded=1&viewbox=" + bounds.minLon + "," + bounds.maxLat + "," + bounds.maxLon + "," + bounds.minLat;
    }

    return $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        timeout: timeout
    }).fail(createCallback("[nominatim] Problem while looking up location " + input));
}

function createCallback(errorFallback) {
    return function(err) {
        console.log(errorFallback + " " + JSON.stringify(err));
    };
}

function focusWithBounds(coord, bbox, isFrom) {
    routingLayer.clearLayers();
    // bbox needs to be in the none-geojson format!?
    // [[lat, lng], [lat2, lng2], ...]
    map.fitBounds(new L.LatLngBounds(bbox));
    setFlag(coord, isFrom);
}

function insComma(textA, textB) {
    if (textA.length > 0)
        return textA + ", " + textB;
    return textB;
}

function formatLocationEntry(address) {
    var locationDetails = {};
    var text = "";
    if (address.road) {
        text = address.road;
        if (address.house_number) {
            if (text.length > 0)
                text += " ";
            text += address.house_number;
        }
        locationDetails.road = text;
    }

    locationDetails.postcode = address.postcode;
    locationDetails.country = address.country;

    if (address.city || address.suburb || address.town || address.village || address.hamlet || address.locality) {
        text = "";
        if (address.locality)
            text = insComma(text, address.locality);
        if (address.hamlet)
            text = insComma(text, address.hamlet);
        if (address.village)
            text = insComma(text, address.village);
        if (address.suburb)
            text = insComma(text, address.suburb);
        if (address.city)
            text = insComma(text, address.city);
        if (address.town)
            text = insComma(text, address.town);
        locationDetails.city = text;
    }

    text = "";
    if (address.state)
        text += address.state;

    if (address.continent)
        text = insComma(text, address.continent);

    locationDetails.more = text;
    return locationDetails;
}


/**
 * Returns a defer object containing the location pointing to a resolvedList with all the found
 * coordinates.
 */
function createAmbiguityList(locCoord) {
    // make example working even if nominatim service is down
    if (locCoord.input.toLowerCase() === "madrid") {
        locCoord.lat = 40.416698;
        locCoord.lng = -3.703551;
        locCoord.locationDetails = formatLocationEntry({
            city: "Madrid",
            country: "Spain"
        });
        locCoord.resolvedList = [locCoord];
    }
    if (locCoord.input.toLowerCase() === "moscow") {
        locCoord.lat = 55.751608;
        locCoord.lng = 37.618775;
        locCoord.locationDetails = formatLocationEntry({
            road: "Borowizki-Straße",
            city: "Moscow",
            country: "Russian Federation"
        });
        locCoord.resolvedList = [locCoord];
    }

    if (locCoord.isResolved()) {
        var tmpDefer = $.Deferred();
        tmpDefer.resolve([locCoord]);
        return tmpDefer;
    }

    locCoord.error = "";
    locCoord.resolvedList = [];
    var timeout = 3000;
    if (locCoord.lat && locCoord.lng) {
        var url = nominatim_reverse + "?lat=" + locCoord.lat + "&lon=" + locCoord.lng + "&format=json&zoom=16";
        return $.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            timeout: timeout
        }).fail(function(err) {
            // not critical => no alert
            locCoord.error = "Error while looking up coordinate";
            console.log(err);
        }).pipe(function(json) {
            if (!json) {
                locCoord.error = "No description found for coordinate";
                return [locCoord];
            }
            var address = json.address;
            var point = {};
            point.lat = locCoord.lat;
            point.lng = locCoord.lng;
            point.bbox = json.boundingbox;
            point.positionType = json.type;
            point.locationDetails = formatLocationEntry(address);
            // point.address = json.address;
            locCoord.resolvedList.push(point);
            return [locCoord];
        });
    } else {
        return doGeoCoding(locCoord.input, 10, timeout).pipe(function(jsonArgs) {
            if (!jsonArgs || jsonArgs.length == 0) {
                locCoord.error = "No area description found";
                return [locCoord];
            }
            var prevImportance = jsonArgs[0].importance;
            var address;
            for (var index in jsonArgs) {
                var json = jsonArgs[index];
                // if we have already some results ignore unimportant
                if (prevImportance - json.importance > 0.4)
                    break;

                // de-duplicate via ignoring boundary stuff => not perfect as 'Freiberg' would no longer be correct
                // if (json.type === "administrative")
                //    continue;

                // if no different properties => skip!
                if (address && JSON.stringify(address) === JSON.stringify(json.address))
                    continue;

                address = json.address;
                prevImportance = json.importance;
                var point = {};
                point.lat = round(json.lat);
                point.lng = round(json.lon);
                point.locationDetails = formatLocationEntry(address);
                point.bbox = json.boundingbox;
                point.positionType = json.type;
                locCoord.resolvedList.push(point);
            }
            if (locCoord.resolvedList.length === 0) {
                locCoord.error = "No area description found";
                return [locCoord];
            }
            var list = locCoord.resolvedList;
            locCoord.lat = list[0].lat;
            locCoord.lng = list[0].lng;
            // locCoord.input = dataToText(list[0]);
            return [locCoord];
        });
    }
}

function setFlag(coord, isFrom) {
    if (coord.lat) {
        var marker = L.marker([coord.lat, coord.lng], {
            icon: (isFrom ? iconFrom : iconTo),
            draggable: true
        }).addTo(routingLayer).bindPopup(isFrom ? "Start" : "End");
        marker.on('dragend', function(e) {
            routingLayer.clearLayers();
            // inconsistent leaflet API: event.target.getLatLng vs. mouseEvent.latlng?
            var latlng = e.target.getLatLng();
            if (isFrom) {
                ghRequest.from.setCoord(latlng.lat, latlng.lng);
                resolveFrom();
            } else {
                ghRequest.to.setCoord(latlng.lat, latlng.lng);
                resolveTo();
            }
            // do not wait for resolving and avoid zooming when dragging
            ghRequest.doZoom = false;
            routeLatLng(ghRequest, false);
        });
    }
}

function resolveFrom() {
    setFlag(ghRequest.from, true);
    return resolve("from", ghRequest.from);
}

function resolveTo() {
    setFlag(ghRequest.to, false);
    return resolve("to", ghRequest.to);
}

function resolve(fromOrTo, locCoord) {
    $("#" + fromOrTo + "Flag").hide();
    $("#" + fromOrTo + "Indicator").show();
    $("#" + fromOrTo + "Input").val(locCoord.input);

    return createAmbiguityList(locCoord).done(function(arg1) {
        var errorDiv = $("#" + fromOrTo + "ResolveError");
        errorDiv.empty();
        var foundDiv = $("#" + fromOrTo + "ResolveFound");
        // deinstallation of completion if there was one
        // if (getAutoCompleteDiv(fromOrTo).autocomplete())
        //    getAutoCompleteDiv(fromOrTo).autocomplete().dispose();

        foundDiv.empty();
        var list = locCoord.resolvedList;
        if (locCoord.error) {
            errorDiv.text(locCoord.error);
        } else if (list) {
            var anchor = String.fromCharCode(0x25BC);
            var linkPart = $("<a>" + anchor + "<small>" + list.length + "</small></a>");
            foundDiv.append(linkPart.click(function(e) {
                setAutoCompleteList(fromOrTo, locCoord);
            }));
        }

        $("#" + fromOrTo + "Indicator").hide();
        $("#" + fromOrTo + "Flag").show();
        return locCoord;
    });
}

function initFromParams(params, doQuery) {
    ghRequest.init(params);
    var fromAndTo = params.from && params.to;
    var routeNow = params.point && params.point.length == 2 || fromAndTo;
    if (routeNow) {
        if (fromAndTo)
            resolveCoords(params.from, params.to, doQuery);
        else
            resolveCoords(params.point[0], params.point[1], doQuery);
    }
}

function resolveCoords(fromStr, toStr, doQuery) {
    if (fromStr !== ghRequest.from.input || !ghRequest.from.isResolved())
        ghRequest.from = new GHInput(fromStr);

    if (toStr !== ghRequest.to.input || !ghRequest.to.isResolved())
        ghRequest.to = new GHInput(toStr);

    if (ghRequest.from.lat && ghRequest.to.lat) {
        // two mouse clicks into the map -> do not wait for resolve
        resolveFrom();
        resolveTo();
        routeLatLng(ghRequest, doQuery);
    } else {
        // at least one text input from user -> wait for resolve as we need the coord for routing     
        $.when(resolveFrom(), resolveTo()).done(function(fromArgs, toArgs) {
            routeLatLng(ghRequest, doQuery);
        });
    }
}