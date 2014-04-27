$('.menu a').click(function() {
    // Hide the vehicle BUTTONS ATM
    $('#vehicles').css("display", "none");

    // Toggle the font on the button
    $('.trigger').toggle();
    $('.menu').toggleClass('round');
    $('.close').toggle();
    $('.drop-down').toggleClass('down');

    // Hide directions
    $('#info').toggleClass('hide');

    // stop the map from going over the drop down
    if ($('#map').css("z-index") === "-1") {
        $('#map').css("z-index", "1");
    } else {
        $('#map').css("z-index", "-1");
    }


    // Show the map Always
    $('#map').css("visibility", "visible");
});

$('#searchButton').click(function() {
    // Hide the map so the directions aren't messed up
    $('#map').css("visibility", "hidden");
});