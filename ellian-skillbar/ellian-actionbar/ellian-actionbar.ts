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
    var DRAG_DATA:string = "ellian-dragdata";
    var TYPE_DEFAULT:string = "default";
    var TYPE_ABILITY:string = "ability";
    var ATTR_NUM = "num";
    var ATTR_TYPE = "type";
    var BANDAGE_ABILITY_ID = (31).toString(16);


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
    var $drawer = cu.FindElement('#drawer');

    /* Variables */
    var bandage:Ability;
    var abilities = [];
    var mapAbilities = {};
    var defaultOrderAbilities = {};
    var tooltipBar1:Tooltip = null;
    var tooltipBar2:Tooltip = null;
    var tooltipDrawer:Tooltip = null;
    var tooltipOpenDrawer = null;
    var dragSrcEl = null;

    var barConfig:ActionBarConfig;
    var barContent:ActionBarContent;

    var isBarRefreshed:boolean = false;
    var isDrawerDisplayed:boolean = false

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
        if (tooltipBar1) tooltipBar1.destroy();
        if (tooltipBar2) tooltipBar2.destroy();

        tooltipBar1 = new Tooltip($actionbar1.children(), {leftOffset: 0, topOffset: -30});
        tooltipBar2 = new Tooltip($actionbar2.children(), {leftOffset: 0, topOffset: -30});
    }

    function allowDrop(e:MouseEvent) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        return false;
    }

    function mouseDown(e:MouseEvent) {
        console.log("mousedown " + this.id + " " + this.style.opacity);
        this.style.opacity = "0.4";
        dragSrcEl = this;
        var dragEvent:DragData = new DragData(this.getAttribute(ATTR_NUM), this.getAttribute(ATTR_TYPE));
        localStorage.setItem(DRAG_DATA, JSON.stringify(dragEvent));
        isBarRefreshed = false;
        if (typeof(w) == "undefined") {
            var w:Worker = new Worker("opacityWorker.js");
            w.onmessage = function (event) {
                if (isBarRefreshed == false) {
                    refreshActionBar();
                    triggerDrawer();
                }
                w.terminate();
            };
        }
        e.stopPropagation();
    }

    function mouseUp(e) {
        console.log("mouseUp " + this.id);
        // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != null) {
            dragSrcEl.style.opacity = '1';
            if (dragSrcEl != this) {
                // Drag from the action bar
                var fromDrawer:boolean = true;
                if (this.id.substring(0, 4) == "bar2" && dragSrcEl.id.substring(0, 4) == "bar2") {
                    fromDrawer = false;
                    var tmp:SlotData = barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))];
                    barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))] = barContent.bar2[parseInt(dragSrcEl.id.replace("bar2-slot", ""))];
                    barContent.bar2[parseInt(dragSrcEl.id.replace("bar2-slot", ""))] = tmp;
                }
                if (this.id.substring(0, 4) == "bar2" && dragSrcEl.id.substring(0, 4) == "bar1") {
                    fromDrawer = false;
                    var tmp:SlotData = barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))];
                    barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))] = barContent.bar1[parseInt(dragSrcEl.id.replace("bar1-slot", ""))];
                    barContent.bar1[parseInt(dragSrcEl.id.replace("bar1-slot", ""))] = tmp;
                }
                if (this.id.substring(0, 4) == "bar1" && dragSrcEl.id.substring(0, 4) == "bar1") {
                    fromDrawer = false;
                    var tmp:SlotData = barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))];
                    barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))] = barContent.bar1[parseInt(dragSrcEl.id.replace("bar1-slot", ""))];
                    barContent.bar1[parseInt(dragSrcEl.id.replace("bar1-slot", ""))] = tmp;
                }
                if (this.id.substring(0, 4) == "bar1" && dragSrcEl.id.substring(0, 4) == "bar2") {
                    fromDrawer = false;
                    var tmp:SlotData = barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))];
                    barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))] = barContent.bar2[parseInt(dragSrcEl.id.replace("bar2-slot", ""))];
                    barContent.bar2[parseInt(dragSrcEl.id.replace("bar2-slot", ""))] = tmp;
                }
                if (fromDrawer) {
                    var newSlot:SlotData = new SlotData(dragSrcEl.getAttribute(ATTR_NUM), dragSrcEl.getAttribute(ATTR_TYPE));
                    if (this.id.substring(0, 4) == "bar1") {
                        barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))] = newSlot;
                    } else {
                        barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))] = newSlot;
                    }
                }
                localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
                refreshActionBar();
            }
            /*    } else {
             // TODO drag from spell book
             if (localStorage.getItem(DRAG_DATA) != null) {
             var dragData:DragData = JSON.parse(localStorage.getItem(DRAG_DATA));
             if (new Date().getTime() - dragData.time < 5000) {
             // the drag event is recent
             console.log("spell " + dragData.id);
             var newSlot:SlotData = new SlotData(dragData.id, dragData.type);
             if (this.id.substring(0, 4) == "bar1") {
             barContent.bar1[parseInt(this.id.replace("bar1-slot", ""))] = newSlot;
             } else {
             barContent.bar2[parseInt(this.id.replace("bar2-slot", ""))] = newSlot;
             }
             localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
             refreshActionBar();
             }
             localStorage.removeItem(DRAG_DATA);
             }*/
        }
        dragSrcEl = null;
        e.stopPropagation();
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
        mapAbilities[id] = ability;
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
        refreshActionBar();
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
                mapAbilities[abil.id] = abil;
                console.log("def : " + abil.id + " " + i);
            });
            refreshActionBar();
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
        console.log("refreshActionBar " + barConfig.size);
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
            $leftarrow.off('click');
        } else {
            $leftarrow.css('visibility', 'visible');
            $leftarrow.off('click');
            $leftarrow.on('click', decreaseWidth);
        }
        if (barConfig.size > 20) {
            $rightarrow.css('visibility', 'hidden');
            $rightarrow.off('click');
        } else {
            $rightarrow.css('visibility', 'visible');
            $rightarrow.off('click');
            $rightarrow.on('click', increaseWidth);
        }
        if (barConfig.isBar2Displayed) {
            $uparrow.css('visibility', 'hidden');
            $downarrow.off('click');
            $uparrow.off('click');
            $downarrow.on('click', hideBar2);
            $downarrow.css('visibility', 'visible');
        } else {
            $downarrow.off('click');
            $uparrow.off('click');
            $uparrow.on('click', displayBar2);
            $uparrow.css('visibility', 'visible');
            $downarrow.css('visibility', 'hidden');
        }

        // delete button
        $delete.off('dragover');
        $delete.off('mouseup');
        $delete.off('drop');
        $delete.on('dragover', allowDrop);
        $delete.on('mouseup', removeSlot);
        $delete.on('drop', removeSlot);

        updateTooltip();
        isBarRefreshed = true;
    }

    function decreaseWidth() {
        barConfig.size = barConfig.size - 1;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        refreshActionBar();
    }

    function increaseWidth(e:MouseEvent) {
        console.log("increaseWidth " + barConfig.size);
        barConfig.size = barConfig.size + 1;
        localStorage.setItem(BAR_CONFIG, JSON.stringify(barConfig));
        var isSlotAdded:boolean = false;
        for (var i = 0; i < (barConfig.size - barContent.bar1.length); i++) {
            barContent.bar1.push(new SlotData('', TYPE_DEFAULT));
            barContent.bar2.push(new SlotData('', TYPE_DEFAULT));
            isSlotAdded = true;
        }
        if (isSlotAdded) {
            localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
        }
        refreshActionBar();
    }

    function removeSlot() {
        if (dragSrcEl != null) {
            dragSrcEl.style.opacity = '1';
            // Drag from the action bar
            if (dragSrcEl.id.substring(0, 4) == "bar2") {
                barContent.bar2[parseInt(dragSrcEl.id.replace("bar2-slot", ""))] = new SlotData(TYPE_DEFAULT, TYPE_DEFAULT);
            }
            if (dragSrcEl.id.substring(0, 4) == "bar1") {
                barContent.bar1[parseInt(dragSrcEl.id.replace("bar1-slot", ""))] = new SlotData(TYPE_DEFAULT, TYPE_DEFAULT);
            }
            localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
            refreshActionBar();
            dragSrcEl = null;
        }
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
        slot.addEventListener("drop", mouseUp, true);
        $(slot).attr('draggable', 'true');
        $(slot).attr('style', 'opacity: 1;')
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
        $(slot).css('left', (num * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) + 'px');
        if (slotData.type == TYPE_DEFAULT) {
            $(slot).attr(ATTR_TYPE, TYPE_DEFAULT);
            $(slot).attr(ATTR_NUM, TYPE_DEFAULT);
            $(slot).attr('class', 'slotdefault');
        }
        if (slotData.type == TYPE_ABILITY) {
            // Create button
            if (mapAbilities[slotData.id] != null) {
                $(slot).attr(ATTR_TYPE, TYPE_ABILITY);
                $(slot).attr(ATTR_NUM, slotData.id);
                $(slot).attr('class', 'slot');
                var ability = mapAbilities[slotData.id];
                var button = ability.MakeButton(defaultOrderAbilities[ability.id]);
                var elem = button.rootElement;
                if (ability.name)
                    elem.attr('data-tooltip-title', ability.name);
                if (ability.tooltip)
                    elem.attr('data-tooltip-content', ability.tooltip);
                elem.click(function () {
                    console.log("button click");
                    ability.Perform();
                });
                elem.prepend("<span class='abilnum'>" + (defaultOrderAbilities[ability.id] + 1) + ":</span>");
                $(slot).append(elem);
            } else {
                // The ability does not exist anymore
                console.log("The ability does not exist anymore");
                $(slot).attr(ATTR_TYPE, TYPE_DEFAULT);
                $(slot).attr(ATTR_NUM, TYPE_DEFAULT);
                $(slot).attr('class', 'slotdefault');
                if (isBar2) {
                    var tmpSlot:SlotData = new SlotData(TYPE_DEFAULT, TYPE_DEFAULT);
                    barContent.bar2[num] = tmpSlot;
                } else {
                    var tmpSlot:SlotData = new SlotData(TYPE_DEFAULT, TYPE_DEFAULT);
                    barContent.bar1[num] = tmpSlot;
                }
                localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
            }
        }
    }

    function triggerDrawer() {
        if (tooltipOpenDrawer) tooltipOpenDrawer.destroy();
        if (isDrawerDisplayed) {
            isDrawerDisplayed = false;
            displayClosedDrawer();
        } else {
            isDrawerDisplayed = true;
            displayOpenedDrawer();
        }
    }

    function displayOpenedDrawer() {
        if (tooltipOpenDrawer) tooltipOpenDrawer.destroy();
        $drawer.empty();
        var w:number = 4;
        $drawer.css('width', parseInt($actionsbars.css('width').replace('px', '')));
        $drawer.css('height', (Math.round(abilities.length / w)) * 30 + 2);
        $drawer.css('left', -w * 30);
        $drawer.css('top', -(Math.round(abilities.length / w)) * 30 + 2);

        var slots = document.createElement('div');
        $(slots).css('width', w * 30);
        $(slots).css('height', (Math.round(abilities.length / w)) * 30 + 2);
        $(slots).css('background-image', "url('../images/spellbook/left-page.png')");
        $(slots).css('padding-right', '2px');
        $drawer.append(slots);
        abilities.forEach(function (ability, i) {
            var abil = document.createElement('div');
            $(abil).css('content', "url('" + ability.icon + "')");
            $(abil).attr('class', 'drawerSlot');
            if (ability.name)
                $(abil).attr('data-tooltip-title', ability.name);
            if (ability.tooltip)
                $(abil).attr('data-tooltip-content', ability.tooltip);
            $(abil).on('mousedown', mouseDown);
            $(abil).attr(ATTR_NUM, ability.id);
            $(abil).attr(ATTR_TYPE, TYPE_ABILITY);
            $(slots).append(abil);
        });
        if (tooltipDrawer) tooltipDrawer.destroy();
        tooltipDrawer = new Tooltip($drawer.children(), {leftOffset: 0, topOffset: -30});

        var close = document.createElement('img');
        $(close).attr('id', 'close');
        $(close).css('left', w * 30 + 2);
        $(close).attr('src', '../images/spellbook/btn-close.png');
        $(close).attr('height', '12px').attr('width', '12px');
        $(close).on('click', triggerDrawer);
        tooltipOpenDrawer = new Tooltip($(close), {
            title: "Close",
            content: "Close the drawer.",
            leftOffset: 0,
            topOffset: -30
        });
        $drawer.append(close);
        $(close).off('click');
        $(close).on('click', triggerDrawer);

        /*      updateActionbarHeight(barConfig.isBar2Displayed);
         console.log(parseInt($actionbar.css('height').replace('px', '')));
         $actionbar.css('height', (Math.round(abilities.length / w)) * 30 + parseInt($actionbar.css('height').replace('px', '')));
         $actionsbars.css('height', (Math.round(abilities.length / w)) * 30 + parseInt($actionsbars.css('height').replace('px', '')));
         */
    }

    function displayClosedDrawer() {
        if (tooltipOpenDrawer) tooltipOpenDrawer.destroy();
        $drawer.empty();
        var open = document.createElement('img');
        $(open).attr('src', '../images/spellbook/btn-add-bookmark.jpg');
        $(open).attr('height', '18px').attr('width', '18px');
        tooltipOpenDrawer = new Tooltip($(open), {
            title: "Open",
            content: "Open the drawer containing the available abilities and commands.",
            leftOffset: 0,
            topOffset: -30
        });
        $drawer.css('left', '-20px');
        $drawer.css('top', '26px');
        //$drawer.css('background-image', "url('../images/spellbook/left-page.png')");
        $drawer.css('width', '18px');
        $drawer.css('height', '0px');
        $drawer.css('padding-right', '0px');
        $drawer.append(open);
        $(open).off('click');
        $(open).on('click', triggerDrawer);

        updateActionbarHeight(barConfig.isBar2Displayed);
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
            var bar1:SlotData[] = [];
            bar1.push(new SlotData("", TYPE_DEFAULT));
            for (var i:number = 0; i < 5; i++) {
                var slot:SlotData = new SlotData(TYPE_DEFAULT, TYPE_DEFAULT);
                // FIXME debug
                if (i == 0) {
                    slot = new SlotData("b", TYPE_ABILITY);
                }
                if (i == 1) {
                    slot = new SlotData("3e", TYPE_ABILITY);
                }
                if (i == 2) {
                    slot = new SlotData("86", TYPE_ABILITY);
                }
                bar1[i] = slot;
            }
            barContent = new ActionBarContent(bar1, bar1);
            localStorage.setItem(BAR_CONTENT, JSON.stringify(barContent));
        }
        var tooltip = new Tooltip($leftarrow, {
            title: "Reduce",
            content: "Reduce the number of slots of the action bars. The minimum size is 5 slots.",
            leftOffset: 0,
            topOffset: -30
        });
        var tooltip = new Tooltip($rightarrow, {
            title: "Increase",
            content: "Increase the number of slots of the action bars. The maximum size is 20 slots.",
            leftOffset: 0,
            topOffset: -30
        });
        var tooltip = new Tooltip($uparrow, {
            title: "Display",
            content: "Display the second action bar.",
            leftOffset: 0,
            topOffset: -30
        });
        var tooltip = new Tooltip($downarrow, {
            title: "Hide",
            content: "Hide the second action bar.",
            leftOffset: 0,
            topOffset: -30
        });
        var tooltip = new Tooltip($delete, {
            title: "Remove",
            content: "Remove an item from the action bar and reset it to the default icon.",
            leftOffset: 0,
            topOffset: -30
        });

        displayClosedDrawer();
    }

    /* Initialization */
    if (cu.HasAPI()) {
        cu.OnInitialized(() => {
                cuAPI.CloseUI("skillbar");
                cuAPI.CloseUI("bandage");
                cuAPI.OnCharacterIDChanged(onCharacterIDChanged);
                cuAPI.OnAbilityCreated(onAbilityCreated);
                cuAPI.OnAbilityDeleted(onAbilityDeleted);
                cu.RequestAbility(BANDAGE_ABILITY_ID, ability => {
                    ability.icon = '../images/skills/bandage.png';
                    abilities.unshift(ability);
                }, true);
                init();
            }
        );

    }
}
