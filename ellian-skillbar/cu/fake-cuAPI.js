/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/// <reference path="../vendor/jquery.d.ts" />
var CUFakeGameAPI = (function () {
    function CUFakeGameAPI() {
        this.Race = {
            Tuatha: 0,
            Hamadryad: 1,
            Luchorpan: 2,
            Firbog: 3,
            Valkyrie: 4,
            Helbound: 5,
            FrostGiant: 6,
            Dvergr: 7,
            Strm: 8,
            CaitSith: 9,
            Golem: 10,
            Gargoyle: 11,
            StormRiderA: 12,
            StormRiderT: 13,
            StormRiderV: 14
        };
        this._initialised = false;
        this._events = {};
        this._token = "x4rNIR6YUCK06nCjOXJxP0";
        this._serverStart = Date.now();
        this._clientType = "internal";
        this._openUIs = {};
        this._buildingMode = false;
        // simulate character/player data
        this._character = {
            id: "3goL1PEefVFg4Ag5CH4tCB", name: "ellian", race: undefined, hpTouched: Date.now(), hp: 100, maxHP: 100, staminaTouched: Date.now(), stamina: 0, maxStamina: 100
        };
        this._target = {
            name: undefined, race: undefined, hpTouched: Date.now(), hp: 100, maxHP: 100, staminaTouched: Date.now(), stamina: 0, maxStamina: 100
        };
        this._friendly = {
            name: undefined, race: undefined, hpTouched: Date.now(), hp: 100, maxHP: 100, staminaTouched: Date.now(), stamina: 0, maxStamina: 100
        };
        this._init();
    }
    CUFakeGameAPI.prototype.rand = function (n) {
        return (Math.random() * n) | 0;
    };
    CUFakeGameAPI.prototype._ev = function (name, c) {
        var a = this._events[name] || [];
        this._events[name] = a;
        return a.push(c);
    };
    CUFakeGameAPI.prototype._evc = function (name, c) {
        var a = this._events[name];
        if (a) {
            a[c] = null;
        }
    };
    CUFakeGameAPI.prototype._evf = function (name, args) {
        var a = this._events[name];
        if (a) {
            for (var i = 0; i < a.length; i++) {
                if (a[i]) {
                    (function (callback) {
                        setTimeout(function () {
                            console.log(name + ": " + JSON.stringify(args));
                            callback.apply(window, args);
                        }, 0);
                    })(a[i]);
                }
            }
        }
    };
    CUFakeGameAPI.prototype._init = function () {
        var cuAPI = this;
        function _randomCharacter() {
            return ["Player1"][cuAPI.rand(1)];
        }
        function _randomPlayer() {
            return ["CSE_Mark", "CSE_JB", "CSE_Brian", "CSE_Bryce", "DonnieT", "Meddyck", "CSE_Jenesee", "Mehuge", "CSE_Cory", "CSE_Tyler"][cuAPI.rand(10)];
        }
        function _changeCharacter(tick, _player) {
            _player.name = _randomCharacter();
            cuAPI._evf("OnCharacterNameChanged", [_player.name]);
            _player.race = cuAPI.rand(15) | 0;
            cuAPI._evf("OnCharacterRaceChanged", [_player.race]);
        }
        function _changeTarget(tick, _player) {
            _player.name = _randomPlayer();
            cuAPI._evf("OnTargetNameChanged", [_player.name]);
        }
        function _changeFriendlyTarget(tick, _player) {
            _player.name = _randomPlayer();
            cuAPI._evf("OnFriendlyTargetNameChanged", [_player.name]);
        }
        function _playerTick(tick, cls, _player) {
            // Fire character name change if not currently got a name
            if (!_player.name) {
                if (_player === cuAPI._character) {
                    _changeCharacter(tick, _player);
                }
                else if (_player === cuAPI._target) {
                    _changeTarget(tick, _player);
                }
                else if (_player === cuAPI._target) {
                    _changeFriendlyTarget(tick, _player);
                }
            }
            // Character health emulation.  We want to do this infrequently, so here
            // we are saying between 0.5 and 1s appart.
            if (tick - _player.hpTouched >= cuAPI.rand(500) + 500) {
                // player takes damage?
                if (_player.hp > 0 && cuAPI.rand(10) < 5) {
                    _player.hp -= 1 + cuAPI.rand(30);
                    _player.hpTouched = tick;
                    if (_player.hp < 0) {
                        _player.hp = 0;
                    }
                    cuAPI._evf("On" + cls + "HealthChanged", [_player.hp, _player.maxHP]);
                    if (_player.hp === 0) {
                        cuAPI._evf("OnChat", [
                            XmppMessageType.GROUPCHAT,
                            "_combat@chat.camelotunchained.com",
                            (cuAPI.rand(10) < 1 ? cuAPI._character.name : _randomPlayer()) + " killed " + _player.name + ".",
                            "", false
                        ]);
                    }
                }
                // Character is healed?
                if (_player.hp < _player.maxHP && cuAPI.rand(10) < 2) {
                    _player.hp += 1 + cuAPI.rand(70);
                    _player.hpTouched = tick;
                    if (_player.hp > _player.maxHP) {
                        _player.hp = _player.maxHP;
                    }
                    cuAPI._evf("On" + cls + "HealthChanged", [_player.hp, _player.maxHP]);
                }
            }
            // Character stamina emulation.  Again only change this ever 0.5s to 1s
            if (tick - _player.hpTouched >= cuAPI.rand(500) + 500) {
                // Character stamina emulation
                if (_player.stamina > 0 && cuAPI.rand(10) < 5) {
                    _player.stamina -= 1 + cuAPI.rand(10);
                    _player.staminaTouched = tick;
                    if (_player.stamina < 0) {
                        _player.stamina = 0;
                    }
                    cuAPI._evf("On" + cls + "StaminaChanged", [_player.stamina, _player.maxStamina]);
                }
                // Character is healed?
                if (_player.stamina < _player.maxStamina && cuAPI.rand(10) < 2) {
                    _player.stamina += 1 + cuAPI.rand(30);
                    _player.staminaTouched = tick;
                    if (_player.stamina > _player.maxStamina) {
                        _player.stamina = _player.maxStamina;
                    }
                    cuAPI._evf("On" + cls + "StaminaChanged", [_player.stamina, _player.maxStamina]);
                }
            }
        }
        function _nameplateTick(tick) {
            if (tick % 5 === 0) {
                var cell = cuAPI.rand(8);
                var colorMod = cuAPI.rand(4) + 1;
                var name = _randomCharacter();
                var gtag = cuAPI.rand(10) < 1 ? "[CSE]" : "";
                var title = "Player Title";
                cuAPI._evf("OnUpdateNameplate", [cell, colorMod, name, gtag, title]);
            }
        }
        function _tick() {
            var tick = Date.now();
            // emulation tick, here we will simulate the live environment (as much as we can) in the UI.  
            // We will adjust HP, targets etc.
            _playerTick(tick, "Character", cuAPI._character);
            _playerTick(tick, "Target", cuAPI._target);
            _playerTick(tick, "FriendlyTarget", cuAPI._friendly);
            _nameplateTick(tick);
        }
        setInterval(_tick, 100);
        return setTimeout(function () {
            cuAPI._initialised = true;
            cuAPI._evf("OnInitialized", []);
        }, 100 + cuAPI.rand(200));
    };
    Object.defineProperty(CUFakeGameAPI.prototype, "initialised", {
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // These are the only things that are guaranteed to exist from the time
        // the page is created. Everything else will be constructed over the course
        // of the client's setup, concurrent to the page load and inital script
        // execution. Anything you need to do in setup should be attached to
        // cu.OnInitialized(), which will be called after the page is loaded
        // and this is fully set up.
        get: function () {
            return this._initialised;
        },
        enumerable: true,
        configurable: true
    });
    CUFakeGameAPI.prototype.OnInitialized = function (c) {
        var handle = this._ev("OnInitialized", c);
        if (this.initialised) {
            this._evf("OnInitialized", []);
        }
        return handle;
    };
    CUFakeGameAPI.prototype.CancelOnInitialized = function (c) {
        this._evc("OnInitialized", c);
    };
    // Everything else only exists after this.initialized is set and the
    // OnInitialized callbacks are invoked.
    /* Shared */
    // Called by the client when a connection to a server is established
    CUFakeGameAPI.prototype.OnServerConnected = function (c) {
        return this._ev("OnServerConnected", c);
    };
    CUFakeGameAPI.prototype.CancelOnServerConnected = function (c) {
        this._evc("OnServerConnected", c);
    };
    Object.defineProperty(CUFakeGameAPI.prototype, "loginToken", {
        // Returns the users login token provided by the patcher.  Under fake-cuAPI conditions we wont have
        // one of this, it is up to the user to determine and proved a valid one (by for example looking
        // at the command line of the main client exe spawned by the patcher)
        get: function () {
            if (!this._token)
                this._token = window.prompt("Login Token?");
            return this._token;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "patchResourceChannel", {
        // Resource channel used to communicate with the patcher
        get: function () {
            switch (this._clientType) {
                case "internal": return 4;
                case "alpha": return 10;
            }
            return;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "pktHash", {
        // something to do with the network
        get: function () {
            return "yOP5gKif0zt2u4FoZ8xQ27";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "serverURL", {
        // The URL for the REST API for this server
        get: function () {
            switch (this._clientType) {
                case "alpha":
                    return "http://wyrmling.camelotunchained.com:8000/api/";
            }
            return "http://chat.camelotunchained.com:8000/api/";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "serverTime", {
        // Current server time seconds
        get: function () {
            return (Date.now() - this._serverStart) / 1000;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "vsync", {
        // Returns true if vsync is on, otherwise false.
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    // Open another UI.  Limitation in fake-cuAPI is that the UI must follow
    // a standard layout and it doesn't currentl support the .ui file coordinates
    CUFakeGameAPI.prototype.OpenUI = function (name) {
        if (name.substr(-3) == ".ui")
            name = name.substr(0, name.length - 3);
        this._openUIs[name] = { window: window.open("../" + name + "/" + name + ".html", "_ui" + name, "", true), visible: true };
    };
    CUFakeGameAPI.prototype.CloseUI = function (name) {
        var ui = this._openUIs[name];
        if (ui) {
            ui.window.close();
            this._openUIs[name] = null;
        }
    };
    CUFakeGameAPI.prototype.HideUI = function (name) {
        var ui = this._openUIs[name];
        ui.size = { w: ui.window.innerWidth, h: ui.window.innerHeight };
        ui.window.resizeTo(0, 0);
        ui.false = true;
    };
    CUFakeGameAPI.prototype.ShowUI = function (name) {
        var ui = this._openUIs[name];
        ui.window.resizeTo(ui.size.w, ui.size.h);
        ui.visible = true;
    };
    CUFakeGameAPI.prototype.ToggleUIVisibility = function (name) {
        var ui = this._openUIs[name];
        if (ui.visible) {
            cuAPI.HideUI(name);
        }
        else {
            cuAPI.ShowUI(name);
        }
    };
    CUFakeGameAPI.prototype.RequestInputOwnership = function () { };
    CUFakeGameAPI.prototype.ReleaseInputOwnership = function () { };
    CUFakeGameAPI.prototype.Quit = function () { };
    CUFakeGameAPI.prototype.CrashTheGame = function () { alert('The game has crashed'); };
    CUFakeGameAPI.prototype.OnUpdateNameplate = function (c) {
        this._ev("OnUpdateNameplate", c);
    };
    /* Abilities */
    CUFakeGameAPI.prototype.OnAbilityNumbersChanged = function (callback) {
    };
    CUFakeGameAPI.prototype.Attack = function (abilityID) {
    };
    CUFakeGameAPI.prototype.OnAbilityCooldown = function (c) {
        return 0;
    };
    CUFakeGameAPI.prototype.CancelOnAbilityCooldown = function (c) {
    };
    CUFakeGameAPI.prototype.OnAbilityActive = function (c) {
        return this._ev("OnAbilityActive", c);
    };
    CUFakeGameAPI.prototype.CancelOnAbilityActive = function (c) { };
    CUFakeGameAPI.prototype.OnAbilityError = function (c) { };
    CUFakeGameAPI.prototype.OnAbilityCreated = function (callback) { };
    CUFakeGameAPI.prototype.OnAbilityDeleted = function (callback) { };
    CUFakeGameAPI.prototype.RegisterAbility = function (abilityID, primaryBaseComponentID, secondaryBaseComponentID) { };
    /* Items */
    CUFakeGameAPI.prototype.GetItem = function (itemID) { };
    CUFakeGameAPI.prototype.OnGetItem = function (callback) { };
    CUFakeGameAPI.prototype.OnItemEquipped = function (callback) { };
    CUFakeGameAPI.prototype.OnItemUnequipped = function (callback) { };
    /* Equipped Gear */
    CUFakeGameAPI.prototype.OnEquippedGearItemIDsChanged = function (callback) { };
    CUFakeGameAPI.prototype.UnequipItem = function (itemID) { };
    /* Inventory */
    CUFakeGameAPI.prototype.OnInventoryItemIDsChanged = function (callback) { };
    CUFakeGameAPI.prototype.EquipItem = function (itemID) { };
    /* Config */
    CUFakeGameAPI.prototype.OnReceiveConfigVars = function (c) { };
    CUFakeGameAPI.prototype.OnReceiveConfigVar = function (c) { };
    CUFakeGameAPI.prototype.OnConfigVarChanged = function (c) { };
    CUFakeGameAPI.prototype.SaveConfigChanges = function () { };
    CUFakeGameAPI.prototype.OnSavedConfigChanges = function (c) { };
    CUFakeGameAPI.prototype.RestoreConfigDefaults = function (tag) { };
    CUFakeGameAPI.prototype.ChangeConfigVar = function (variable, value) { };
    CUFakeGameAPI.prototype.CancelChangeConfig = function (variable) { };
    CUFakeGameAPI.prototype.CancelAllConfigChanges = function (tag) { };
    CUFakeGameAPI.prototype.GetConfigVars = function (tag) { };
    CUFakeGameAPI.prototype.GetConfigVar = function (variable) { };
    /* Building */
    CUFakeGameAPI.prototype.OnBuildingModeChanged = function (c) {
        this._ev("OnBuildingModeChanged", c);
    };
    CUFakeGameAPI.prototype.ChangeBuildingMode = function () {
        this._buildingMode = !this._buildingMode;
        this._evf("OnBuildingModeChanged", [this._buildingMode]);
    };
    /* Announcement */
    CUFakeGameAPI.prototype.OnAnnouncement = function (c) {
        this._ev("OnAnnouncement", c);
    };
    /* Character */
    CUFakeGameAPI.prototype.OnCharacterIDChanged = function (c) {
        //this._ev("OnCharacterIDChanged", c);
        var id = "OnCharacterIDChanged";
        this._ev(id, c);
        if (this._character.id !== undefined) {
            this._evf(id, [this._character.id]);
        }
    };
    CUFakeGameAPI.prototype.OnCharacterFactionChanged = function (c) {
        this._ev("OnCharacterFactionChanged", c);
    };
    CUFakeGameAPI.prototype.OnCharacterRaceChanged = function (c) {
        var id = "OnCharacterRaceChanged";
        this._ev(id, c);
        if (this._character.race !== undefined) {
            this._evf(id, [this._character.name]);
        }
    };
    /**
    * Register for character name change callbacks.  If the characters name is available
    * at the time this method is called, an event is fired immediately.
    * @prams callback Function to be called whenever the character name changes.
    */
    CUFakeGameAPI.prototype.OnCharacterNameChanged = function (callback) {
        var id = "OnCharacterNameChanged";
        this._ev(id, callback);
        if (this._character.name !== undefined) {
            this._evf(id, [this._character.name]);
        }
    };
    /**
    * Register for character health change callbacks.  This event is fired immediately.
    * @prams callback Function to be called whenever the character health changes.
    *   Both the characters current and maximum health are provided.
    */
    CUFakeGameAPI.prototype.OnCharacterHealthChanged = function (callback) {
        var id = "OnCharacterHealthChanged";
        this._ev(id, callback);
        this._evf(id, [this._character.hp, this._character.maxHP]);
    };
    /**
    * Register for character stamina change callbacks.  This event if fired immediately.
    * @prams callback Function to be called whenever the character stamina changes.
    *   Both the characters current and maximum stamina are provided.
    */
    CUFakeGameAPI.prototype.OnCharacterStaminaChanged = function (callback) {
        var id = "OnCharacterStaminaChanged";
        this._ev(id, callback);
        this._evf(id, [this._character.stamina, this._character.maxStamina]);
    };
    CUFakeGameAPI.prototype.OnCharacterEffectsChanged = function (c) { };
    /* Enemy Target */
    CUFakeGameAPI.prototype.OnEnemyTargetNameChanged = function (callback) {
        var id = "OnTargetNameChanged";
        this._ev(id, callback);
        if (this._target.name !== undefined) {
            this._evf(id, [this._target.name]);
        }
    };
    CUFakeGameAPI.prototype.OnEnemyTargetHealthChanged = function (callback) {
        var id = "OnTargetHealthChanged";
        this._ev(id, callback);
        this._evf(id, [this._target.hp, this._target.maxHP]);
    };
    CUFakeGameAPI.prototype.OnEnemyTargetStaminaChanged = function (callback) {
        var id = "OnTargetStaminaChanged";
        this._ev(id, callback);
        this._evf(id, [this._target.stamina, this._target.maxStamina]);
    };
    CUFakeGameAPI.prototype.OnEnemyTargetEffectsChanged = function (callback) { };
    /* Friendly Target */
    CUFakeGameAPI.prototype.OnFriendlyTargetNameChanged = function (callback) {
        var id = "OnFriendlytTargetNameChanged";
        this._ev(id, callback);
        if (this._friendly.name) {
            this._evf(id, [this._friendly.name]);
        }
    };
    CUFakeGameAPI.prototype.OnFriendlyTargetHealthChanged = function (callback) {
        var id = "OnFriendlyTargetHealthChanged";
        this._ev(id, callback);
        this._evf(id, [this._friendly.hp, this._friendly.maxHP]);
    };
    CUFakeGameAPI.prototype.OnFriendlyTargetStaminaChanged = function (callback) {
        var id = "OnFriendlyTargetStaminaChanged";
        this._ev(id, callback);
        this._evf(id, [this._friendly.stamina, this._friendly.maxStamina]);
    };
    CUFakeGameAPI.prototype.OnFriendlyTargetEffectsChanged = function (callback) { };
    /* Chat */
    CUFakeGameAPI.prototype.OnBeginChat = function (c) {
        this._ev("OnBeginChat", c);
    };
    CUFakeGameAPI.prototype.OnChat = function (c) {
        this._ev("OnChat", c);
    };
    CUFakeGameAPI.prototype.SendChat = function (type, to, body) { };
    CUFakeGameAPI.prototype.JoinMUC = function (room) { };
    CUFakeGameAPI.prototype.LeaveMUC = function (room) { };
    CUFakeGameAPI.prototype.Stuck = function () { };
    CUFakeGameAPI.prototype.ChangeZone = function (zoneID) { };
    Object.defineProperty(CUFakeGameAPI.prototype, "fps", {
        /* Stats */
        get: function () { return 60; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "frameTime", {
        get: function () { return 16.7; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_udpPackets", {
        get: function () { return 100; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_udpBytes", {
        get: function () { return 1000; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_tcpMessages", {
        get: function () { return 10; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_tcpBytes", {
        get: function () { return 3000; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_players_updateBits", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_players_updateCount", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_players_newCount", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_players_newBits", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "netstats_lag", {
        get: function () {
            return 125;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "particlesRenderedCount", {
        get: function () {
            return this.rand(10000);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "speed", {
        get: function () {
            return 0; // stopped
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "locationX", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "locationY", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "location", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "characters", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "terrain", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CUFakeGameAPI.prototype, "perfHUD", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    /* Console */
    CUFakeGameAPI.prototype.OnConsoleText = function (c) { };
    CUFakeGameAPI.prototype.ConsoleCommand = function (body) { };
    /* Login */
    CUFakeGameAPI.prototype.Connect = function (host, port, character, webAPIHost) { };
    return CUFakeGameAPI;
})();
if (typeof cuAPI === "undefined") {
    window["cuAPI"] = new CUFakeGameAPI();
    window.addEventListener("load", function () { document.body.style.background = '#808080 url("../cu/fake-cuAPI.jpg") no-repeat fixed center'; });
}
