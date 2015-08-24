/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/// <reference path="../vendor/jquery.d.ts" />
/// <reference path="../cu/cu.ts" />
var EllianSkillbar;
(function(EllianSkillbar) {
	/* Constants */
	var BUTTON_WIDTH = 50;
	var BUTTON_LEFT_OFFSET = 5;
	/* jQuery Elements */
	var $skillButtons = cu.FindElement('#skillButtons');
	/* Variables */
	var abilities = [];
	var mapAbilities = {};

	var tooltip = null;
	var dragSrcEl = null;
	/* Functions */
	function sortByAbilityID(a, b) {
		var aID = !_.isNumber(a.id) ? parseInt(a.id, 16) : a.id;
		var bID = !_.isNumber(b.id) ? parseInt(b.id, 16) : b.id;
		return aID - bID;
	}
	function updateSkillbarWidth(totalAbilities) {
		$skillButtons.css('width', totalAbilities * BUTTON_WIDTH
				+ BUTTON_LEFT_OFFSET);
	}
	function updateTooltip() {
		if (tooltip)
			tooltip.destroy();
		tooltip = new Tooltip($skillButtons.children(), {
			leftOffset : 0,
			topOffset : -30
		});
	}
	function drop(e) {
		console.log("drop");
		// this/e.target is current target element.
		if (e.stopPropagation) {
			e.stopPropagation(); // Stops some browsers from redirecting.
		}
		// Don't do anything if dropping the same column we're dragging.
		if (dragSrcEl != e.target) {
			var curPos = mapAbilities[dragSrcEl.data - id];
			console.log("curPos " + curPos);
			var targetPos = mapAbilities[e.target.data - id];
			console.log("targetPos " + targetPos);
			mapAbilities[dragSrcEl.data - id] = targetPos;
			mapAbilities[e.target.data - id] = curPos;
			updateSkillbar();
		}
		return false;
	}
	function drag(e) {
		console.log("drag " + e.target);
		e.target.style.opacity = '0.4';
		dragSrcEl = e.target;
		e.stopPropagation();
	}
	function dragEnd(e) {
		dragSrcEl.style.opacity = '1';
	}
	function allowDrop(e) {
		if (e.preventDefault) {
			e.preventDefault(); // Necessary. Allows us to drop.
		}
		return false;
	}
	function orderAbilities(abils) {
		var orderedAbilities = [];
		for (i = 1; i < abils.length; i++) {
			if (mapAbilities[abils[i].id] != null) {
				orderedAbilities[mapAbilities[abils[i].id]] = abils[i].id;
			}
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
		} else {
			console.log("not first time " + Object.keys(mapAbilities).length);
			if (Object.keys(mapAbilities).length == 0) {
				// Load current settings
				console.log("load");
				for (i = 0; i < 50; i++) {
					if (localStorage.getItem("ellian-skillbar-" + i) != null) {
						mapAbilities[localStorage.getItem("ellian-skillbar-"
								+ i)] = i;
						console.log("cur pos "
								+ localStorage.getItem("ellian-skillbar-" + i)
								+ " " + i);
					}
				}
			} else {
				console.log("order");
				// Order abilities
				abilities = orderAbilities(abilities);
				// for (i = 0; i < 50; i++) {
				// Reset stored information
				// localStorage.removeItem("ellian-skillbar-" + i);
				// }
			}
		}

		abilities.forEach(function(ability, i) {
			localStorage.setItem("ellian-skillbar-" + i, ability.id);
			mapAbilities[ability.id] = i;

			// Create slot
		/*
		 * var slot = document.createElement('div'); $(slot).attr('id',
		 * ability.id).appendTo($skillButtons).attr( 'draggable', 'true'); /*
		 * .on("drop", drop) .on("dragstart", drag) .on("dragend", dragEnd)
		 * .on("dragover", allowDrop);
		 */

		/*
		 * slot.addEventListener("drop", drop, true);
		 * slot.addEventListener("dragstart", drag, true);
		 * slot.addEventListener("dragend", dragEnd, true);
		 * slot.addEventListener("dragover", allowDrop, true);
		 */

			// Create button
			var button = ability.MakeButton(i);
			var elem = button.rootElement.css({
				left : (i * BUTTON_WIDTH + BUTTON_LEFT_OFFSET) + 'px',
				top : '0'
			});

			if (ability.name)
				elem.attr('data-tooltip-title', ability.name);
			if (ability.tooltip)
				elem.attr('data-tooltip-content', ability.tooltip);
			elem.click(function() {
				ability.Perform()
			});
			//elem.mousedown(function(){});
			
			elem.on("drop", drop);
			elem.on("dragstart", drag);
			elem.on("dragend", dragEnd);
			elem.on("dragover", allowDrop);
			elem.on('mousedown', function (event) {});

			elem.css('opacity', '1');
			
			//$(slot).append(elem);
			
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
		mapAbilities[ability.id] = abilities.length;
		abilities.push(ability);
		updateSkillbar();
	}
	function removeAbilityById(id) {
		var curPos = mapAbilities[id];
		mapAbilities[id] = null;
		for (var i = abilities.length - 1; i >= 0; i--) {
			var ability = abilities[i];
			if (ability.id.toString(16) === id) {
				abilities.splice(i, 1);
			}
			if (mapAbilities[ability.id] >= curPos) {
				// Decrease the position of the other abilities
				mapAbilities[ability.id] = mapAbilities[ability.id] - 1;
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
		var primaryComponentBaseID = primaryComponent
				&& primaryComponent.baseComponentID ? primaryComponent.baseComponentID
				.toString(16)
				: '';
		var secondaryComponent = getSecondaryComponent(craftedAbility);
		var secondaryComponentBaseID = secondaryComponent
				&& secondaryComponent.baseComponentID ? secondaryComponent.baseComponentID
				.toString(16)
				: '';
		cuAPI.RegisterAbility(abilityID, primaryComponentBaseID,
				secondaryComponentBaseID);
	}
	function getPrimaryComponent(craftedAbility) {
		if (craftedAbility) {
			return craftedAbility.rootComponentSlot;
		}
	}
	function getSecondaryComponent(craftedAbility) {
		if (craftedAbility && craftedAbility.rootComponentSlot
				&& craftedAbility.rootComponentSlot.children) {
			return craftedAbility.rootComponentSlot.children[0];
		}
	}
	function onCharacterIDChanged(characterID) {
		console.log("onCharacterIDChanged");
		var req = cu.RequestAllAbilities(cuAPI.loginToken, characterID,
				function(abils) {
					console.log("RequestAllAbilities");
					abilities = abils.splice(0, 5);
					updateSkillbar();
				});
		if (!req)
			return;
		req.then(function(abils) {
			if (!abils || !abils.length)
				return;
			abils.sort(sortByAbilityID);
			abils.forEach(function(abil) {
				abil.id = abil.id.toString(16);
				abil.tooltip = abil.tooltip || abil.notes;
				registerAbility(abil);
			});
			cu.UpdateAllAbilities(abils);
		});
	}
	/* Initialization */
	if (cu.HasAPI()) {
		cu.OnInitialized(function() {
			cuAPI.OnCharacterIDChanged(onCharacterIDChanged);
			cuAPI.OnAbilityCreated(onAbilityCreated);
			cuAPI.OnAbilityDeleted(onAbilityDeleted);
		});
	}
})(EllianSkillbar || (EllianSkillbar = {}));
