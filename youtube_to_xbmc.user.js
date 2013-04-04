// ==UserScript==
// @name            YouTube » XBMC
// @namespace       http://userscripts.org/users/53793/scripts
// @description     Play YouTube videos on your XBMC
// @include         *youtube.tld/*
// @include         file:///home/john/Work/youtube-xbmc-js/*
// @version         1.0.2
// @date            2012-07-11
// @author          xlotlu
// @updateURL       http://userscripts.org/scripts/source/136934.meta.js
// ==/UserScript==

(function () {

// the script will stop the currently playing video on youtube
// when something is sent to XBMC.
// if you don't want this behaviour, change this to false:
var stop_on_play = true;

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

var play_button_id = 'xbmc-play-button';
var play_button_text = 'Play in XBMC';

var ACTIONS = {
    add:        {
                    action: video_add,
                    caption: 'Enqueue'
                },
    insert:     {
                    action: video_insert,
                    caption: 'Play next'
                },
    play:       {
                    action: video_play,
                    caption: 'Play now'
                },
    replace:    {
                    action: video_replace,
                    caption: 'Replace playlist'
                }
};

var DEFAULT_ACTION = 'add';


function stop_playing() {
    var player;
    try {
        player = unsafeWindow.yt.player.playerReferences_.player1.api;
    } catch(err) {
        return;
    }

    if (player && player.stopVideo) player.stopVideo();
}

function get_video_id(url) {
    var match = url.match(/\bv=([\w-]+)/);
    return match ? match[1] : null;
}

var debug = true;
function status(type, response) {
    if (debug) {
        console.log(type, JSON.parse(response.responseText));
    }
}

function play(video_id) {
    var url = 'plugin://plugin.video.youtube/?path=/root/video&action=play_video&videoid=' + video_id;

    var command =  {
        jsonrpc: "2.0",
        method: "Player.Open",
        params: {
            item: {
                file: url
            }
        },
        id : 1
    };
    /*
    var command = [{
        jsonrpc: "2.0",
        method: "Playlist.Add",
        params: {
            item: {
                file: url
            },
            playlistid: 1
        },
        id: 1
    },
    {
        jsonrpc: "2.0",
        method: "Player.Open",
        params: {
            item: {
                playlistid: 1,
                position: 0
            }
        },
        id : 2
    }];
    */

    var details = {
        method : 'POST',
        url : 'http://' + xbmc_address + '/jsonrpc',
        headers : {'Content-Type': 'application/json'},
        data : JSON.stringify(command),
        onabort : function (response){ status("onabort", response) },
        onerror : function (response){ status("onerror", response) },
        onload : function (response){ status("onload", response) },
        onprogress : function (response){ status("onprogress", response) },
        onreadystatechange : function (response){ status("onreadystatechange", response) },
        ontimeout  : function (response){ status("ontimeout", response) }
    };

    console.log(GM_xmlhttpRequest(details));
}


function send(command, parameters, callback) {
    if (!parameters) parameters = {}

    var request = {
        method : 'POST',
        url : 'http://' + xbmc_address + '/jsonrpc',
        headers : {'Content-Type': 'application/json'},
        data : JSON.stringify({
            jsonrpc: "2.0",
            method: command,
            params: parameters
        }),
        "id": 1
    };
    if (callback) request.onload = callback;

    GM_xmlhttpRequest(request);
}


//setTimeout(function(){ get_status() } , 20);

function get_status(continue_with) {
    if (continue_with) 
    send("Player.GetProperties", {
        "playerid": 1,
        "properties": ["playlistid", "position", "speed"]
    }, function(outside_data) {
        return function(response) {
            console.log(response);
            console.log(outside_data);
        }
    }('something something')
    )
    // returns either
    // "error": {
    //     "code": -32100,
    //     "message": "Failed to execute method."
    // },
    // or
    // "result": {
    //     "playlistid": 1,
    //     "position": 0,
    //     "speed": 1
    // }
}

function play() {
    get_status()
}
function _play(video, something) {

}

function video_play() {
    // get_info;
    // on return, batch:
    //      insert at some position
    //      open playlist or advance
    //
    // find current position, if any!
    // send:
    //   "Playlist.Insert",
    //   {
    //       "item": {
    //           "file": $X
    //       },
    //       "playlistid": 1,
    //       "position": $Y
    //   }
    // if not playing,
    // Player.Open "playlistid": 1
    // else,
    // Player.GoNext "playerid": 1
}

function video_add() {
    // get_info;
    // on return open playlist or nothing
    // 
    // send:
    //   "Playlist.Add",
    //   {
    //       "playlistid": 1
    //       "item": {
    //           "file": $X
    //       }
    //   }
    // if not playing,
    // Player.Open "playlistid": 1
}

function video_insert() {
    // get_info;
    // on return, either insert, or batch:
    //      insert
    //      open playlist
    //
    // same as play,
    // Player.Open if not playing,
    // else do nothing
}

function video_replace() {
    // batch:
    //      stop
    //      clear playlist
    //      insert into playlist
    //      open playlist
    //
    // Playlist.Clear "playlistid": 1
    // then all the stuff from play
}


/*
Going playlisty:

# xbmc() { curl -s -H 'Content-Type: application/json' -d '{"id": 1, "jsonrpc": "2.0", "method": "'"$1"'", "params": {'"$2"'}}'  http://xbmc:none@localhost:8080/jsonrpc | python -mjson.tool | pygmentize -l json; }

»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Player.GetActivePlayers",
    "params": {}
}

«««
// if there is no active player:
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": []
}
// else
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": [
        {
            "playerid": 1,
            "type": "video"
        }
    ]
}


»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Player.GetProperties",
    "params": {
        "playerid": 1,
        "properties": [
            "playlistid",
            "position",
            "speed"
        ]
    }
}

«««
// if the above said there's no player:
{
    "error": {
        "code": -32100,
        "message": "Failed to execute method."
    },
    "id": 1,
    "jsonrpc": "2.0"
}
// else:
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": {
        // playlistid 1 is the video playlist,
        // it will always be the one playing if a video is playing.
        "playlistid": 1,
        // when position is -1, a single video is playing,
        // NOT the video playlist (id 1).
        // NB: normal playlist positions start from 0.
        "position": -1,
        // speed 0: video stopped,
        // speed 1: running
        "speed": 0
    }
}


The user can:

1. Add to playlist.
Default action. The item is appended.

»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Playlist.Add",
    "params": {
        "playlistid": 1
        "item": {
            "file": "..."
        }
    }
}

2. Enqueue.
Must find another name. The item is inserted after the now-playing.
(i.e. the position result from above)

»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Playlist.Insert",
    "params": {
        "item": {
            "file": "..."
        },
        "playlistid": 1,
        "position": 1
    }
}

3. Play.
Gets inserted as above, but also:

»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Player.GoNext",
    "params": {
        "playerid": 1
    }
}


We'll need to decide when to Player.Open "playlistid": 1 at what position.


This might be needed:

»»»
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "Playlist.GetItems",
    "params": {
        "playlistid": 1
    }
}

«««
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": {
        "items": [
            {
                "label": "something something",
                "type": "movie"
            },
            {
                "label": "",
                "type": "unknown"
            }
        ],
        "limits": {
            "end": 2,
            "start": 0,
            "total": 2
        }
    }
}

*/


// part 1: are we on a listing page?
var thumbs = document.getElementsByClassName('ux-thumb-wrap');
// !!! forget about the old code
if (false && thumbs.length) {
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

        target.addEventListener('mouseenter', function() {
            var our_button = document.getElementById(play_button_id);
            //this._thumb.appendChild(our_button);
            our_button.style.display = 'block';
        }, false);
        target.addEventListener('mouseleave', function() {
            //var our_button = document.getElementById(play_button_id);
            our_button.style.display = 'none';
            // place it back on body, one never knows when its ancestors go away
            document.body.appendChild(our_button);
        }, false);
    }

    // create a play button,
    var _label = document.createElement('span');
    _label.setAttribute('class', 'addto-label');
    _label.appendChild(document.createTextNode(play_button_text));

    var _empty = document.createElement('img');
    _empty.setAttribute('src', '//s.ytimg.com/yt/img/pixel.gif');

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', 'yt-uix-button-content');
    _wrapper.appendChild(_label);
    _wrapper.appendChild(_empty);

    var play_button = document.createElement('button');
    play_button.setAttribute('id', play_button_id);
    play_button.setAttribute('class', 'addto-button video-actions yt-uix-button yt-uix-button-default yt-uix-tooltip');
    play_button.setAttribute('title', play_button_text);
    play_button.setAttribute('type', 'button');
    play_button.setAttribute('role', 'button');
    play_button.appendChild(_wrapper);
    play_button.addEventListener('click', function(event) {
        play(this.parentNode._video_id);
        if (stop_on_play) stop_playing();
        event.preventDefault();
    }, false);

    // add it to the dom,
    document.body.appendChild(play_button);

    // and style it.
    var play_button_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAANCAMAAAA3+nb4AAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH3AYYEjUdbVAlVQAAAWtQTFRFAAAAAAAAgICAZmZmbW1tgICAeHh4cXFxeXl5c3NzeXl5dHR0dXV1enp6dnZ2e3t7dnZ2e3t7d3d3eHh4eHh4dXV1eHh4dXV1eXl5eXl5d3d3dXV1eHh4dnZ2dnZ2eXl5d3d3eHh4eHh4eHh4dXV1d3d3dnZ2eHh4d3d3d3d3d3d3dnZ2eHh4dnZ2dnZ2eHh4d3d3d3d3dnZ2dnZ2eHh4d3d3eHh4d3d3d3d3dnZ2d3d3eHh4eHh4d3d3dnZ2d3d3d3d3eHh4d3d3d3d3dnZ2d3d3eHh4eHh4d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3eHh4d3d3d3d3d3d3d3d3d3d3d3d3dnZ2d3d3d3d3dnZ2d3d3d3d3d3d3d3d3d3d3d3d3d3d3eHh4dnZ2d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3////FH5oRAAAAHd0Uk5TAAEEBQcIERITFBUWGBkaGxwdHiAiIyQlKCotMjM0ODk8QEJITE1OVVhaXF9gYWNmaWtsbnFyc3R4eX6ChIWMjZKTlJaXnaKkpaepq6yur7CxsrS2vL7BxMnMzc/Q0tbZ3N/g4uPm5+rr7O3u7/Dx9fb3+vv8/f7hrx9bAAAAAWJLR0R41tvkRgAAAR9JREFUGBm1wVVTQlEARtFtY2NfRRFbwu7uLuwWW1DA9vv7Hri+OT7ojGvxByu5/JIiXr7p6+dnkoL5JGVbZakYRdbaudtdRIKjAiOnBCOlwl0DyIj6SfBJTwNpgw/6eJNxbFG5J916XIfSWRVtd9IkoKRtJ0al71inz3MNzuiyu3Y0flIeDvX0XD+9HARG4qE+rTeXYch25SDBkjohR73ArDYfCyCgy3SYkFaxKWnbSVKe7lPAJT8wrMdpoFrdgE+qwyYj6ufLvFQAluYgK3KkDqBJHmBI6scmKZhPQkbraOh9XuFxb9qudmZi4Ta5gHZlA5ORi9elrmIMRbzYpmJXGy5aDu5jjZmL4ZuFwsAYRuk+Rv2ycyuuE4yVXP7ZJ53fTRntiH0qAAAAAElFTkSuQmCC';

    GM_addStyle('#' + play_button_id  +' { position: absolute; left: 2px; bottom: 2px; display: none; width: 58px; }');
    GM_addStyle('#' + play_button_id  +' img { width: 56px; height: 13px; background: url("' + play_button_image + '") no-repeat; }');
}


// part 2: are we on a video page?
var video_id = get_video_id(window.location.href);
// !! forget about the old code
if (false && video_id) {
    var _empty = document.createElement('img');
    _empty.setAttribute('src', '//s.ytimg.com/yt/img/pixel.gif');
    _empty.setAttribute('class', 'yt-uix-button-icon');

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', 'yt-uix-button-wrapper');
    _wrapper.appendChild(_empty);

    var large_play_button = document.createElement('button');
    large_play_button.setAttribute('id', play_button_id + '-large');
    large_play_button.setAttribute('class', 'yt-uix-button yt-uix-button-default yt-uix-button-empty yt-uix-tooltip yt-uix-tooltip-reverse');
    large_play_button.setAttribute('title', play_button_text);
    large_play_button.setAttribute('role', 'button');
    large_play_button.setAttribute('type', 'button');
    large_play_button.appendChild(_wrapper);
    large_play_button.addEventListener('click', function(event){
        play(video_id);
        if (stop_on_play) stop_playing();
    }, false);

    // where oh where should we add it?
    var container = document.getElementById('watch-actions');
    if (!container) {
        container = document.body;
        GM_addStyle('#' + play_button_id + '-large { position: fixed; right: 10px; bottom: 10px; }');
    }
    container.appendChild(large_play_button);
}

// the end

var PIXEL_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
var BUTTONS_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABHCAQAAAAqh4ScAAANE0lEQVR42u1be2wU1Rrf0gKppSDlKS3QPVMLFwgpKkgUbdUI9IaLds+uARRB9ILeYHJ5dM6UNrAmGlPRVmI0VyE3Sgh/NPzR+CJQpSU2aeOjtvgirTGCNZSgsEhbkZb+7jdnZ6dLH7szpYPrzZ7Jbs8385vvzPnN9zjz7dTlire/ZvOWxjZuWJovx3u0YIIzujn4W/4RsYsbHivxcXjWOkYgeIVvVKzi7E1mgafGU8MrPbt84yRxd/Ey72Ha00yDtfJG3ug9zIv/cZOBnust59V8v/dRXSrI5s/xKn7Iu8mVoMtrxntK+Hv8SzrHF3Ui4EfWpliYcB9ccF9kHO/mnfwnb7kvOZo+r5+vc7k8673+IRP46Fj+kaG4+eFMz17eI/vf8hb6/o0H6KPLJ3V3Jnq6qH9V3+N5nW/g7SHJ+74rwZvvOUf9Ln6W7+t76QNOBLxuzXi7uAgEmriQ7N0eGUf0gXeQr3UQtg+F8pi5RSWYL+P1kjCiwpvvS6Q9tRzBGFhwP6+jY2XeTfTd5F21MtWznp8J0srXrUzlq/kpIvQFfokI3GolboZd2gnPLdZx4VMKJ7EvzpfmW8RfIakhsj6aR4chd3jW9wtifsv0SfhSCW7SyZNyG79wzbEG/ivv8s0yLqWM9vTwOwxpZ3Agz5M2YmBoq7KOs0CgqY8oBD8dbVw90kuKBgw5QQotuvdD06WqvxvDJ1P/q9Cxgskk6S79tnkpj5BU2Yf81hD5f7YFyhmkkdR5PRYYpNBydKTkoNvQmqCUP5qky6FI5tlF0jH6bDQvZSNhVVNaLS/ij2hJ4UbFwMHcz04MtJtINsv0QDQ9rBiD6Ra3c22Kb5R3FSWL8/wgDZLXuyQl6aGQJAnWt+d9Y2wQ6FgWHsz9HMjCvnS+h9KHbsinKJGclVn1M/7m6oneFbQYAD8vM+tFXy4/5m3rpYe/SCnmbyaBJYR5SeIDvNq7Iy8pFtZ3/d3PgXUgr+ABoqiWF+vuunIa30/rvwAPeB8ncnM9n/CL/HvPO750Qn5YsDyM+Dm8vvdCOOO1BRO89/DjwUWPb0n8SST+LBxv8RZvgzVWGtu4YWmZOezobIfKWQzKW64RsYsblub2MbjXOkUgTaVi7qhYxdlqWQuUGqXGXcl2MVnOUu5iZe7DSg1rpuFaWSNrdB92F08zyllZc1m5u1rZz2Q5i2Wz51gVO6QY5awZ45US9h77ks7xRZsIbUempESfcF9ccF9kHOtmnewnVp6RHE0f8yu0kFbWs6E/h2SNZR8ZipszM5W9rEfep29ZC/39jQXoox87qbsz0dNF/atyz+tsA2s3pfddCUo+O0e9LnaW7ctItkAMlLoZ4+3iIhBo4kKye3sUnJ+kDvK1Dvrbh0J5rHeLRnDmMlYvCSMqlHxXIimoZQjGQOV+pY72lymb6LtJWTUrle7YmSCtyrpZqWw1O0UX9QK7RARutRI3wy7sxMxbrOOumRIGx2WkuRexV4jAhsj6aB4dhtyh9CsmhFFoxT7dSyW0yWVUVFgbuxB+zN3AfmVdbqOcxcoI28OMchbbadzxJ63HQHOrso6zQKCpjygEOx1tXD3SyysfMOQYFFpzb2W6BBvlrIxk6pvlLGUyWRi5tNssZ7kfIamyD/mtrkTbBDpigXIGaSR1Xo8FGhRajY6sXCoyyllZo6l/ORTJKMGAHSMSzXKWspEks5xFTqyf+8eUFHsEOhUDB3M/OzHQZiJxb5bpgWjKMspZMonsnJIyd5SyipLFeXaQISuvd0lKklnOkgTrF/b83DE2CHQsCw/mfg5k4ex09x5KH/odOEWJ5KzMqp+538yeyFbQYgBEnJ5ZL2bmkgW29dLDXmSYaZazKDvD/ZLEB9zV7qjlrBuzvuvvfg6sA5UKWqicY7XuYt1dp0+jFV4z7Qkoj1NmzmWfsIvse/c72ek0+IdKWDkraw6r772QbMZqZ09w38OOG4ueJfEnkfizcLzFW7wN1lAa27jhmWQOjsKhchaAtzAidnHDM0kfDbfWMQKBCoyKVZy9ySxADW2V2AVZzsJdKMNh2tNMg7WikbbDKIZRzsJclKMa+yHLWcjGc6jCIWyCLGdhPErwHr6kc3xRJwIcQYqFCffBBXdFxqEbnfiJrjQ5mj74QQtprMfQn0MwFh8ZipuRib3okf1v0ULfvyFAH72d1N2Z6Omi/lW553VsQLspvY8E5OMc9bpwFvuQbIEYoA7j7eIiEGjiTHl7FJyf+h3kax30tw+F8lhvi0YwlqFeEqZTkY9E2lNLfRkDcT8NCLLLTfTdhFVIpTt2xqB1HUmrcYr6L+ASEbjVStwMu7ATuMU67popIQIuDYvwCkkNUfStl9RB0tivmBBGoRX7xFIJbYJRUUEbLlxzrAG/knUZ5SyiE2SrRjkLO42BnrQRA0OtyjrOAoGmPqIQOB1tXBnp9TZgyDEotObemC7BRjkLydQ3y1mYTJLu0mY5C4+QVNmH/FYk2ibQEQuU+9JI6rweCzQotBodKeTqzShnYTT1L4ciGSUY4Bh9zHIWNpJklrPIifX2B1JsEuhQDBzM/ezEQLuJZLNMDzpNRjlLWtxOpGAURb12nMdBkvN6l6QkmeUsSbDenscYGwQ6loUHcz8HsjDSsYfSh34HTlEiOSuz6md4ExOxghYDIOL0zHoRuURtWy89eJH2muUsys7ASxIfoEXODiTFwvquv/s5sA4kdQGiqJZWeuSumEYrvGbaE8DjJOXiE6Lue7yDdJI+RFg5C3OIdvNCwEjDBNyD48aiZ0n8SST+LBxv8fbXbc+Odla/KI1t3HU3zS/ecJRAqHut/EvEn4Wz1bbP1/LURX6j2uK/SVuo5Ykj4py2nLaFW8yigJpRdLcYF+xvSSu6u3CqSXem+oC2XJ1lh0DaDvlH2ccJTWiRceo0sVU8s2OeFX2FOS5X0SQ14/qsYbdUe1k8o6aKV0UX9a/QBmP7pYge7sQM9QMpXRVlO6aId0WPLml7XAmFt4rj8sh57XabBEJU+cfYxelyZJy6OCipT0TTR352pehOcVS09KfQP0Z7TXs7uIl9USjeMU97SrSQ4pPigigvzN02UQTEocKcwhyhijYR0DLFd6JN3aUVSLIui59FicbVWqKwUD2t/agVagvsRU3z9tRvSbOOE6WiPij1jWXhODVV9YoS0S0aIusjX6uhXid92tWVA2DvFe0S260+amFKhSskWD6cFU2i+1dkugzUA/R5QLr7ZGl7cplcPD1ok9vnDyUGmluFdZyoNKXKaPrED+JMNH3PjhbfSFv1DsJJruiwSB+Z80JS9Z1x4m3U/6cx5GPUbxF15iW0imqz/wvZYM3QkohzFkjuN5bc+HNxRV2sZQ7dAmU8vU+ssTqlo7qyjSOlBc6h/n/1ni9RfC3O0334jxEZkkQXRb5gIkmW1hjwJw2ZQEdioH7V2gEp94tt1mOg5bZxpFimbdGaiIyPSXWj9nTRna4Eun/d6kFtG8W+Hm0DGfm/gujidOpvNuxUkbYJ0aBtUO8YAoEOZWGTwgFoGfYs7B8hnaJL1IklZG27xSWZXZdumymqpX2dUB+kSPBp72JGfKEtD52rfqU+qL4sfpfnrI6tdaAvsWjSDVgH+hILpxZODbvDCdsnF04N0iXG/fvmAZ5KEoJuHqRQ7/uTtKyi2dsmxp9E4i3eYqde53Ax4f++Hgg/HC0mANhr5Re8PwtnbzLzkYdF5qsbN2EhyUdwDstpW9j7hgEycDeMYgLSqG8WE5CJBwg7yxaBwCGLv3Vcg4MGLTIO07AVz2CeFX2gZQwm4fqKCdgt1V6mQVPxqvxt7gptofaL/ksxZuADKV1FGabgXeP1jz1IwK04LvvncbtNAoGqaL/h9cf1/0WuLw6LDemJaPrIz67gThxFS38KMQav4W1j2xeFYszDU/JHzJO4gHLkYiICdJ9yaFPRRv1MfEd/d6FAknUZP6MEXL76UYjT+JG+F9iLmubtqUeadRxK5esnulQ6OI7MwEvX142GyPrI12r0n97p044BHuVwr3zzB6TJytMwVkiwLCaQUQNFpssAB+gjiwmYLG1PFhOMNxmuYv6QYmCoVVjHodKUKqPpww84E1XfaHwj+4MUE8iUOizSR+CFpMgoJuA26hvFBDwmX+owiwlohVlMIPcGaoaYRByzQPmawGJ8Tu65GJlDt0CJvw9WiwkUCXRl8ikDc6gviwlIxNcU3TpgFBOQRDHSKCYgWVpjAElDJtCRGCiv+oCU+8U26zHQ+lRGYhm2oInI+JhUN+JpUplA968bB7GNYl8PNtB+o5iAdOobxQQoxgtHDYS4YwgEOpSFTQoHSg3DnYUxQjpFF+qwhAbdjUtyiKWYiWppXyfwIEWCT8MWM1+E3k+gc7+ioy/jd3nOapsEOry+o9lMugHrQBpmKm29dySB0sTUIF0Yh5v7P5UQYmQY/SOlW2dhNmwVE+JvJsSbbP8DHFuXoKTz7JYAAAAASUVORK5CYII=';

GM_addStyle('\
    span.xbmc-actions>button { position: static; left: auto; top: auto; right: auto; bottom: auto; } \
    \
    span.xbmc-actions>button.xbmc-button { float: left; } \
    \
    span.xbmc-actions>button.xbmc-button>span { display: block; float: left; } \
    span.xbmc-actions>button.xbmc-button>span>img { float: left; } \
    \
    span.xbmc-actions>button.xbmc-dropdown { padding: 0 5px; } \
    \
    span.xbmc-actions>ul.yt-uix-button-menu {} \
    \
    span.xbmc-actions>button.xbmc-button>span, span.xbmc-actions>button>span>img, span.xbmc-actions>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item>img { background-image: url("' + BUTTONS_IMG + '"); background-repeat: no-repeat; } \
    \
    \
    span.xbmc-actions.small { position: absolute; left: 2px; bottom: 2px; width: 70px; } \
    span.xbmc-actions.small>button>span>img { height: 11px; } \
    \
    span.xbmc-actions.small>button.xbmc-button { width: 60px; } \
    span.xbmc-actions.small>button.xbmc-button>span { width: 56px; height: 11px; background-position: 15px -46px; } \
    span.xbmc-actions.small>button.xbmc-button>span>img { margin-left: 2px; width: 15px; } \
    span.xbmc-actions.small>button.xbmc-button.play>span>img { background-position: -60px -46px; } \
    span.xbmc-actions.small>button.xbmc-button.add>span>img { background-position: -80px -46px; } \
    span.xbmc-actions.small>button.xbmc-button.insert>span>img { background-position: -100px -46px; } \
    span.xbmc-actions.small>button.xbmc-button.replace>span>img { background-position: -120px -46px; } \
    \
    span.xbmc-actions.small>button.xbmc-dropdown { width: 14px; } \
    span.xbmc-actions.small>button.xbmc-dropdown>span>img { width: 8px; background-position: -141px -46px; } \
    \
    span.xbmc-actions.small>ul.yt-uix-button-menu {top: auto !important; bottom: 22px; left: 0 !important; padding: 3px 0; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item {padding: 3px 10px; font-size: 90%; color: #555; line-height: 13px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item:hover {color: #fff; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item>img {width: 15px; height: 13px; margin: 0 1px 0 -7px; vertical-align: text-bottom; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.play>a.yt-uix-button-menu-item>img {background-position: -60px -45px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.play>a.yt-uix-button-menu-item:hover>img {background-position: -60px -58px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.add>a.yt-uix-button-menu-item>img {background-position: -80px -45px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.add>a.yt-uix-button-menu-item:hover>img {background-position: -80px -58px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.insert>a.yt-uix-button-menu-item>img {background-position: -100px -45px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.insert>a.yt-uix-button-menu-item:hover>img {background-position: -100px -58px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.replace>a.yt-uix-button-menu-item>img {background-position: -120px -45px; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.replace>a.yt-uix-button-menu-item:hover>img {background-position: -120px -58px; } \
    \
    span.xbmc-actions.large { } \
    /* temp */ span.xbmc-actions.large { float:left; margin-top: 3px; margin-right: 10px; } \
    span.xbmc-actions.large>button>span>img { height: 15px; } \
    \
    span.xbmc-actions.large>button.xbmc-button { width: 74px; } \
    span.xbmc-actions.large>button.xbmc-button>span { width: 72px; height: 15px; background-position: 20px 0; } \
    span.xbmc-actions.large>button.xbmc-button:hover>span { background-position: 20px -15px; } \
    span.xbmc-actions.large>button.xbmc-button>span>img { margin-left: 3px; width: 17px; } \
    span.xbmc-actions.large>button.xbmc-button.play>span>img { background-position: -60px 0; } \
    span.xbmc-actions.large>button.xbmc-button.play:hover>span>img { background-position: -60px -15px; } \
    span.xbmc-actions.large>button.xbmc-button.add>span>img { background-position: -80px 0; } \
    span.xbmc-actions.large>button.xbmc-button.add:hover>span>img { background-position: -80px -15px; } \
    span.xbmc-actions.large>button.xbmc-button.insert>span>img { background-position: -100px 0; } \
    span.xbmc-actions.large>button.xbmc-button.insert:hover>span>img { background-position: -100px -15px; } \
    span.xbmc-actions.large>button.xbmc-button.replace>span>img { background-position: -120px 0; } \
    span.xbmc-actions.large>button.xbmc-button.replace:hover>span>img { background-position: -120px -15px; } \
    \
    span.xbmc-actions.large>button.xbmc-dropdown { width: 18px; } \
    span.xbmc-actions.large>button.xbmc-dropdown>span>img { width: 10px; background-position: -141px 0; } \
    span.xbmc-actions.large>button.xbmc-dropdown:hover>span>img { background-position: -141px -15px; } \
    \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item {padding: 6px 15px 5px 17px; line-height: 15px; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li>a.yt-uix-button-menu-item>img {width: 17px; height: 15px; margin: 0 1px 1px -13px; vertical-align: text-bottom; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.play>a.yt-uix-button-menu-item>img {background-position: -60px 0; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.play>a.yt-uix-button-menu-item:hover>img {background-position: -60px -30px; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.add>a.yt-uix-button-menu-item>img {background-position: -80px 0; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.add>a.yt-uix-button-menu-item:hover>img {background-position: -80px -30px; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.insert>a.yt-uix-button-menu-item>img {background-position: -100px 0; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.insert>a.yt-uix-button-menu-item:hover>img {background-position: -100px -30px; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.replace>a.yt-uix-button-menu-item>img {background-position: -120px 0; } \
    span.xbmc-actions.large>ul.yt-uix-button-menu>li.replace>a.yt-uix-button-menu-item:hover>img {background-position: -120px -30px; } \
');

var default_action = ACTIONS[DEFAULT_ACTION];
delete(ACTIONS[DEFAULT_ACTION]);

function mkButtons(large) {
    // the main container
    var actions = document.createElement('span');
    actions.setAttribute('class', 'xbmc-actions yt-uix-button-group ' + (large ? 'large' : 'video-actions small'));

    // the default action
    var _button = document.createElement('button');
    _button.setAttribute('class', 'xbmc-button start yt-uix-button yt-uix-button-default yt-uix-tooltip ' + DEFAULT_ACTION + (large ? ' yt-uix-button-empty' : ' addto-button'));
    _button.setAttribute('title', default_action.caption + ' in XBMC');
    _button.setAttribute('type', 'button');
    _button.setAttribute('role', 'button');
    _button.setAttribute('onclick', ';return false;');
    actions.appendChild(_button);

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', large ? 'yt-uix-button-wrapper' : 'yt-uix-button-content');
    _button.appendChild(_wrapper);

    if (!large) {
        var _label = document.createElement('span');
        _label.setAttribute('class', 'addto-label');
        _label.appendChild(document.createTextNode(default_action.caption + ' in XBMC'));
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

    for (var action in ACTIONS) {
        var _item = document.createElement('li');
        _item.setAttribute('role', 'menuitem');
        _item.setAttribute('class', action);
        _menu.appendChild(_item);
        
        var _wrapper = document.createElement('a');
        _wrapper.setAttribute('class', 'yt-uix-button-menu-item');
        _wrapper.href = '#xbmc-' + action;
        _wrapper.setAttribute('onclick', ';return false;');
        _item.appendChild(_wrapper);
        
        var _empty = document.createElement('img');
        _empty.setAttribute('src', PIXEL_IMG);
        _wrapper.appendChild(_empty)        
        _wrapper.appendChild(document.createTextNode(ACTIONS[action].caption));
    }

    return actions;
}

setTimeout(function(){

    var x = 3;

    if (1 & x) document.getElementById('yt-masthead-content').insertBefore(mkButtons(true), document.getElementById('masthead-upload-button-group'));
    if (2 & x) document.evaluate('/html/body/div/div[6]/div/div[2]/div/div/div[2]/div[2]/div/div/div/div/ul/li/div/div[2]/div[2]/div/div/a', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.appendChild(mkButtons(false));
}, 50);

})();

