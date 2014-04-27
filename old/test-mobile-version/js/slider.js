function setStyle(item) {
    item.onchange = function() {
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
    item.onchange = function() {
        if (item.checked) {
            alert('shortest');
        } else {
            alert('fastest');
        }
    };
    mySubmit();
}

var item = document.getElementById('trafficSlider');
var item1 = document.getElementById('turnSlider');
var item2 = document.getElementById('motorwaySlider');
var item3 = document.getElementById('mainroadsSlider');
var item4 = document.getElementById('residentialSlider');

var checkboxItem = document.getElementsByName('speed_toggle');

if (item !== null) {
    setStyle(item);
}
if (item1 !== null) {
    setStyle(item1);
}
if (item2 !== null) {
    setStyle(item2);
}
if (item3 !== null) {
    setStyle(item3);
}
if (item4 !== null) {
    setStyle(item4);
}

weightingStyle(checkboxItem);