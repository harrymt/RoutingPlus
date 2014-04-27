function setStyle(item) {
    item.onchange = function () {
        var value = (item.value - item.min) / (item.max - item.min);
        item.style.backgroundImage = [
            '-webkit-gradient(',
            'linear, ',
            'left top, ',
            'right top, ',
            'color-stop(' + value + ', #007aff), ',
            'color-stop(' + value + ', #b8b7b8)',
            ')'
        ].join('');
        mySubmit();
    };
}

var items = new Array();
items[0] = document.getElementById('trafficSignals');
items[1] = document.getElementById('motorway');
items[2] = document.getElementById('mainRoads');
items[3] = document.getElementById('residential');

var checkboxItem = document.getElementsByName('speed_toggle');

for (var i = 0; i < 4; i++) {
    if (items[i] != null) {
        setStyle(items[i]);
    }
}

checkboxItem.onchange = function () {
    if (checkboxItem != null) {
        mySubmit();
    }
}