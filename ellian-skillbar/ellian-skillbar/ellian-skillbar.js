/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/// <reference path="../vendor/jquery.d.ts" />
/// <reference path="../cu/cu.ts" />
var EllianSkillbar;
(function (EllianSkillbar) {
    /* Constants */
    var BUTTON_WIDTH = 50;
    var BUTTON_LEFT_OFFSET = 5;
    /* jQuery Elements */
    var $skillButtons = cu.FindElement('#skillButtons');
    /* Variables */
    var abilities = [];
    var tooltip = null;
    var dragSrcEl = null;
    /* Functions */
    function sortByAbilityID(a, b) {
        var aID = !_.isNumber(a.id) ? parseInt(a.id, 16) : a.id;
        var bID = !_.isNumber(b.id) ? parseInt(b.id, 16) : b.id;
        return aID - bID;
    }
    function updateSkillbarWidth(totalAbilities) {
        $skillButtons.css('width', totalAbilities * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
    }
    function updateTooltip() {
        if (tooltip)
            tooltip.destroy();
        tooltip = new Tooltip($skillButtons.children(), { leftOffset: 0, topOffset: -30 });
    }
    function drop(e) {
        console.log("drop");
        // this/e.target is current target element.
        if (e.stopPropagation) {
            e.stopPropagation(); // Stops some browsers from redirecting.
        }
        // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != e.target) {
            var data = e.dataTransfer.getData("text");
            if (data == "copy") {
                e.target.style.background = dragSrcEl.style.background;
            }
            if (data == "replace") {
                e.target.style.background = dragSrcEl.style.background;
                e.target.style = dragSrcEl.style;
                tmpstyle = e.target.style;
                tmpimage = e.target.style.background;
                //switch style
                e.target.style = dragSrcEl.style;
                dragSrcEl.style = tmpstyle;
                //switch image
                e.target.style.background = dragSrcEl.style.background;
                dragSrcEl.style.background = tmpimage;
            }
        }
        dragSrcEl.style.opacity = '1';
        return false;
    }
    function drag(e) {
        console.log("drag");
        //ev.dataTransfer.setData("text", ev.target.id);
        //  e.target.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData("text", "copy");
    }
    function allowDrop(e) {
        e.preventDefault();
    }
    function updateSkillbar() {
        $skillButtons.empty();
        updateSkillbarWidth(abilities.length);
        if (localStorage.getItem("ellian-skillbar") == null) {
            abilities.sort(sortByAbilityID);
        }
        else {
        }
        abilities.forEach(function (ability, i) {
            var button = ability.MakeButton(i);
            var elem = button.rootElement.css({ left: (i * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) + 'px', top: '0' });
            elem.attr('draggable', 'true');
            elem.on("drop", drop);
            elem.on("dragstart", drag);
            elem.on("dragover", allowDrop);
            if (ability.name)
                elem.attr('data-tooltip-title', ability.name);
            if (ability.tooltip)
                elem.attr('data-tooltip-content', ability.tooltip);
            $skillButtons.append(elem);
        });
        updateTooltip();
    }
    function onAbilityCreated(id, a) {
        var craftedAbility = JSON.parse(a);
        craftedAbility.id = craftedAbility.id.toString(16);
        craftedAbility.tooltip = craftedAbility.tooltip || craftedAbility.notes;
        registerAbility(craftedAbility);
        var ability = cu.UpdateAbility(craftedAbility);
        abilities.push(ability);
        updateSkillbar();
    }
    function removeAbilityById(id) {
        for (var i = abilities.length - 1; i >= 0; i--) {
            var ability = abilities[i];
            if (ability.id.toString(16) === id) {
                abilities.splice(i, 1);
            }
        }
    }
    function onAbilityDeleted(id) {
        removeAbilityById(id);
        updateSkillbar();
    }
    function registerAbility(craftedAbility) {
        var abilityID = craftedAbility.id;
        var primaryComponent = getPrimaryComponent(craftedAbility);
        var primaryComponentBaseID = primaryComponent && primaryComponent.baseComponentID ? primaryComponent.baseComponentID.toString(16) : '';
        var secondaryComponent = getSecondaryComponent(craftedAbility);
        var secondaryComponentBaseID = secondaryComponent && secondaryComponent.baseComponentID ? secondaryComponent.baseComponentID.toString(16) : '';
        cuAPI.RegisterAbility(abilityID, primaryComponentBaseID, secondaryComponentBaseID);
    }
    function getPrimaryComponent(craftedAbility) {
        if (craftedAbility) {
            return craftedAbility.rootComponentSlot;
        }
    }
    function getSecondaryComponent(craftedAbility) {
        if (craftedAbility && craftedAbility.rootComponentSlot && craftedAbility.rootComponentSlot.children) {
            return craftedAbility.rootComponentSlot.children[0];
        }
    }
    function onCharacterIDChanged(characterID) {
        var req = cu.RequestAllAbilities(cuAPI.loginToken, characterID, function (abils) {
            abilities = abils;
            updateSkillbar();
        });
        if (!req)
            return;
        req.then(function (abils) {
            if (!abils || !abils.length)
                return;
            abils.sort(sortByAbilityID);
            abils.forEach(function (abil) {
                abil.id = abil.id.toString(16);
                abil.tooltip = abil.tooltip || abil.notes;
                registerAbility(abil);
            });
            cu.UpdateAllAbilities(abils);
        });
    }
    /* Initialization */
    if (cu.HasAPI()) {
        cu.OnInitialized(function () {
            cuAPI.OnCharacterIDChanged(onCharacterIDChanged);
            cuAPI.OnAbilityCreated(onAbilityCreated);
            cuAPI.OnAbilityDeleted(onAbilityDeleted);
        });
    }
})(EllianSkillbar || (EllianSkillbar = {}));
