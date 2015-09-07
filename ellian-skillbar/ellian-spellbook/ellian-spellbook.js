/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/// <reference path="../vendor/jquery.d.ts" />
var Spellbook;
(function (Spellbook) {
    /* Constants */
    var ABILITIES_PER_PAGE = 7;
    var COMPONENTS_PER_PAGE = 7;
    var SEARCH_DELAY = 100;
    var HIDE_DELAY = 100;
    /* jQuery Elements */
    var $document = $(document);
    Spellbook.$spellbook = $('#spellbook');
    var $btnAbilities = $('#btn-abilities');
    var $abilityPagesModal = $('#ability-pages-modal');
    var $btnComponents = $('#btn-components');
    var $componentPagesModal = $('#component-pages-modal');
    var $btnSearch = $('#btn-search');
    Spellbook.$btnHelp = $('#btn-help');
    var $btnClose = $('#btn-close');
    Spellbook.$pages = $('#pages');
    var $searchModal = $('#search-modal');
    var $search = $('#search');
    var $errorModal = $('#error-modal');
    var $errorModalMessage = $('#error-modal-message');
    var $btnCloseErrorModal = $('#btn-close-error-modal');
    /* Variables */
    var loginToken = '';
    var characterID = '';
    var networks = [physical, magic, comboA, comboB, rangeA, rangeB, shout, song];
    var abilities = [];
    var components = [];
    var firstAbilitiesPage = null;
    var lastAbilitiesPage = null;
    var firstComponentsPage = null;
    var lastComponentsPage = null;
    var pages = [];
    var pageNumber = 0;
    var isReorderingAbilities = false;
    var searchTimeout = null;
    var searchText = '';
    var previousSearchText = '';
    var hideAbilityPagesTimeout = null;
    var hideComponentPagesTimeout = null;
    var isShowingAbilityPagesModal = false;
    var isShowingComponentPagesModal = false;
    var lastVisitedPage = 2;
    /* Functions */
    var CraftedAbility = (function () {
        function CraftedAbility(options) {
            if (!options)
                options = {};
            if (!options.name)
                throw new Error('ability name required');
            this.id = options.id;
            this.name = options.name;
            this.icon = options.icon;
            this.notes = options.notes || '';
            this.description = options.description || '';
            this.proficiency = options.proficiency || 0;
            this.maxProficiency = options.maxProficiency || 0;
            this.componentSlots = options.componentSlots || [];
            this.stats = options.stats || {};
            this.isSelected = false;
            this.isVisible = true;
        }
        CraftedAbility.prototype.createElement = function () {
            if (this.$ability)
                return this;
            // ellian
            //var $ability = this.$ability = $('<div>').addClass('ability');
            var $ability = this.$ability = $('<div draggable="true">').addClass('ability');
            $ability.attr("id", this.id.toString(16));
            var $icon = $('<div>').addClass('ability-icon').appendTo($ability);
            if (this.icon) {
                $('<img>').attr('src', this.icon).appendTo($icon);
            }
            $('<div>').addClass('ability-name').text(this.name).appendTo($ability);
            return this.updateElement();
        };
        CraftedAbility.prototype.updateElement = function () {
            if (!this.$ability)
                return this;
            this.$ability[this.isSelected ? 'addClass' : 'removeClass']('selected');
            var hasAnyAbilitySelected = this.isSelected || _.any(abilities, function (a) { return a.isSelected; });
            Spellbook.$spellbook[hasAnyAbilitySelected ? 'addClass' : 'removeClass']('selected');
            if (this.$detailPage) {
                this.$detailPage.remove();
            }
            if (this.leftDetail && this.leftDetail.page && this.leftDetail.page.pageNumber) {
                var pageNumber = this.leftDetail.page.pageNumber - firstAbilitiesPage;
                this.$detailPage = $('<div>').addClass('ability-detail-page').text('Page ' + pageNumber).appendTo(this.$ability);
            }
            return this.bindEvents();
        };
        CraftedAbility.prototype.appendTo = function (target) {
            if (this.$ability)
                this.$ability.appendTo(target);
            return this;
        };
        // ellian
        CraftedAbility.prototype.dragStart = function () {
            console.log("drag start " + this.id);
            var DragData = (function () {
                function DragData(id, type) {
                    this.id = id;
                    this.type = type;
                    this.time = new Date().getTime();
                }
                return DragData;
            })();
            if (localStorage.getItem("ellian-dragdata") != undefined) {
                var existingData = JSON.parse(localStorage.getItem("ellian-dragdata"));
                if (existingData.id != this.id) {
                    var data = new DragData(this.id, "ability");
                    localStorage.setItem("ellian-dragdata", JSON.stringify(data));
                }
            }
            else {
                var data = new DragData(this.id, "ability");
                localStorage.setItem("ellian-dragdata", JSON.stringify(data));
            }
        };
        CraftedAbility.prototype.bindEvents = function () {
            if (this.$ability) {
                this.$ability.off('click').on('click', this.select.bind(this));
                // ellian
                this.$ability.off("drag").on("drag", this.dragStart);
            }
            if (this.componentSlots && this.componentSlots.length) {
                this.componentSlots.forEach(function (slot) { return slot.bindEvents(); });
            }
            return this;
        };
        CraftedAbility.prototype.fadeIn = function () {
            var _this = this;
            if (this.$ability) {
                this.$ability.stop().fadeIn(function () {
                    _this.$ability.show().css('opacity', 1);
                });
            }
            return this;
        };
        CraftedAbility.prototype.select = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (!isReorderingAbilities) {
                if (this.leftDetail && this.leftDetail.page && this.leftDetail.page.pageNumber) {
                    turnToPage(e, this.leftDetail.page.pageNumber + 1);
                }
            }
            else {
                this.isSelected = !this.isSelected;
                this.updateElement();
            }
            return false;
        };
        CraftedAbility.prototype.deselect = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.isSelected = false;
            this.updateElement();
            return false;
        };
        CraftedAbility.prototype.tryDelete = function () {
            if (!this.id || !loginToken || !characterID)
                return Promise.reject();
            var id = _.isNumber(this.id) ? this.id : parseInt(this.id, 16);
            return new Promise(function (resolve, reject) {
                var options = {};
                options.url = cu.SecureApiUrl('api/craftedabilities');
                options.type = 'DELETE';
                options.contentType = 'application/json; charset=utf-8';
                options.data = JSON.stringify({
                    id: id,
                    loginToken: loginToken,
                    characterID: characterID
                });
                options.success = resolve;
                options.error = reject;
                $.ajax(options);
            });
        };
        return CraftedAbility;
    })();
    var AbilityLeftDetail = (function () {
        function AbilityLeftDetail(ability) {
            this.createElement = function () {
                if (this.$detail)
                    return this;
                var $detail = this.$detail = $('<div>').addClass('ability-left-detail');
                var $icon = $('<div>').addClass('ability-icon').appendTo($detail);
                if (this.ability.icon) {
                    $('<img>').attr('src', this.ability.icon).appendTo($icon);
                }
                $('<h1>').addClass('ability-name').text(this.ability.name).appendTo($detail);
                // TODO: re-enable when we have an update Web API method
                //this.$btnEdit = $('<button>').addClass('btn-edit').appendTo($detail);
                this.$btnDelete = $('<button>').addClass('btn-delete').appendTo($detail);
                if (this.network) {
                    var $network = this.$network = $('<div>').addClass('ability-component-network').appendTo($detail);
                    var min = { x: Number.MAX_VALUE, y: Number.MAX_VALUE };
                    var slots = this.network.slots;
                    var slot;
                    for (var i = slots.length - 1; i >= 0; i--) {
                        slot = slots[i];
                        if (!slot.component) {
                            slots.splice(i, 1);
                            continue;
                        }
                        if (slot.x < min.x)
                            min.x = slot.x;
                        if (slot.y < min.y)
                            min.y = slot.y;
                    }
                    slots.forEach(function (s) {
                        s.x -= min.x;
                        s.y -= min.y;
                        s.component.slot.x -= min.x;
                        s.component.slot.y -= min.y;
                        if (s.branch) {
                            s.branch.parts.forEach(function (part) {
                                part.x -= min.x;
                                part.y -= min.y;
                            });
                        }
                    });
                    this.network.createElement().appendTo($network);
                }
                return this.bindEvents();
            };
            this.ability = ability;
            this.setNetwork();
        }
        AbilityLeftDetail.prototype.appendTo = function (target) {
            if (this.$detail)
                this.$detail.appendTo(target);
            return this;
        };
        AbilityLeftDetail.prototype.bindEvents = function () {
            var self = this;
            if (this.$btnEdit) {
                this.$btnEdit.off('click').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (_.isString(self.ability.id) && typeof cuAPI === 'object') {
                        cuAPI.ReleaseInputOwnership();
                        cuAPI.HideUI('spellbook');
                        cuAPI.EditAbility(self.ability.id.toString());
                        cuAPI.ShowUI('ability-builder');
                    }
                    return false;
                });
            }
            if (this.$btnDelete) {
                this.$btnDelete.off('click').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.ability.tryDelete().then(function () {
                        if (typeof cuAPI !== 'undefined') {
                            var id = _.isNumber(self.ability.id) ? self.ability.id.toString(16) : self.ability.id.toString();
                            cuAPI.AbilityDeleted(id);
                        }
                    }, function () {
                        showErrorModal('Failed to delete ability.');
                    });
                    return false;
                });
            }
            if (this.ability)
                this.ability.bindEvents();
            if (this.network)
                this.network.bindEvents();
            return this;
        };
        AbilityLeftDetail.prototype.setNetwork = function () {
            var _this = this;
            var componentSlots = this.ability.componentSlots;
            if (!componentSlots || !componentSlots.length)
                return;
            var network = null;
            for (var i = 0, length = networks.length; i < length; i++) {
                network = networks[i];
                if (network.hasMatchingComponentSlots(componentSlots)) {
                    break;
                }
            }
            if (!network)
                return;
            network = network.clone();
            var networkRootSlots = network.getRootComponentSlots();
            componentSlots.forEach(function (rootSlot) {
                _this.mergeSlots(networkRootSlots, rootSlot);
            });
            this.network = network;
        };
        AbilityLeftDetail.prototype.mergeSlots = function (slots, slot) {
            var _this = this;
            if (!slots || !slots.length || !slot || !slot.component)
                return;
            slots.forEach(function (s) {
                if (slot.isSameType(s.type) && slot.isSameSubType(s.subType)) {
                    s.setComponent(slot.component);
                    if (slot.children && slot.children.length && s.children && s.children.length) {
                        slot.children.forEach(function (child) {
                            _this.mergeSlots(s.children, child);
                        });
                    }
                }
            });
        };
        return AbilityLeftDetail;
    })();
    var AbilityRightDetail = (function () {
        function AbilityRightDetail(ability) {
            this.ability = ability;
        }
        AbilityRightDetail.prototype.createElement = function () {
            if (this.$detail)
                return this;
            var $detail = this.$detail = $('<div>').addClass('ability-right-detail');
            var $attributes = $('<ul>').addClass('ability-attributes').appendTo($detail);
            for (var stat in this.ability.stats) {
                $li = $('<li>').appendTo($attributes);
                var statName = stat.replace(/([A-Z])/g, ' $1').trim();
                var statValue = this.ability.stats[stat];
                if (statValue % 1 !== 0) {
                    statValue = statValue.toFixed(2);
                }
                $('<span>').addClass('ability-attribute-label').text(statName + ': ').appendTo($li);
                $('<span>').addClass('ability-attribute-value').text(statValue).appendTo($li);
            }
            if (_.isNumber(this.ability.proficiency) && _.isNumber(this.ability.maxProficiency)) {
                var $div = $('<div>').addClass('ability-proficiency').appendTo($detail);
                $('<span>').addClass('ability-proficiency-label').text('Proficiency: ').appendTo($div);
                $('<span>').addClass('ability-proficiency-value').text(this.ability.proficiency + '/' + this.ability.maxProficiency).appendTo($div);
            }
            if (this.ability.description) {
                $('<div>').addClass('ability-description-label').text('Description:').appendTo($detail);
                $('<div>').addClass('ability-description-value').text(this.ability.description).appendTo($detail);
            }
            if (this.ability.notes) {
                $('<div>').addClass('ability-notes-label').text('Notes:').appendTo($detail);
                $('<div>').addClass('ability-notes-value').text(this.ability.notes).appendTo($detail);
            }
            var $li;
            var $stats = $('<ul>').addClass('ability-stats').appendTo($detail);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Number of successful casts:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Number of failed casts:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Total damage inflicted:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Average damage inflicted:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Enemies killed:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Structures destroyed:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Critical successes:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Critical failures:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            $li = $('<li>').appendTo($stats);
            $('<span>').addClass('ability-stat-label').text('Disruptions:').appendTo($li);
            $('<span>').addClass('ability-stat-value').text('0').appendTo($li);
            return this;
        };
        AbilityRightDetail.prototype.appendTo = function (target) {
            if (this.$detail)
                this.$detail.appendTo(target);
            return this;
        };
        AbilityRightDetail.prototype.bindEvents = function () {
            return this;
        };
        return AbilityRightDetail;
    })();
    var ComponentContainer = (function () {
        function ComponentContainer(component) {
            this.component = component;
        }
        ComponentContainer.prototype.createElement = function () {
            if (this.$container)
                return this;
            var $container = this.$container = $('<div>').addClass('component-container');
            $('<div>').addClass('component-name').text(this.component.name).appendTo($container);
            return this;
        };
        ComponentContainer.prototype.appendTo = function (target) {
            if (this.$container)
                this.$container.appendTo(target);
            return this;
        };
        ComponentContainer.prototype.bindEvents = function () {
            if (this.component && this.component.slot) {
                this.component.slot.bindEvents();
            }
            return this;
        };
        return ComponentContainer;
    })();
    var Page = (function () {
        function Page(options) {
            this.pageNumber = 0;
            this.isRomanized = false;
            this.elements = [];
            this.components = [];
            this.header = null;
            if (!options)
                options = {};
            if (!_.isNumber(options.pageNumber))
                throw new Error('page number required');
            this.pageNumber = options.pageNumber;
            this.isRomanized = options.isRomanized || false;
        }
        Page.prototype.createElement = function () {
            var $page = this.$page = $('<div>').addClass('page');
            var pageNumber = this.isRomanized ? romanize(this.pageNumber) : (this.pageNumber - (lastAbilitiesPage - 1)).toString();
            $('<div>').addClass('page-number').text(pageNumber).appendTo($page);
            return this;
        };
        Page.prototype.appendTo = function (target) {
            if (this.$page)
                this.$page.appendTo(target);
            return this;
        };
        Page.prototype.bindEvents = function () {
            this.elements.forEach(function (element) {
                if (element && typeof element.bindEvents === 'function')
                    element.bindEvents();
            });
            if (this.header && typeof this.header.bindEvents === 'function')
                this.header.bindEvents();
            if (this.components) {
                this.components.forEach(function (c) {
                    if (c.container)
                        c.container.bindEvents();
                });
            }
            return this;
        };
        Page.prototype.addElement = function (element) {
            this.elements.push(element);
            return this;
        };
        Page.prototype.setHeader = function (header) {
            this.header = header;
            return this;
        };
        return Page;
    })();
    var DropZone = (function () {
        function DropZone() {
        }
        DropZone.prototype.createElement = function () {
            if (this.$dropZone)
                return this;
            this.$dropZone = $('<div>').addClass('drop-zone');
            return this;
        };
        DropZone.prototype.appendTo = function (target) {
            if (this.$dropZone)
                this.$dropZone.appendTo(target);
            return this;
        };
        DropZone.prototype.bindEvents = function () {
            var _this = this;
            if (!this.$dropZone)
                return this;
            this.$dropZone.off('click').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!isReorderingAbilities)
                    return false;
                var targetIndex = _this.$dropZone.index('.drop-zone');
                var ability;
                for (var i = 0, length = abilities.length; i < length; i++) {
                    ability = abilities[i];
                    if (ability.isSelected) {
                        if (targetIndex !== i) {
                            abilities.splice(targetIndex - 3, 0, abilities.splice(i, 1)[0]);
                            i--;
                        }
                        ability.select();
                    }
                }
                var page = getCurrentPage();
                var options = Spellbook.$pages.turn('options');
                var duration = options.duration || 600;
                initializePages();
                initializeAbilities();
                initializeAbilityDetails();
                initializeComponents();
                initializeTurnJs();
                Spellbook.$pages.turn('options', { duration: 0 });
                Spellbook.$pages.turn('page', page);
                Spellbook.$pages.turn('options', { duration: duration });
                return false;
            });
            return this;
        };
        return DropZone;
    })();
    var PageHeader = (function () {
        function PageHeader() {
        }
        PageHeader.prototype.createElement = function () {
            if (this.$header)
                return this;
            this.$header = $('<div>').addClass('page-header');
            return this;
        };
        PageHeader.prototype.appendTo = function (target) {
            if (this.$header)
                this.$header.appendTo(target);
            return this;
        };
        PageHeader.prototype.bindEvents = function () {
            return this;
        };
        return PageHeader;
    })();
    var AbilitiesHeader = (function () {
        function AbilitiesHeader() {
        }
        AbilitiesHeader.prototype.createElement = function () {
            if (this.$header)
                return this;
            var $header = this.$header = $('<div>').addClass('page-header');
            $('<h1>').text('Abilities').appendTo($header);
            // this.$reorderButton = $('<button>').addClass('btn-reorder').appendTo($header);
            return this.bindEvents();
        };
        AbilitiesHeader.prototype.appendTo = function (target) {
            if (this.$header)
                this.$header.appendTo(target);
            return this;
        };
        AbilitiesHeader.prototype.bindEvents = function () {
            if (this.$reorderButton)
                this.$reorderButton.off('click').on('click', this.toggleReorder);
            return this;
        };
        AbilitiesHeader.prototype.toggleReorder = function (e) {
            e.preventDefault();
            e.stopPropagation();
            isReorderingAbilities = !isReorderingAbilities;
            Spellbook.$spellbook[isReorderingAbilities ? 'addClass' : 'removeClass']('reordering');
            if (!isReorderingAbilities) {
                abilities.forEach(function (ability) {
                    ability.deselect();
                });
            }
            return false;
        };
        return AbilitiesHeader;
    })();
    var ComponentsHeader = (function () {
        function ComponentsHeader() {
        }
        ComponentsHeader.prototype.createElement = function () {
            if (this.$header)
                return this;
            var $header = this.$header = $('<div>').addClass('page-header');
            $('<h1>').text('Components').appendTo($header);
            return this;
        };
        ComponentsHeader.prototype.appendTo = function (target) {
            if (this.$header)
                this.$header.appendTo(target);
            return this;
        };
        ComponentsHeader.prototype.bindEvents = function () {
            return this;
        };
        return ComponentsHeader;
    })();
    function loadAbilities() {
        if (cuAPI.webAPIHost != undefined) {
            var options = {};
            options.url = cu.SecureApiUrl('api/craftedabilities');
            options.type = 'GET';
            options.contentType = 'application/json; charset=utf-8';
            options.data = {
                loginToken: loginToken,
                characterID: characterID
            };
            return $.ajax(options);
        }
        else {
            //ellian
            return $.getJSON('../cu/abilities.json');
        }
    }
    function loadTrainedComponents() {
        if (cuAPI.webAPIHost != undefined) {
            var options = {};
            options.url = cu.SecureApiUrl('api/craftedabilities/components');
            options.type = 'GET';
            options.contentType = 'application/json; charset=utf-8';
            options.data = {
                loginToken: loginToken,
                characterID: characterID
            };
            return $.ajax(options);
        }
        else {
            //ellian
            return $.getJSON('../cu/components.json');
        }
    }
    function mapAbilities(abilities) {
        return abilities.map(mapAbility);
    }
    function mapAbility(ability) {
        return new CraftedAbility({
            id: _.isNumber(ability.id) ? ability.id.toString(16) : ability.id.toString(),
            name: ability.name,
            icon: ability.icon,
            notes: ability.notes,
            componentSlots: mapComponentSlots([ability.rootComponentSlot]),
            stats: ability.stats
        });
    }
    function mapComponents(components) {
        return components.map(function (component) {
            var c = new Component({
                id: component.id,
                type: component.type,
                subType: component.subType,
                name: component.name,
                description: component.description,
                icon: component.icon,
                stats: component.stats,
                requirements: component.requirements,
                isTrained: true
            });
            c.slot = new ComponentSlot({
                type: component.type,
                subType: component.subType,
                component: c,
                x: 0,
                y: 0
            });
            return c;
        });
    }
    function mapComponentSlots(componentSlots) {
        return componentSlots.map(function (componentSlot) {
            if (!componentSlot)
                return null;
            var component = components.filter(function (c) { return c.id === componentSlot.componentID; })[0];
            if (!component)
                return null;
            var clonedComponent = component.clone();
            var clonedComponentSlot = component.slot.clone();
            if (componentSlot.children && componentSlot.children.length) {
                clonedComponentSlot.children = mapComponentSlots(componentSlot.children);
            }
            clonedComponent.slot = clonedComponentSlot;
            clonedComponentSlot.component = clonedComponent;
            return clonedComponentSlot;
        }).filter(function (componentSlot) { return componentSlot != null; });
    }
    function focusSearch(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        $search.select();
        return false;
    }
    function showSearch() {
        $searchModal.stop().fadeIn();
    }
    function hideSearch() {
        $searchModal.stop().fadeOut();
    }
    function toggleSearch(e) {
        e.preventDefault();
        e.stopPropagation();
        if ($searchModal.is(':visible')) {
            hideSearch();
        }
        else {
            showSearch();
            focusSearch();
        }
        return false;
    }
    function search() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = null;
        }
        searchTimeout = setTimeout(performSearch, SEARCH_DELAY);
    }
    function performSearch() {
        searchText = $search.val().toLowerCase();
        if (searchText === previousSearchText)
            return;
        previousSearchText = searchText;
        initializePages();
        initializeAbilities();
        initializeAbilityDetails();
        initializeComponents();
        initializeTurnJs();
    }
    function ignoreEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    function getCurrentPage() {
        return Spellbook.$pages.turn('page');
    }
    function turnToPage(e, page) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        Spellbook.$pages.turn('page', page);
        return false;
    }
    function turnToFirstAbilitiesPage(e) {
        if (firstAbilitiesPage) {
            turnToPage(e, firstAbilitiesPage);
        }
    }
    function turnToFirstComponentsPage(e) {
        if (firstComponentsPage) {
            turnToPage(e, firstComponentsPage);
        }
    }
    function turnToPreviousPage() {
        if (getCurrentPage() > firstAbilitiesPage) {
            Spellbook.$pages.turn('previous');
        }
    }
    function turnToNextPage() {
        if (getCurrentPage() < lastComponentsPage) {
            Spellbook.$pages.turn('next');
        }
    }
    function showAbilityPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        $abilityPagesModal.empty();
        var $ul = $('<ul>').appendTo($abilityPagesModal);
        if (_.isNumber(firstAbilitiesPage) && _.isNumber(lastAbilitiesPage)) {
            $('<li>').addClass('page-label').text('Page').appendTo($ul);
            var currentPage = getCurrentPage() - 1;
            _.range(firstAbilitiesPage - 1, lastAbilitiesPage, 2).forEach(function (i) {
                var $li = $('<li>').text(romanize(i)).appendTo($ul);
                if (currentPage !== i && currentPage !== i + 1) {
                    $li.on('click', function (evt) {
                        $li.addClass('current').siblings().removeClass('current');
                        turnToPage(evt, i + 1);
                    });
                }
                else {
                    $li.addClass('current');
                }
            });
        }
        $btnAbilities.addClass('hovered');
        $abilityPagesModal.stop().fadeIn();
        return false;
    }
    function preventHideAbilityPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        isShowingAbilityPagesModal = true;
        if (hideAbilityPagesTimeout) {
            clearTimeout(hideAbilityPagesTimeout);
            hideAbilityPagesTimeout = null;
        }
        return false;
    }
    function hideAbilityPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        isShowingAbilityPagesModal = false;
        hideAbilityPagesTimeout = setTimeout(function () {
            $btnAbilities.removeClass('hovered');
            $abilityPagesModal.stop().fadeOut();
        }, HIDE_DELAY);
        return false;
    }
    function showComponentPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        $componentPagesModal.empty();
        var $ul = $('<ul>').appendTo($componentPagesModal);
        var pageModifier = lastAbilitiesPage - 1;
        if (_.isNumber(firstComponentsPage) && _.isNumber(lastComponentsPage)) {
            $('<li>').addClass('page-label').text('Page').appendTo($ul);
            var currentPage = getCurrentPage() - 1;
            _.range(firstComponentsPage - 1 - pageModifier, lastComponentsPage - pageModifier, 2).forEach(function (i) {
                var $li = $('<li>').text(i).appendTo($ul);
                if (currentPage !== i + pageModifier && currentPage !== i + pageModifier + 1) {
                    $li.on('click', function (evt) {
                        $li.addClass('current').siblings().removeClass('current');
                        turnToPage(evt, i + 1 + pageModifier);
                    });
                }
                else {
                    $li.addClass('current');
                }
            });
        }
        $btnComponents.addClass('hovered');
        $componentPagesModal.stop().fadeIn();
        return false;
    }
    function preventHideComponentPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        isShowingComponentPagesModal = true;
        if (hideComponentPagesTimeout) {
            clearTimeout(hideComponentPagesTimeout);
            hideComponentPagesTimeout = null;
        }
        return false;
    }
    function hideComponentPagesModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        isShowingComponentPagesModal = false;
        hideComponentPagesTimeout = setTimeout(function () {
            $btnComponents.removeClass('hovered');
            $componentPagesModal.stop().fadeOut();
        }, HIDE_DELAY);
        return false;
    }
    function updateSelectedButton(page) {
        var isAbilitiesPage = page >= 1 && page <= lastAbilitiesPage;
        var isComponentsPage = _.isNumber(firstComponentsPage) && page >= firstComponentsPage;
        $btnAbilities[isAbilitiesPage ? 'addClass' : 'removeClass']('selected');
        $btnComponents[isComponentsPage ? 'addClass' : 'removeClass']('selected');
    }
    function romanize(number) {
        if (!+number)
            return '';
        var digits = String(+number).split(""), key = [
            "", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
            "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
            "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"
        ], roman = "", i = 3;
        while (i--)
            roman = (key[+digits.pop() + (i * 10)] || "") + roman;
        return Array(+digits.join("") + 1).join("M") + roman;
    }
    function closeSpellbook(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        Spellbook.$spellbook.fadeOut(function () {
            if (typeof cuAPI === 'object') {
                cuAPI.HideUI('spellbook');
                setTimeout(function () {
                    Spellbook.$spellbook.css({ display: 'block' });
                }, 100);
            }
        });
        cuAPI.PlaySoundEvent(cu.SOUND_EVENTS.PLAY_UI_SPELLBOOK_PUTAWAY);
        return false;
    }
    function onAbilityCreated(abilityID, a) {
        console.log('ability created: ' + abilityID);
        var ability = mapAbility(JSON.parse(a));
        abilities.push(ability);
        initializePages();
        initializeAbilities();
        initializeAbilityDetails();
        initializeComponents();
        initializeTurnJs();
    }
    function onAbilityDeleted(abilityID) {
        console.log('ability deleted: ' + abilityID);
        for (var i = 0, length = abilities.length; i < length; i++) {
            if (abilities[i].id == abilityID) {
                abilities.splice(i, 1);
                break;
            }
        }
        initializePages();
        initializeAbilities();
        initializeAbilityDetails();
        initializeComponents();
        initializeTurnJs();
    }
    function onShowAbility(abilityID) {
        // TODO: implement
        console.log('show ability: ' + abilityID);
    }
    function showErrorModal(message) {
        $errorModalMessage.text(message);
        $errorModal.fadeIn();
    }
    function hideErrorModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        $errorModal.fadeOut();
        return false;
    }
    function handleArrowKeys(e) {
        if (e.which === 37) {
            turnToPreviousPage();
        }
        else if (e.which === 39) {
            turnToNextPage();
        }
    }
    function createBlankPages(options) {
        if (!options)
            options = {};
        while (pageNumber < 2 || pageNumber % 2 !== 0) {
            options.pageNumber = ++pageNumber;
            pages.push(new Page(options).createElement().appendTo(Spellbook.$pages));
        }
    }
    function initializePages() {
        firstAbilitiesPage = null;
        lastAbilitiesPage = null;
        firstComponentsPage = null;
        lastComponentsPage = null;
        pageNumber = 0;
        pages = [];
        if (_.isNumber(getCurrentPage())) {
            Spellbook.$pages.turn('destroy');
        }
        Spellbook.$pages.empty();
        $('<div>').addClass('blank-page').text('This page intentionally left blank.').appendTo(Spellbook.$pages);
    }
    function initializeTurnJs() {
        if (pages.length < 2)
            return;
        Spellbook.$pages.turn({
            page: 2,
            width: 758,
            height: 560,
            gradients: true,
            when: {
                start: function (event, pageObject) {
                    if (pageObject.next == 1)
                        event.preventDefault();
                },
                turning: function (event, page) {
                    if (page == 1)
                        event.preventDefault();
                    if (page > lastVisitedPage) {
                        cuAPI.PlaySoundEvent(cu.SOUND_EVENTS.PLAY_UI_SPELLBOOK_PAGEFLIP_FORWARD);
                    }
                    else if (page < lastVisitedPage) {
                        cuAPI.PlaySoundEvent(cu.SOUND_EVENTS.PLAY_UI_SPELLBOOK_PAGEFLIP_BACKWARD);
                    }
                    lastVisitedPage = page;
                    updateSelectedButton(page);
                },
                turned: function (event, page, view) {
                    updateSelectedButton(page);
                    var firstPage = _.min(view) - 1;
                    var lastPage = _.max(view) - 1;
                    if (firstPage === -1)
                        firstPage = lastPage;
                    if (firstPage !== lastPage) {
                        pages[firstPage - 1].bindEvents();
                    }
                    pages[lastPage - 1].bindEvents();
                }
            }
        });
    }
    function sortByAbilityID(a, b) {
        var aID = !_.isNumber(a.id) ? parseInt(a.id, 16) : a.id;
        var bID = !_.isNumber(b.id) ? parseInt(b.id, 16) : b.id;
        return aID - bID;
    }
    function initializeAbilities() {
        var page;
        var abilitiesAppended = 0;
        var isNewPage = true;
        abilities.sort(sortByAbilityID);
        abilities.forEach(function (ability) {
            ability.isVisible = !searchText || ability.name.toLowerCase().indexOf(searchText) !== -1;
            if (ability.$ability)
                ability.$ability[0].style.display = ability.isVisible ? 'block' : 'none';
            if (!ability.isVisible)
                return;
            if (isNewPage) {
                isNewPage = false;
                page = new Page({ pageNumber: ++pageNumber, isRomanized: true }).createElement().appendTo(Spellbook.$pages);
                if (page.pageNumber % 2 === 1) {
                    page.setHeader(new AbilitiesHeader().createElement().appendTo(page.$page));
                }
                else {
                    page.setHeader(new PageHeader().createElement().appendTo(page.$page));
                }
                page.addElement(new DropZone().createElement().appendTo(page.$page));
                pages.push(page);
                if (!firstAbilitiesPage)
                    firstAbilitiesPage = pageNumber + 1;
            }
            page.addElement(ability.createElement().appendTo(page.$page));
            page.addElement(new DropZone().createElement().appendTo(page.$page));
            if (++abilitiesAppended % ABILITIES_PER_PAGE === 0) {
                isNewPage = true;
            }
        });
        createBlankPages({ isRomanized: true });
        if (!lastAbilitiesPage)
            lastAbilitiesPage = pageNumber + 1;
    }
    function initializeAbilityDetails() {
        var leftPage, rightPage;
        abilities.forEach(function (ability) {
            if (!ability.leftDetail) {
                ability.leftDetail = new AbilityLeftDetail(ability);
            }
            if (!ability.rightDetail) {
                ability.rightDetail = new AbilityRightDetail(ability);
            }
            ability.leftDetail.isVisible = ability.rightDetail.isVisible = !searchText || ability.name.toLowerCase().indexOf(searchText) !== -1;
            if (ability.leftDetail.$detail)
                ability.leftDetail.$detail[0].style.display = ability.leftDetail.isVisible ? 'block' : 'none';
            if (ability.rightDetail.$detail)
                ability.rightDetail.$detail[0].style.display = ability.rightDetail.isVisible ? 'block' : 'none';
            if (!ability.leftDetail.isVisible || !ability.rightDetail.isVisible)
                return;
            leftPage = new Page({ pageNumber: ++pageNumber }).createElement().appendTo(Spellbook.$pages);
            pages.push(leftPage);
            ability.leftDetail.page = leftPage;
            leftPage.addElement(ability.leftDetail.createElement().appendTo(leftPage.$page));
            rightPage = new Page({ pageNumber: ++pageNumber }).createElement().appendTo(Spellbook.$pages);
            pages.push(rightPage);
            ability.rightDetail.page = rightPage;
            rightPage.addElement(ability.rightDetail.createElement().appendTo(rightPage.$page));
            ability.updateElement();
        });
    }
    function initializeComponents() {
        var page;
        var componentsAppended = 0;
        var isNewPage = true;
        components.forEach(function (c) {
            var component = c.clone();
            component.isVisible = !searchText || component.name.toLowerCase().indexOf(searchText) !== -1;
            if (component.$component)
                component.$component[0].style.display = component.isVisible ? 'block' : 'none';
            if (!component.isVisible)
                return;
            if (isNewPage) {
                isNewPage = false;
                page = new Page({ pageNumber: ++pageNumber }).createElement().appendTo(Spellbook.$pages);
                if (page.pageNumber % 2 === 1) {
                    page.setHeader(new ComponentsHeader().createElement().appendTo(page.$page));
                }
                else {
                    page.setHeader(new PageHeader().createElement().appendTo(page.$page));
                }
                pages.push(page);
                if (!firstComponentsPage)
                    firstComponentsPage = pageNumber + 1;
            }
            if (!component.container) {
                component.container = new ComponentContainer(component);
            }
            if (component.container) {
                component.container.createElement().appendTo(page.$page);
            }
            if (component.slot) {
                component.slot.createElement().appendTo(component.container.$container);
            }
            component.createElement().appendTo(component.container.$container);
            page.components.push(component);
            if (++componentsAppended % COMPONENTS_PER_PAGE === 0) {
                isNewPage = true;
            }
        });
        createBlankPages();
        if (!lastComponentsPage)
            lastComponentsPage = pageNumber + 1;
    }
    function initialize() {
        cuAPI.CloseUI("spellbook");
        $(document).click(hideSearch);
        $document.on('contextmenu', ignoreEvent);
        $document.keydown(handleArrowKeys);
        $btnAbilities.click(turnToFirstAbilitiesPage).hover(showAbilityPagesModal, hideAbilityPagesModal);
        $btnComponents.click(turnToFirstComponentsPage).hover(showComponentPagesModal, hideComponentPagesModal);
        $abilityPagesModal.hover(preventHideAbilityPagesModal, hideAbilityPagesModal);
        $componentPagesModal.hover(preventHideComponentPagesModal, hideComponentPagesModal);
        $btnSearch.click(toggleSearch);
        $search.click(focusSearch).blur(hideSearch).keyup(search);
        $btnClose.click(closeSpellbook);
        $btnCloseErrorModal.click(hideErrorModal);
        if (typeof cuAPI === 'object') {
            cuAPI.OnInitialized(function () {
                if (typeof spellBookInitialize === 'function') {
                    spellBookInitialize();
                }
                // start hidden
                cuAPI.HideUI('spellbook');
                Spellbook.$spellbook.hide();
                cuAPI.OnAbilityCreated(onAbilityCreated);
                cuAPI.OnAbilityDeleted(onAbilityDeleted);
                cuAPI.OnShowAbility(onShowAbility);
                cuAPI.OnSyncComponents(function () {
                    var componentsPromise = loadTrainedComponents();
                    componentsPromise.done(function (c) {
                        components = mapComponents(c);
                        initializeComponents();
                    });
                });
                cuAPI.OnCharacterIDChanged(function (id) {
                    characterID = id;
                    var abilitiesPromise = loadAbilities();
                    abilitiesPromise.fail(function () {
                        showErrorModal('Failed to load abilities.');
                    });
                    var componentsPromise = loadTrainedComponents();
                    componentsPromise.fail(function () {
                        showErrorModal('Failed to load components.');
                    });
                    Promise.all([abilitiesPromise, componentsPromise]).then(function () {
                        componentsPromise.done(function (c) {
                            components = mapComponents(c);
                            abilitiesPromise.done(function (a) {
                                abilities = mapAbilities(a);
                                initializePages();
                                initializeAbilities();
                                initializeAbilityDetails();
                                initializeComponents();
                                initializeTurnJs();
                                Spellbook.$spellbook.fadeIn();
                            });
                        });
                    }, function () {
                    });
                });
                loginToken = cuAPI.loginToken;
            });
        }
    }
    initialize();
})(Spellbook || (Spellbook = {}));
//# sourceMappingURL=ellian-spellbook.js.map