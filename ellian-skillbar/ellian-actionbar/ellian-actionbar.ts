/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// <reference path="../vendor/jquery.d.ts" />
/// <reference path="../cu/cu.ts" />

module EllianActionbar {
    /* Constants */

    var BUTTON_WIDTH:number = 50;
    var BUTTON_LEFT_OFFSET:number = 5;
    var BAR_CONFIG:string = "ellian-actionbar-config";
    var BAR_CONTENT:string = "ellian-actionbar-content";
    var TYPE_DEFAULT:string = "default";
    var TYPE_ABILITY:string = "ability";

    /* jQuery Elements */

    var $actionbar = cu.FindElement('#actionbar');
    var $actionsbars = cu.FindElement('#actionsbars');
    var $actionbar1 = cu.FindElement('#actionbar1');
    var $actionbar2 = cu.FindElement('#actionbar2');
    var $after = cu.FindElement('#after');
    var $arrows = cu.FindElement('#arrows');
    var $leftarrow = cu.FindElement('#leftarrow');
    var $uparrow = cu.FindElement('#uparrow');
    var $rightarrow = cu.FindElement('#rightarrow');
    var $downarrow = cu.FindElement('#downarrow');
    var $delete = cu.FindElement('#delete');

    /* Variables */
    var abilities = [];
    var mapAbilities = {};
    var defaultOrderAbilities = {};
    var tooltip = null;
    var dragSrcEl = null;

    var barConfig:ActionBarConfig;
    var barContent:ActionBarContent;

    /* Class */
    class SlotData {
        id:string
        type:string

        constructor(id:string, type:string) {
            this.id = id;
            this.type = type;
        }

    }

    class ActionBarContent {
        bar1:SlotData[]
        bar2:SlotData[]

        constructor(bar1:SlotData[], bar2:SlotData[]) {
            this.bar1 = bar1;
            this.bar2 = bar2;
        }
    }

    class ActionBarConfig {
        size:number
        isBar2Displayed:boolean

        constructor(size:number, isDisplayed:boolean) {
            this.size = size;
            this.isBar2Displayed = isDisplayed;
        }
    }

    class DragData {
        id:string;
        type:string;
        time:number;

        constructor(id:string, type:string) {
            this.id = id;
            this.type = type;
            this.time = new Date().getTime();
        }
    }

    /* Functions */
    function sortByAbilityID(a, b) {
        var aID = !_.isNumber(a.id) ? parseInt(a.id, 16) : a.id;
        var bID = !_.isNumber(b.id) ? parseInt(b.id, 16) : b.id;
        return aID - bID;
    }

    function updateActionbarWidth(nbSlots:number) {
        $actionbar1.css('width', nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
        $actionbar2.css('width', nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
        $after.css('left', nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
        $delete.css('left', nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
        $actionsbars.css('width', nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET);
        //$arrows.css('left', -(nbSlots * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) / 2);
    }

    function updateActionbarHeight(isBar2Displayed:boolean) {
        if (isBar2Displayed) {
            $actionbar.css('height', '90px');
            $actionsbars.css('height', '90px');
            $actionbar2.css('height', '45px');
        } else {
            $actionbar.css('height', '45px');
            $actionsbars.css('height', '45px');
            $actionbar2.css('height', '0px');
        }
    }

    function updateTooltip() {
        if (tooltip) tooltip.destroy();

        tooltip = new Tooltip($actionbar1.children(), {leftOffset: 0, topOffset: -30});
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
        } else {
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
        return;

        console.log("updateSkillbar");
        $actionbar1.empty();
        updateSkillbarWidth(abilities.length);

        if (localStorage.getItem("ellian-skillbar") == null) {
            abilities.sort(sortByAbilityID);
            localStorage.setItem("ellian-skillbar", "initialized");
        } else {
            console.log("not first time " + Object.keys(mapAbilities).length);
            if (Object.keys(mapAbilities).length == 0) {
                // Load current settings
                console.log("load");
                for (var i = 0; i < 50; i++) {
                    if (localStorage.getItem("ellian-skillbar-" + i) != null) {
                        mapAbilities[localStorage.getItem("ellian-skillbar-"
                            + i)] = i;
                        //                        console.log("cur pos "
                        //                            + localStorage.getItem("ellian-skillbar-" + i)
                        //                            + " " + i);
                    }
                }
                abilities = orderAbilities(abilities);
            } else {
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
            $(slot).attr('id', ability.id).appendTo($actionbar1).attr(
                'draggable', 'true');

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

            // $actionbar1.append(elem);
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
        var req = cu.RequestAllAbilities(cuAPI.loginToken, characterID, abils => {
            abilities = abils;

            abilities.forEach(function (abil, i) {
                defaultOrderAbilities[abil.id] = i;
                console.log("def : " + abil.id + " " + i);
            });

            updateSkillbar();

        });

        if (!req) return;

        req.then(abils => {
            if (!abils || !abils.length) return;

            abils.sort(sortByAbilityID);

            abils.forEach(abil => {
                abil.id = abil.id.toString(16);
                abil.tooltip = abil.tooltip || abil.notes;

                registerAbility(abil);
            });

            cu.UpdateAllAbilities(abils);
        });
    }

    function refreshActionBar() {
        console.log("refreshActionBar");
        $actionbar1.empty();
        $actionbar2.empty();
        updateActionbarWidth(barConfig.size);
        updateActionbarHeight(barConfig.isBar2Displayed);

        for (var i:number = 0; i < barConfig.size; i++) {
            // Action bar 1
            var slotData = barContent.bar1[i];
            createSlot(slotData, false, i, barConfig.isBar2Displayed);

            if (barConfig.isBar2Displayed) {
                // Action bar 2
                var slotData = barContent.bar2[i];
                createSlot(slotData, true, i, barConfig.isBar2Displayed);
            }
        }

        // arrow settings
        if (barConfig.size < 5) {
            $leftarrow.css('visibility', 'hidden');
        } else {
            $leftarrow.css('visibility', 'visible');
            $leftarrow.on('click', decreaseWidth);
        }
        if (barConfig.size > 20) {
            $rightarrow.css('visibility', 'hidden');
        } else {
            $rightarrow.css('visibility', 'visible');
            $rightarrow.on('click', increaseWidth);
        }
        if (barConfig.isBar2Displayed) {
            $uparrow.css('visibility', 'hidden');
            $downarrow.on('click', hideBar2);
            $downarrow.css('visibility', 'visible');
        } else {
            $uparrow.on('click', displayBar2);
            $uparrow.css('visibility', 'visible');
            $downarrow.css('visibility', 'hidden');
        }

        // delete button
        $delete.on('dragover', allowDrop);
        $delete.on('mousedown', removeSlot);

        updateTooltip();
    }

    function decreaseWidth() {
        barConfig.size = barConfig.size - 1;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        refreshActionBar();
    }

    function increaseWidth() {
        barConfig.size = barConfig.size + 1;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        refreshActionBar();
    }

    function removeSlot() {
        console.log("removeSlot");
    }

    function displayBar2() {
        barConfig.isBar2Displayed = true;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        refreshActionBar();
    }

    function hideBar2() {
        barConfig.isBar2Displayed = false;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        refreshActionBar();
    }

    function createSlot(slotData:SlotData, isBar2:boolean, num:number, isBar2Displayed:boolean) {
        var slot = document.createElement('div');
        slot.addEventListener("dragover", allowDrop, false);
        slot.addEventListener("mousedown", mouseDown, true);
        slot.addEventListener("mouseup", mouseUp, true);
        $(slot).attr('draggable', 'true');
        if (isBar2) {
            $(slot).appendTo($actionbar2)
            $(slot).attr('id', 'bar2-slot' + num);
            $(slot).css('top', '0px');
        }
        else {
            $(slot).appendTo($actionbar1)
            $(slot).attr('id', 'bar1-slot' + num);
            if (isBar2Displayed) {
                $(slot).css('top', '45px');
            } else {
                $(slot).css('top', '0px');
            }
        }
        if (slotData.type == TYPE_DEFAULT) {
            $(slot).attr('type', TYPE_DEFAULT);
            $(slot).attr('class', 'default');
            $(slot).css('left', (num * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) + 'px');
        }
        if (slotData.type == TYPE_ABILITY) {
            //$(slot).attr('id', ability.id);
            $(slot).attr('type', TYPE_ABILITY);
        }
    }

    function init() {
        if (localStorage.getItem(BAR_CONFIG) != null) {
            barConfig = JSON.parse(localStorage.getItem(BAR_CONFIG));
        } else {
            barConfig = new ActionBarConfig(5, false);
            localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        }
        if (localStorage.getItem(BAR_CONTENT) != null) {
            barContent = JSON.parse(localStorage.getItem(BAR_CONTENT));
        } else {
            var bar1:SlotData = [];
            bar1.push(new SlotData());
            for (var i:number = 0; i < 5; i++) {
                var slot:SlotData = new SlotData("", "default");
                bar1[i] = slot;
            }
            barContent = new ActionBarContent(bar1, bar1);
            localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
        }
    }

    /* Initialization */
    if (cu.HasAPI()) {
        cu.OnInitialized(() => {

            init();

            cuAPI.CloseUI("skillbar");

            cuAPI.OnCharacterIDChanged(onCharacterIDChanged);

            cuAPI.OnAbilityCreated(onAbilityCreated);

            cuAPI.OnAbilityDeleted(onAbilityDeleted);

            refreshActionBar();
        });
    }
}
