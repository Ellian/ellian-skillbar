/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// <reference path="../vendor/jquery.d.ts" />
/// <reference path="../cu/cu.ts" />

module EllianUI {

    /* jQuery Elements */

    var $uis = cu.FindElement('#uis');

    function init() {
        //   var but = document.createElement('button');
        //   $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        //  $(but).text("Open Spellbook");
        // $(but).attr("onclick", "openUI('ellian-spellbook')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Open skillbar");
        $(but).attr("onclick", "openUI('ellian-skillbar.ui')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Close skillbar");
        $(but).attr("onclick", "closeUI('ellian-skillbar')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Open Action Bar");
        $(but).attr("onclick", "openUI('ellian-actionbar.ui')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Close Action Bar");
        $(but).attr("onclick", "closeUI('ellian-actionbar')");
    }

    /* Initialization */
    if (cu.HasAPI()) {
        cu.OnInitialized(() => {
            init();
        });
    }
}

function openUI(name:string) {
    console.log("OpenUI " + name);
    cuAPI.OpenUI(name);
}

function closeUI(name:string) {
    console.log("closeUI " + name);
    cuAPI.CloseUI(name);
}

function toggleUIVisibility(name:string) {
    console.log("toggleUIVisibility " + name);
    cuAPI.ToggleUIVisibility(name);
}