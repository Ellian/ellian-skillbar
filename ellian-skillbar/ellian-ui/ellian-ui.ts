/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// <reference path="../vendor/jquery.d.ts" />
/// <reference path="../cu/cu.ts" />

module EllianUI {

    /* jQuery Elements */

    var $uis = cu.FindElement('#uis');

    function init() {
        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Open Spellbook");
        $(but).attr("onclick", "openUI('ellian-spellbook')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Close Spellbook");
        $(but).attr("onclick", "closeUI('ellian-spellbook')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Toggle Spellbook");
        $(but).attr("onclick", "ToggleUIVisibility('ellian-spellbook')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Open Action Bar");
        $(but).attr("onclick", "OpenUI('ellian-actionbar')");

        var but = document.createElement('button');
        $(but).attr('type', 'button').attr('class', 'button').appendTo($uis);
        $(but).text("Close Action Bar");
        $(but).attr("onclick", "CloseUI('ellian-actionbar')");
    }

    /* Initialization */
    if (cu.HasAPI()) {
        cu.OnInitialized(() => {
            init();
        });
    }
}

function openUI(name:string) {
    cuAPI.OpenUI(name);
}

function closeUI(name:string) {
    cuAPI.CloseUI(name);
}

function ToggleUIVisibility(name: string){
    cuAPI.ToggleUIVisibility(name);
}