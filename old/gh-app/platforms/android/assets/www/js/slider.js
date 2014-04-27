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

function weightingStyle(item) {
    item.onClick(function () {
        alert("jdsifaj");
        mySubmit();
    });
}

var item = document.getElementById('trafficSignals');
var item1 = document.getElementById('rightTurns');
var item2 = document.getElementById('motorway');
var item3 = document.getElementById('mainRoads');
var item4 = document.getElementById('residential');

var checkboxItem = document.getElementsByName('speed_toggle');


setStyle(item);
setStyle(item1);
setStyle(item2);
setStyle(item3);
setStyle(item4);

weightingStyle(checkboxItem);