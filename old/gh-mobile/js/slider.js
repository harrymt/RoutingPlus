function setStyle(item) {
    item.onchange = function() {
        value = (item.value - item.min) / (item.max - item.min);
        item.style.backgroundImage = [
            '-webkit-gradient(',
            'linear, ',
            'left top, ',
            'right top, ',
            'color-stop(' + value + ', #007aff), ',
            'color-stop(' + value + ', #b8b7b8)',
            ')'
        ].join('');
    };
}


var item = document.getElementById('range');
var item1 = document.getElementById('range1');
var item2 = document.getElementById('range2');

setStyle(item);
setStyle(item1);
setStyle(item2);