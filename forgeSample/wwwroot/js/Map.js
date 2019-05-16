var map;
var geocoder;
var markers = [];

$(document).ready(function () {
    if (map == null) {
        geocoder = new google.maps.Geocoder();
        map = new google.maps.Map(document.getElementById('googlemap'), {
            zoom: 1,
            center: { lat: 0, lng: 0 },
            rotateControl: false,
            streetViewControl: false,
            tilt: 0
        });
    }
})

function showMap() {
    var bizunitsAddresses = {};
    projects.forEach(function (project) {
        if (project.business_unit_id != null) {
            if (bizunitsAddresses[project.business_unit_id] == undefined)
                bizunitsAddresses[project.business_unit_id] = project.business_unit.name;
        }

        if (project.address_line_1 != null && project.address_line_1 != '' && project.DMData !== undefined) {
            var projectAdress = project.address_line_1 + ' ' + project.address_line_2 + ' ' + project.city + ' ' + project.state_or_province + ' ' + project.postal_code + ' ' + project.country;
            findLocation('/img/icons8-crane-filled-50.png', projectAdress, project.name, 'https://docs.b360.autodesk.com/projects/' + project.id.replace('b.', ''));
        }
    });

    for (var bizunitId in bizunitsAddresses) {
        findLocation('https://github.com/encharm/Font-Awesome-SVG-PNG/raw/master/black/png/48/building-o.png', bizunitsAddresses[bizunitId], bizunitsAddresses[bizunitId]);
    }
}

function findLocation(iconUrl, search, label, url) {
    geocoder.geocode({ 'address': search }, function (results, status) {
        if (status === 'OK') {
            var marker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                icon: {
                    url: iconUrl,
                    size: new google.maps.Size(32, 38),
                    scaledSize: new google.maps.Size(32, 38),
                    labelOrigin: new google.maps.Point(15, 50)
                },
                label: {
                    text: label,
                    color: 'black',
                    fontSize: "20px",
                    fontWeight: 'bold'
                },
                url: url,
                animation: google.maps.Animation.DROP,
            });
            google.maps.event.addListener(marker, 'click', function () {
                if (url !== undefined)
                    window.open(this.url, '_blank');
            });
            markers.push(marker);
            fitToView();
        } else {
            console.log('Geocode was not successful for the following reason: ' + status);
        }
    });
}

function fitToView() {
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < markers.length; i++) {
        bounds.extend(markers[i].getPosition());
    }
    map.fitBounds(bounds);
}