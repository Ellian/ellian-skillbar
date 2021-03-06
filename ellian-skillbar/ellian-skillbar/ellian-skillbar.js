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
    var mapAbilities = {};
    var defaultOrderAbilities = {};
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
    function drop(slot) {
        console.log("drop " + slot.id);
        // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != slot) {
            var curPos = mapAbilities[dragSrcEl.id];
            console.log("curPos " + dragSrcEl.id + " " + curPos);
            var targetPos = mapAbilities[slot.id];
            console.log("targetPos " + slot.id + " " + targetPos);
            mapAbilities[dragSrcEl.id] = targetPos;
            mapAbilities[slot.id] = curPos;
            updateSkillbar();
        }
        else {
            dragSrcEl = null;
        }
        return false;
    }
    function drag(slot) {
        console.log("drag " + slot.id);
        slot.style.opacity = '0.4';
        dragSrcEl = slot;
    }
    function allowDrop(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        return false;
    }
    function mouseDown(e) {
        console.log("mousedown " + this.id);
        drag(this);
        e.stopPropagation();
    }
    function mouseUp(e) {
        console.log("mouseUp " + this.id);
        dragSrcEl.style.opacity = '1';
        drop(this);
        e.stopPropagation();
    }
    function orderAbilities(abils) {
        var orderedAbilities = [];
        for (var i = 0; i < abils.length; i++) {
            if (mapAbilities[abils[i].id] != null) {
                orderedAbilities[mapAbilities[abils[i].id]] = abils[i];
            }
        }
        if (orderedAbilities.length != abils.length) {
            console.log("Something went wrong. We reset the sorting of the abilities.");
            orderedAbilities = abilities.sort(sortByAbilityID);
        }
        return orderedAbilities;
    }
    function updateSkillbar() {
        console.log("updateSkillbar");
        $skillButtons.empty();
        updateSkillbarWidth(abilities.length);
        if (localStorage.getItem("ellian-skillbar") == null) {
            abilities.sort(sortByAbilityID);
            localStorage.setItem("ellian-skillbar", "initialized");
        }
        else {
            console.log("not first time " + Object.keys(mapAbilities).length);
            if (Object.keys(mapAbilities).length == 0) {
                // Load current settings
                console.log("load");
                for (var i = 0; i < 50; i++) {
                    if (localStorage.getItem("ellian-skillbar-" + i) != null) {
                        mapAbilities[localStorage.getItem("ellian-skillbar-"
                            + i)] = i;
                    }
                }
                abilities = orderAbilities(abilities);
            }
            else {
                console.log("order");
                // Order abilities
                abilities = orderAbilities(abilities);
                for (var i = 0; i < 50; i++) {
                    // Reset stored information
                    localStorage.removeItem("ellian-skillbar-" + i);
                }
            }
        }
        abilities.forEach(function (ability, i) {
            localStorage.setItem("ellian-skillbar-" + i, ability.id);
            mapAbilities[ability.id] = i;
            // Create slot
            var slot = document.createElement('div');
            $(slot).attr('id', ability.id).appendTo($skillButtons).attr('draggable', 'true');
            // slot.addEventListener("dragend", dragEnd, true);
            slot.addEventListener("dragover", allowDrop, false);
            slot.addEventListener("mousedown", mouseDown, true);
            //  slot.addEventListener("mousemove", mouseMove, true);
            slot.addEventListener("mouseup", mouseUp, true);
            //    slot.addEventListener("mouseover", mouseOver, true);
            // Create button
            var button = ability.MakeButton(defaultOrderAbilities[ability.id]);
            var elem = button.rootElement.css({
                left: (i * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) + 'px',
                top: '0'
            });
            if (ability.name)
                elem.attr('data-tooltip-title', ability.name);
            if (ability.tooltip)
                elem.attr('data-tooltip-content', ability.tooltip);
            elem.click(function () {
                console.log("button click");
                ability.Perform();
            });
            elem.css('opacity', '1');
            elem.prepend("<span class='abilnum'>" + (defaultOrderAbilities[ability.id] + 1) + ":</span>");
            $(slot).append(elem);
            // $skillButtons.append(elem);
        });
        // tmp debug
        //        for (var i = 0; i < 50; i++) {
        //            // Reset stored information
        //            if (localStorage.getItem("ellian-skillbar-" + i) != null) {
        //                console.log("pos " + i + ": " + localStorage.getItem("ellian-skillbar-" + i));
        //            }
        //
        //        }
        updateTooltip();
    }
    function onAbilityCreated(id, a) {
        console.log("onAbilityCreated " + id);
        var craftedAbility = JSON.parse(a);
        craftedAbility.id = craftedAbility.id.toString(16);
        craftedAbility.tooltip = craftedAbility.tooltip || craftedAbility.notes;
        registerAbility(craftedAbility);
        var ability = cu.UpdateAbility(craftedAbility);
        abilities.push(ability);
        defaultOrderAbilities[id] = abilities.length - 1;
        updateSkillbar();
    }
    function removeAbilityById(id) {
        for (var i = abilities.length - 1; i >= 0; i--) {
            var ability = abilities[i];
            if (ability.id.toString(16) === id) {
                abilities.splice(i, 1);
            }
        }
        var curPos = defaultOrderAbilities[id];
        for (var key in defaultOrderAbilities) {
            console.log(key);
            if (defaultOrderAbilities[key] >= curPos) {
                defaultOrderAbilities[key] = defaultOrderAbilities[key] - 1;
            }
        }
        mapAbilities[id] = null;
        defaultOrderAbilities[id] = null;
    }
    function onAbilityDeleted(id) {
        console.log("onAbilityDeleted " + id);
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
            abilities.forEach(function (abil, i) {
                defaultOrderAbilities[abil.id] = i;
                console.log("def : " + abil.id + " " + i);
            });
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
            cuAPI.CloseUI("skillbar");
            cuAPI.OnCharacterIDChanged(onCharacterIDChanged);
            cuAPI.OnAbilityCreated(onAbilityCreated);
            cuAPI.OnAbilityDeleted(onAbilityDeleted);
        });
    }
})(EllianSkillbar || (EllianSkillbar = {}));
//# sourceMappingURL=ellian-skillbar.js.map