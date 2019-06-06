/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function () {
    // first, check if current visitor is signed in
    jQuery.ajax({
        url: '/api/forge/oauth/token',
        success: function (res) {
            // yes, it is signed in...
            $('#signOut').show();

            // prepare sign out
            $('#signOut').click(function () {
                $('#hiddenFrame').on('load', function (event) {
                    location.href = '/api/forge/oauth/signout';
                });
                $('#hiddenFrame').attr('src', 'https://accounts.autodesk.com/Authentication/LogOut');
                // learn more about this signout iframe at
                // https://forge.autodesk.com/blog/log-out-forge
            })

            // finally:
            showUser();

            var hubId = getParameterByName('id');
            if (hubId === null || hubId === '') {
                $.getJSON("/api/forge/datamanagement/?id=%23", function (res) {
                    if (res.length == 1)
                        location.href = '/?id=' + res[0].id;
                    else {
                        res.forEach(function (hub) {
                            $('#hubsList').append($('<li/>', {
                                'class': "list-group-item"
                            }).append($('<a/>', {
                                'href': '/?id=' + hub.id,
                                'text': hub.text
                            })));
                        })
                        $('#selectAccountModal').modal('toggle');
                    }
                });
            }
            else
                showProjects(hubId);
        },
        error: function () {
            $('#signInModal').modal('toggle');
        }
    });

    $('#autodeskSigninButton').click(function () {
        jQuery.ajax({
            url: '/api/forge/oauth/url',
            success: function (url) {
                location.href = url;
            }
        });
    })

    $.getJSON("/api/forge/clientid", function (res) {
        $("#ClientID").val(res.id);
        $("#provisionAccountSave").click(function () {
            location.reload();
            //$('#provisionAccountModal').modal('toggle');
            //$('#userHubs').jstree(true).refresh();
        });
    });
});

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function showUser() {
    jQuery.ajax({
        url: '/api/forge/user/profile',
        success: function (profile) {
            var img = '<img src="' + profile.picture + '" height="30px">';
            $('#userInfo').html(img + profile.name);
        }
    });
}