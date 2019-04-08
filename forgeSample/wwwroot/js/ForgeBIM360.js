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

var activeAccountId;
function showProjects(hubId) {
    activeAccountId = hubId;
    $.getJSON('/api/forge/bim360/accounts/' + hubId + '/projects', function (res) {
        $('#projectByUnit').empty();
        res.forEach(function (project) {
            if (project.HQData.business_unit_id == null) {
                project.HQData.business_unit_id = 'nobizunit';
                project.HQData.business_unit = {};
                project.HQData.business_unit.name = 'Not specified'
            }

            if (!$("#" + project.HQData.business_unit_id).exists()) {
                $('#projectByUnit').append($('<div class="col-xs-4"><div class="panel panel-default" id='
                    + project.HQData.business_unit_id + '><div class="panel-heading">'
                    + project.HQData.business_unit.name + '<span class="glyphicon glyphicon-plus-sign glyphiconTop mlink" style="cursor:pointer;float:right" title="Create Project" onclick="createProject(\''
                    + project.HQData.business_unit_id
                    + '\')"></span></div><div class="panel-body"><ul class="list-group"></ul></div></div></div>'));
            }

            var listOfProjects = $('#' + project.HQData.business_unit_id).find('.list-group');
            listOfProjects.append($('<li class="list-group-item"><a href="https://docs.b360.autodesk.com/projects/' + project.id.replace('b.', '') + '" target="_blank">' + project.attributes.name + '</a><span title="Import users" class="glyphicon glyphicon-user" style="float:right; cursor:pointer;" onclick="prepareToImportUsers(\'' + project.id + '\')"></span></li>'))
            /*listOfProjects.append($('<li/>', {
                'class': "list-group-item"
            }).append($('<a/>', {
                'href': 'https://docs.b360.autodesk.com/projects/' + project.id.replace('b.', ''),
                'target': '_blank',
                'text': project.attributes.name
            })));*/
        });

    });
}

$.fn.exists = function () {
    return this.length !== 0;
}

$.fn.inputFilter = function (inputFilter) {
    return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function () {
        if (inputFilter(this.value)) {
            this.oldValue = this.value;
            this.oldSelectionStart = this.selectionStart;
            this.oldSelectionEnd = this.selectionEnd;
        } else if (this.hasOwnProperty("oldValue")) {
            this.value = this.oldValue;
            this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
        }
    });
};

var activeBizUnitId;
function createProject(bizUnitId) {
    $('#createProjectModal').modal('toggle');
    activeBizUnitId = bizUnitId;
}

$(document).ready(function () {
    $("#newProjectId").inputFilter(function (value) {
        return /^\d*$/.test(value);
    });

    $("#newProjectId").keyup(function (event) {
        $("#newProjectIdSpan").html($("#newProjectId").val() + '-');// event.target.value);
    });
    $('#checkNoProjNum').change(function () {
        if ($(this).is(":checked")) {
            $("#newProjectId").prop('disabled', true);
            $("#newProjectIdSpan").html('NoProjNum');
        }
        else {
            $("#newProjectId").prop('disabled', false);
            $("#newProjectIdSpan").html(($("#newProjectId").val() + '-'));
        }
    });

    $("#userSearchCity").keyup(function (event) {
        updateUserToImport();
    });

    $("#userSearchState").keyup(function (event) {
        updateUserToImport();
    });

    $("#userSearchCountry").keyup(function (event) {
        updateUserToImport();
    });

    $('.input-daterange').datepicker({
        format: "yyyy-mm-dd"
    });

    $("#createProjectButton").click(function () {
        var projectName = $("#newProjectName").val();
        var projectId = $("#newProjectIdSpan").html();
        var startDate = $("#startDate").val();
        var endDate = $("#endDate").val();
        var projectType = $("#projectTypes").val();
        var newProjectValue = $("#newProjectValue").val();

        jQuery.post({
            url: '/api/forge/bim360/accounts/' + activeAccountId + '/projects',
            contentType: 'application/json',
            data: JSON.stringify({ name: projectId + projectName, start_date: startDate, end_date: endDate, project_type: projectType, business_unit_id: activeBizUnitId, value: newProjectValue, currency: 'USD' }),
            success: function (res) {
                $('#createProjectModal').modal('toggle');
                prepareToImportUsers(res.id);
            },
            error: function (err) {

            }
        });
    });

    $("#importUsersButton").click(function () {
        var ids = [];
        $("#list2").find('[name="listUser"]').each(function (element) {
            var checkbox = $(this).find("[type=checkbox]")[0];
            if (checkbox.checked) ids.push(checkbox.id);
        });

        var roleId = $("#industryRoles").val();

        jQuery.post({
            url: '/api/forge/bim360/accounts/' + activeAccountId + '/projects/' + activeProjectId + '/users',
            contentType: 'application/json',
            data: JSON.stringify({ roleId: roleId, userIds: ids }),
            success: function (res) {
                $('#importUsersModal').modal('toggle');
                showProjects(activeAccountId);
            },
            error: function (err) {
                alert(err);
            }
        });
    });
});

function prepareToImportUsers(projectId) {
    activeProjectId = projectId;
    $('#importUsersModal').modal('toggle');

    $.getJSON('/api/forge/bim360/accounts/' + activeAccountId + '/projects/' + projectId + '/roles', function (roles) {
        roles.forEach(function (role) {
            var o = new Option(role.name, role.id);
            $(o).html(role.name);
            $("#industryRoles").append(o);
        })
    });

    $.getJSON('/api/forge/bim360/accounts/' + activeAccountId + '/users', function (users) {
        listOfUsers = users;
        updateUserToImport();
    });
}

var activeProjectId;

function updateUserToImport() {
    var city = $("#userSearchCity").val();
    var state = $("#userSearchState").val();
    var country = $("#userSearchCountry").val();

    //$('a[name="listUser"]').remove();
    $("#list1").find('[name="listUser"]').remove();
    listOfUsers.forEach(function (user) {
        if ((city === '' || (user.city !== null && user.city.toLowerCase().indexOf(city.toLowerCase()) >= 0))
            && (state === '' || (user.state_or_province !== null && user.state_or_province.toLowerCase().indexOf(state.toLowerCase()) >= 0))
            && (country === '' || (user.country !== null && user.country.toLowerCase().indexOf(country.toLowerCase()) >= 0)))
            $("#list1").append('<a name="listUser" href="#" class="list-group-item">' + user.name + '<input type="checkbox" id="' + user.id + '" class="pull-right"></a>');
    })

}

var listOfUsers;

//https://codepen.io/fengcai/pen/raWvLp
$(document).ready(function () {
    $('.add').click(function () {
        $('.all').prop("checked", false);
        var items = $("#list1 input:checked:not('.all')");
        var n = items.length;
        if (n > 0) {
            items.each(function (idx, item) {
                var choice = $(item);
                choice.prop("checked", true);
                choice.parent().appendTo("#list2");
            });
        }
        else {
            alert("Choose an item from list 1");
        }
    });

    $('.remove').click(function () {
        $('.all').prop("checked", false);
        var items = $("#list2 input:checked:not('.all')");
        items.each(function (idx, item) {
            var choice = $(item);
            choice.prop("checked", false);
            choice.parent().appendTo("#list1");
        });
    });

    /* toggle all checkboxes in group */
    $('.all').click(function (e) {
        e.stopPropagation();
        var $this = $(this);
        if ($this.is(":checked")) {
            $this.parents('.list-group').find("[type=checkbox]").prop("checked", true);
        }
        else {
            $this.parents('.list-group').find("[type=checkbox]").prop("checked", false);
            $this.prop("checked", false);
        }
    });

    $('[type=checkbox]').click(function (e) {
        e.stopPropagation();
    });

    /* toggle checkbox when list group item is clicked */
    $('.list-group a').click(function (e) {

        e.stopPropagation();

        var $this = $(this).find("[type=checkbox]");
        if ($this.is(":checked")) {
            $this.prop("checked", false);
        }
        else {
            $this.prop("checked", true);
        }

        if ($this.hasClass("all")) {
            $this.trigger('click');
        }
    });
});
