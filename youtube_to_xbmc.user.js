// ==UserScript==
// @name            YouTube » XBMC
// @namespace       http://userscripts.org/users/53793/scripts
// @description     Play YouTube videos on your XBMC
// @include         *youtube.tld/*
// @include         file:///home/john/Work/youtube-xbmc-js/*
// @version         1.0.2
// @date            2012-07-11
// @author          xlotlu
// @homepageURL     http://userscripts.org/scripts/show/136934
// @updateURL       http://userscripts.org/scripts/source/136934.meta.js
// ==/UserScript==


(function () {


var ACTIONS = {
    add:        {
                    action: "add",
                    caption: 'Enqueue'
                },
    insert:     {
                    action: "insert",
                    caption: 'Play next'
                },
    play:       {
                    action: "play",
                    caption: 'Play now'
                },
    replace:    {
                    action: "replace",
                    caption: 'Replace playlist'
                }
};

var DEFAULT_ACTION = 'add'; // TODO: make this customisable


var xbmc_address = GM_getValue('XBMC_ADDRESS');
GM_registerMenuCommand('Modify the XBMC address', modify_xbmc_address);
if (xbmc_address === undefined) modify_xbmc_address();


function modify_xbmc_address() {
	xbmc_address = window.prompt(
        'Enter the address for the XBMC web interface\n(username:password@address:port)',
        xbmc_address
    );
	GM_setValue("XBMC_ADDRESS", xbmc_address);
}

function get_video_id(url) {
    var match = url.match(/\bv=([\w-]+)/);
    return match ? match[1] : null;
}

function xbmc_youtube_url(video_id) {
    return 'plugin://plugin.video.youtube/?path=/root/video&action=play_video&videoid=' + video_id;
}


function XBMCClient(server) {
    this.server = server;
}

XBMCClient.mkrequest = function(command) {
    var method = command[0];
    var params = command[1];
    if (params === undefined) params = {};
    return {
        "id": ++XBMCClient.mkrequest._id,
        "jsonrpc": "2.0",
        "method": method,
        "params": params
    };
};
XBMCClient.mkrequest._id = 0;

XBMCClient.PLAYLIST_ID = 1;
XBMCClient.PLAYER_ID = 1;

XBMCClient.prototype = {
    send: function(method, params, callback) {
        if (typeof method == 'object') {
            // method is a command (array), callback = params
            this._send(XBMCClient.mkrequest(method), params);
        } else {
            this._send(XBMCClient.mkrequest([method, params]), callback);
        }
    },
    
    send_batch: function(commands, callback) {
        this._send(commands.map(XBMCClient.mkrequest), callback);
    },

    _send: function(content, callback) {
        // console.log('sending:', content);
        var request = {
            method : 'POST',
            url : 'http://' + this.server + '/jsonrpc',
            headers : {'Content-Type': 'application/json'},
            data : JSON.stringify(content)
        };
        if (callback) request.onload = callback;

        GM_xmlhttpRequest(request);
    },

    get_info: function(callback) {
        var c = [
            //["Player.GetActivePlayers"],
            // playerid: 1 -- video player
            ["Player.GetProperties", {playerid: XBMCClient.PLAYER_ID, properties: ["playlistid", "position", "speed"]}],
            ["Playlist.GetProperties", {playlistid: XBMCClient.PLAYLIST_ID, properties: ["size"]}]
        ];
        this.send_batch(c, this.parse_info.bind(this, callback));
    },

    parse_info: function(callback, response) {
        if (typeof callback != 'function') return;
        if (response.status != 200) return;

        var status = {
            playing: false,
            position: -1,
            total: 0
        };

        var data = JSON.parse(response.responseText);
        //var active_players = data.shift();
        var player_properties = data.shift();
        var playlist_properties = data.shift();
         
        if (player_properties.error === undefined) {
            if (player_properties.result.playlistid == XBMCClient.PLAYLIST_ID) {
                // TODO: detect when it's paused as opposed to stopped...
                // ... and act accordingly.
                status.playing = Boolean(player_properties.result.speed);
                status.position = player_properties.result.position;
            }
        }

        status.total = playlist_properties.result.size;

        callback(status);
    },

    play: function(url) {
        console.log(this, url);
        this.get_info(this._play.bind(this, url));
    },

    _play: function(url, status) {
        // insert new video into playlist at current position + 1;
        // if already playing, advance, else open playlist.

        var c = [
            ["Playlist.Insert", {
                playlistid: XBMCClient.PLAYLIST_ID,
                position: status.position + 1,
                item: {
                    file: url
                }
            }]
        ];
        
        if (status.playing) { 
            c[c.length] = ["Player.GoTo", {
                playerid: XBMCClient.PLAYER_ID,
                to: "next"
            }];
        } else {
            c[c.length] = ["Player.Open", {
                item: {
                    playlistid: XBMCClient.PLAYLIST_ID,
                    position: status.position + 1
                }
            }];
        }

        this.send_batch(c);
    },

    add: function(url) {
        this.get_info(this._add.bind(this, url));
    },
    
    _add: function(url, status) {
        // add to playlist;
        // if not playing, play. // TODO: maybe it's a bad idea?
        
        var c = [
            ["Playlist.Add", {
                playlistid: XBMCClient.PLAYLIST_ID,
                item: {
                    file: url
                }
            }]
        ];
        
        if (!status.playing) { 
            c[c.length] = ["Player.Open", {
                item: {
                    playlistid: XBMCClient.PLAYLIST_ID
                }
            }];
        }

        this.send_batch(c);
    },

    insert: function(url) {
        this.get_info(this._insert.bind(this, url));
    },

    _insert: function(url, status) {
        // insert into playlist at position +1;
        // if not playing, play. // TODO: the same..

        var c = [
            ["Playlist.Insert", {
                playlistid: XBMCClient.PLAYLIST_ID,
                position: status.position + 1,
                item: {file: url}
            }]
        ];

        if (!status.playing) { 
            c[c.length] = ["Player.Open", {
                item: {
                    playlistid: XBMCClient.PLAYLIST_ID
                }
            }];
        }
        
        this.send_batch(c);
    },

    replace: function(url) {
        // clear playlist; add; play.
        // this one needs no wrapping.
        
        var c = [
            ["Playlist.Clear", {
                playlistid: XBMCClient.PLAYLIST_ID
            }],
            ["Playlist.Add", {
                playlistid: XBMCClient.PLAYLIST_ID,
                item: {
                    file: url
                }
            }],
            ["Player.Open", {
                item: {
                    playlistid: XBMCClient.PLAYLIST_ID
                }
            }]
        ];
        
        this.send_batch(c);
    }
};


// the pretty stuff
GM_addStyle('');

// we'll be using this globally:
var xbmc_client = new XBMCClient(xbmc_address);

// if we're on a listing page:
var thumbs = document.getElementsByClassName('ux-thumb-wrap');
if (thumbs.length) addToThumbs(thumbs);

// if on a video page:
var video_id = get_video_id(window.location.href);
if (video_id) addToPage(video_id);


// the hands on stuff
function mkButtons(large) {
    var PIXEL_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    if (!this.default_action) {
        this.default_action = ACTIONS[DEFAULT_ACTION];
        delete(ACTIONS[DEFAULT_ACTION]);
    }

    // the main container
    var actions = document.createElement('span');
    actions.setAttribute('class', 'xbmc-actions yt-uix-button-group ' + (large ? 'large' : 'video-actions small'));

    // the default action
    var _button = document.createElement('button');
    _button.setAttribute('class', 'xbmc-button start yt-uix-button yt-uix-button-default yt-uix-tooltip ' + DEFAULT_ACTION + (large ? ' yt-uix-button-empty' : ' addto-button'));
    _button.setAttribute('title', this.default_action.caption + ' in XBMC');
    _button.setAttribute('type', 'button');
    _button.setAttribute('role', 'button');
    _button.setAttribute('onclick', ';return false;');
    actions.appendChild(_button);

    // doing what?
    _button._action = xbmc_client[this.default_action.action];
    _button.addEventListener('click', function(event) {
        this._action.bind(xbmc_client)(xbmc_youtube_url(this.parentNode._video_id));
        event.preventDefault();
    }, false);

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', large ? 'yt-uix-button-wrapper' : 'yt-uix-button-content');
    _button.appendChild(_wrapper);

    if (!large) {
        var _label = document.createElement('span');
        _label.setAttribute('class', 'addto-label');
        _label.appendChild(document.createTextNode(this.default_action.caption + ' in XBMC'));
        _wrapper.appendChild(_label);
    }

    var _empty = document.createElement('img');
    _empty.setAttribute('src', PIXEL_IMG);
    if (large) _empty.setAttribute('class', 'yt-uix-button-icon');
    _wrapper.appendChild(_empty);

    // the dropdown button
    var _dropdown = document.createElement('button');
    _dropdown.setAttribute('class', 'xbmc-dropdown end yt-uix-button yt-uix-button-default ' + (large ? 'yt-uix-button-empty' : 'addto-button'));
    _dropdown.setAttribute('type', 'button');
    _dropdown.setAttribute('role', 'button');
    _dropdown.setAttribute('onclick', ';return false;');
    _dropdown.setAttribute('data-button-has-sibling-menu', 'true');
    _dropdown.setAttribute('aria-haspopup', 'true');
    actions.appendChild(_dropdown);

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', large ? 'yt-uix-button-wrapper' : 'yt-uix-button-content');
    _dropdown.appendChild(_wrapper);

    var _empty = document.createElement('img');
    _empty.setAttribute('src', PIXEL_IMG);
    if (large) _empty.setAttribute('class', 'yt-uix-button-icon');
    _wrapper.appendChild(_empty)

    // the dropdown menu
    var _menu = document.createElement('ul');
    _menu.setAttribute('class', 'yt-uix-button-menu yt-uix-button-menu-default');
    _menu.setAttribute('style', 'display: none;');
    _menu.setAttribute('role', 'menu');
    _menu.setAttribute('aria-haspopup', 'true');
    _dropdown.appendChild(_menu);

    var clickAction = function(event) {
        this._action.bind(xbmc_client)(xbmc_youtube_url(this.parentNode.parentNode.parentNode._video_id));
        event.preventDefault();
    };

    for (var action in ACTIONS) {
        var _item = document.createElement('li');
        _item.setAttribute('role', 'menuitem');
        _item.setAttribute('class', action);
        _menu.appendChild(_item);
        
        var _action = document.createElement('a');
        _action.setAttribute('class', 'yt-uix-button-menu-item');
        _action.href = '#xbmc-' + action;
        _action.setAttribute('onclick', ';return false;');
        _item.appendChild(_action);
        
        var _empty = document.createElement('img');
        _empty.setAttribute('src', PIXEL_IMG);
        _action.appendChild(_empty);
        _action.appendChild(document.createTextNode(ACTIONS[action].caption));
        
        // actually doing something
        _action._action = xbmc_client[ACTIONS[action].action];
        _action.addEventListener('click', clickAction, false);
    }

    return actions;
}


function addToThumbs(thumbs) {
    var buttons = mkButtons(false);
    document.body.appendChild(buttons);

    var mouseEnterAction = function() {
        if(hasClass(this._thumb.getElementsByClassName('video-thumb')[0], 'yt-thumb-default-120')) {
            addClass(buttons, 'crowded');
        }
        buttons._video_id = this._thumb._video_id;
        this._thumb.appendChild(buttons);
    };

    var mouseLeaveAction = function() {
        removeClass(buttons, 'crowded');
        document.body.appendChild(buttons);
    };
    
    // do the stuff
    for (var i=0, j=thumbs.length; i<j; i++) {
        var elem = thumbs[i];

        // let's find the parent link
        var link = null;
        // but remember the thumbnail object for later
        var thumb = elem;

        // stop after let's say... 5 times
        var _iterating = 5;
        while (!link && _iterating-- && elem != document) {
            if (elem.tagName.toLowerCase() == 'a') link = elem;
            else elem = elem.parentNode;
        }

        if (!link) continue;
        var href = link.getAttribute('href');
        if (!href) continue;
        var video_id = get_video_id(href);
        if (!video_id) continue;

        // set it for later usage
        thumb._video_id = video_id;
        
        // and make the elem display the button on mouseover
        var target = link;
        // TODO: find the real target depending on where you are around youtube
        
        target._thumb = thumb;

        target.addEventListener('mouseenter', mouseEnterAction, false);
        target.addEventListener('mouseleave', mouseLeaveAction, false);
    }
}

function addToPage(video_id) {
    var buttons = mkButtons(true);
    buttons._video_id = video_id;
    
    var container = document.getElementById('watch7-action-buttons');
    if (container) {
        addClass(buttons, 'inline');
        var elems = buttons.childNodes;
        for (var i=0, j=elems.length; i<j; i++) {
            removeClass(elems[i], 'yt-uix-button-default');
            addClass(elems[i], 'yt-uix-button-text');
        }
        container.appendChild(buttons);
    } else {
        addClass(buttons, 'fixed');
        addClass(buttons.children[0], 'yt-uix-tooltip-reverse');
        document.body.appendChild(buttons);
    }
}


//utils

function hasClass(obj, cls) {
    var re = new RegExp('\\b' + cls + '\\b');
    return (obj.className.search(re) != -1);
}

function addClass(obj, cls) {
    if (!hasClass(obj, cls)) obj.className = obj.className + ' ' + cls;
}

function removeClass(obj, cls) {
    var re = new RegExp('\\b' + cls + '\\b');
    obj.className.replace(re, '');
}


})();

/* jshint -W043 */

