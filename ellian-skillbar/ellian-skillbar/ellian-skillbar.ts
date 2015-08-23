/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// <reference path="../vendor/jquery.d.ts" />

module Skillbar {
    var $skillButtons: JQuery;

    cu.OnServerConnected(() => {
        $skillButtons = cu.FindElement('#skillButtons');

        cu.RequestAllAbilities(function(abilities) {
            abilities.sort((a, b) => a.id.localeCompare(b.id));

            abilities.forEach(function(ability, i) {
                var button = ability.MakeButton();
                var elem = button.rootElement.css({ left: (i * 54) + 'px', top: '0px' });
                $skillButtons.append(elem);
            });
        });
    });

    cu.SetDebugServer();
}