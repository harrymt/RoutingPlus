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