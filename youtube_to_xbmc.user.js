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
    play:       {
                    action: video_play,
                    caption: 'Play now'
                },
    insert:     {
                    action: video_insert,
                    caption: 'Play next'
                },
    replace:    {
                    action: video_replace,
                    caption: 'Replace playlist'
                }
}


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

    var play_button_image_large = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAeCAQAAADXj8WDAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH3AYYEwIXHEAGSAAAAAJiS0dEAP+Hj8y/AAAEBElEQVRIx+VVTWhUSRB+MuCqiYyBhcCicbo6kwQ9iiK65yy7bDZrV7/DCoEoghuiiCB7kMVDcjCX4E0wiImjDEoEL0ZIQDOoh80GMaKIB3/An2BGzMYElEHN8+t+P77MxDCiJId9xQz9VXV3VVdX1+c4S/Px+T++X3ynHk+oHV+yQnfqw1/vFKLO7qwqe8UAz7iJb+AUMq5/LbK0qRwPc0a1GOQmeLc6xVehm8bsMcgo9/JP/lw3offwOX1Fdbg1BqlWdRpru9XaIDuK+zB/jM/MdWqk101+cqq286NAn+EGLDCj93wZ/+94ClKwOfrbcZrX8W1rnWVPP9eNfC1EPKk2u5V6yOLXKqe2ljr1+GkYe3CCldzGeehn+C13cdpxdtRh435rS+pD/AauG/gWdMfceoyy/j4xdENfMmG7m+ZLbyiz/EtRmo+HJ7KoCehoZBsEOhGG4Tg7q/hDMYL86yyb/07nPalN837o8z9/F8w/ANQere4GuoNfQ6S5V4I83fy5Qiq50yDBy/k+LIXWFcH8dqAef9xSoV/gLHmejO03zv/F0ITdd1/Z1WutaRSRbz/SUhGUl8fP3B8xWm9tffj9E85vWgU0GgWcDNbedDeU9U71Nt2PijUVeFHvsnfzSl3Xe00Ps2seWN2gu8UEFLmpRGVnQ2Tv9ALfNZWiRhBeesGO9PsafohH8YQH/PvQjXoIqZxSL1tX4E12IuXT2OZPZxkKK+vnIKiADvVX7EhdfPC31dzDj22gJ5ey9/5/Pnm+bvHTSx5NyC+iNtEpDn+9UyNna8qmNhqgGSfxLZx6NE5FzYHaZE4My4yw1OYkaDedoqsyR9OYPQYZpd5U2DQTYo84R1dEB9UYJFvFaTFM3bUBtZESfZg/RmfmOjXSS7E2KLfTI18vM6kGLDDj93QZ/+9oClKwNhCBXEe3rXUW+LlopGshoknavLGShix+LXOpraVOPXqamtPw166kNspDP0NvqYvQUagOyLIIJcUhekMFBHQLumOiHqNssM8ndIMumbDlpvnSG8osFVEbHQ9PZMuoCSiiNhqE5UQYhuPUVNGHEuRRMbUtfFKb5v3Q52sDaqMD5ImI2qgbtjvkpSIyk/eKEXm1zZ8rpJI79b+Ny+k+LIVUQG2iHWcLqK26gl7gLHmKURsKMkZtNGH2FfvKrl5rTctMYD9SXRGUl0fPCNQm1hub7AOOqO2HVUARtVEyWHuzdkNZ71Ruo35UrKnAi7TL3s0rui73mh5mVzywukGxxQQU5aUSlR1Rm73TC3TXVsoIHk16wY6UWiMe4lE8oQH/PvAMhpDKKXqJNCdEJ1I+TSMEakNhZatj1CY6ZIzaUPEH61fLHnpsAz25lL138b+PxXZ8IaD1z58AAAAASUVORK5CYII=';

    GM_addStyle('#' + play_button_id + '-large img { width: 58px; height: 15px; background: url("' + play_button_image_large + '") no-repeat top; }');
    GM_addStyle('#' + play_button_id + '-large:hover img { background-position: bottom; }'); 
}

// the end

var PIXEL_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
var BUTTONS_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABHCAQAAAAqh4ScAAAAAnNCSVQICFXsRgQAAAAJcEhZcwAADdcAAA3XAUIom3gAAAAZdEVYdFNvZnR3YXJlAHd3dy5pbmtzY2FwZS5vcmeb7jwaAAANN0lEQVR42u2bbWxUx7nHx5gXGTAU8xpeEu9zXOCGKII2EJSQmiYKLxE3qffZjSCU4JJeaK5S6fLinWOw8EZKlJI0dlGVq5uAqgRFfEB8QA0NAlIwiiWsJnUMaQPCUVUIESAnZgHbJdj4dz/s8bHx2+4aNvhe+cwHPN6/Z+b8duaZZ/7nYDAD5XbKXes4tK1/6+4IwPDs0KGCsekBqOg70UH9V3dHAIbCSnBV2gCie8JD+6suJYA6J1gRrNB9wdLwaAwm9IiWhQ4EK/SMoue1RmtCB3TLvw/3hjArVK5HdVdoJQZTMF1f1sO6N7TOZGAwz40JlugH+pnWhMIJbwQ9uGpEEjfcSRf/Xe86bdEm/SpUHs5K1F4oqqsxwcJQtM8AV47Sj7yGz/wsN7hDWxVFv9BaRa9qTK8qip4uGIsJlmizojcVJfiWrtGGtlpov8kILQ3WKdqsl3Rn56F3eyPo8efGpKrrBaCva6uHNvWuC0UVbQyFtVHpjDAU9dV0/bTLEtbFWqXoVSW0P7Q0nInRSiUeAwse1+OKloXWKXoitPzp7GChXohj1dVPZ+sKPasEX9VrwTrdkEzc7DC0k8F7ktd1vKWOEDvrwjnhefqmotW9txcs1Eav3hgs7BLEor3j6xQDQ4sURU+EM736Rb18y2fV+q02h2d4QylTtFUf8mpb4x0FX0ghBraVw8nrkgDotxeep+i5RP2Gwh6ibkNOHGHPy/uWyjPTFEWf8rrPUvTzts8KJihaq+i7/lCeVXRfJ/jn2+Df7RmIwYRzFG26nRkYR9hbdLxVWq4owefitaXDFL3eFsmCpYoeUXStP5S1SjDi11Yoin6XaFP4vmJgT8svlRiYUhqzcpS+pM2Kokd+5nid1Sq6ddWI8NDQcm3Qet2thBa2p6RK6Jm2WrDUG9gr4ZEpAEzbLtzT8kvDLhyeotu1ShsVPauL9ZKiN/UTfXvFuNAybVG0Plin6JVwvh4JXWzHo68pBf/mAyxR9HVtUTSmR0ObFw7uD/ld1+WXhjxQ92gsWKeVuiWchXl6su7SMxrTWOh5TDg/+LFe0S+D74WnYPTDgiUdzin3a1X7QFS0smBs6DE9Fk96wgsGTiIDZ+H+DHDAjRkodxegbOvfujsCMHe2HJqZJjtLcN4xg/qv7o4ADISFwKp0ARScPbOG9lddSgDz5jgVTkVgn5TKaAzGeUTKAgecCjkjyHmpkZrAgcCWyZ6dlTdLygNHnV2yEoOR6fKyHJa9jmdn3TvGKZEP5DOpCYQT3YggByeOSHzDnXXx3/WukxZpkq+kfGpWovYk6qzGOIXSdzsrb5R85DV8JjfX2SGtguB8IbWCXJWYXBUEOT1zLMYpkWZBbgqCvCVrpMGv7TcZzlKpE6RZLsnOqVlJgME5fu+YVHW9APR1bfXApgS6qCCNgbA0Cp0RSrRNLXT9tMsSzl0sVYJcFWS/s9RkYqRSiMdA53HnuCBlzjpBTjjLZ2Q7hXIhjtVZPSNbVshZwXlVrkmdbEgmbnYY2Mn77kled8st0bNuak5gnrwpBKp7b88plEav3uh0MRM6IEzGzgosEgQ5YTxHRS7K5Y6fBarlW2kOeHaWlAnSKp6dJVu9b/yF5GOgXw4nr0sCoN9eYJ4g5xL1Gwh7I+825HgIk7OznGmCIJ6dNTVLEN/OciYITq0Q8O2swLNCYF8n+OdNZsoA0zIDMZipOYI03c4M9BAma2dJuSCIZ2flDRPkelskk1JBjgiOb2c5awXHt7NkhSDIdxNHpAYwXTGwp+WXSgxMKY3JGxV4SZoFQY7keXaW1AqydeKIWUOd5dIg9bJbyFvYnpIKeb6dJaXewF6ZNTIFgGnbhXtafmnYhadPCWyXKmkU5GzuYrkkyE35JPD29HGyTFoEqZc6Qa7k5ssRudiOR14T7vPtLKdECLwuLYLEAkcDCe2s7ye/67r80pAHOnskJnVSGdgyNQszbbKzS85ITGLO85jcfPlYrsiXgfemT8HIh04HOyvvfqlqH8h0kcqZYwOPyTEv6VkwcBIZOAsPuDEDdtYAwB7Ltn6uuyMAZ3OINNlZwDsM6se6OwIwDKxKG0DYw9B+q0sJ4BwqqGAfpYzGYHiEMg5QwRngPDXUcIAteHYWsyjnKLtYicEwnZc5zF7WkYHBMIYSPuAzaggnvBE4yIgkbrizLn71rmuhia8oJythe1FWYyik73YWo/jIa/gMueygFYAvqAWuEuMqAKcZi6GEZuAmAG+xhga/tp8MllIHNHOJnWQlAQaOMyZlXc8A23Vt16YEuijQSJhG6IIwSscrkZ3FYqqAq8B+lpKJoRK8GPg4x4Ey1gEnWE42hVzwsK4mmxWcBV7lGnVsSCputl8nuScF3a1Xz7oc5vEmUJ2gvUIavXojXc2EaO/4OsfARQCcoM1RucjlWz6r5lua8ewsyoBWPDuLrV5HL6QQA9uuwynoEgNsb28ecC5hv2Gv1n3IifaGrzPAaQB4dhZZgG9nMQGoBXw7i2eBfZ3gnyczZYDpmYEGQw7QdFszMI4wWTuLcgA8O4thwHU/kpUCRwDfzmIt4NtZrADgO0akCDBdMbCn5ZdKDEwpjRnFSzQDcATPzqIW2MoIhrKcBurZDSzskJKCb2dR6g3sFUamADB9u3BPyy8Nu/AUtlNFI3CWxVwCbvIJbzOOZbQA9dQBV8jnCBc74HkN8O0sSoDXaQFiHGUzg/tFftd1+aUhD9xDjDoq2UIWhsns4gwxYjyPIZ+PucKXvMcUDB/Swc7ifqo6DESoZCyPccxLehYMnEQGzsIDbsyAnfV/F+Cvh6W3Y7utf+tuG6Abtf+dVoBEdiTzXyLuli4lgJsedBdG5kU9tyU63J3rLrQHbZ27xF3izl3vmwKRqcWP2rhfY9bnFD9aNMnHnRt5wl0SmZEKQIvdGx2aqq4o37rW7V0XmWw32Bc3P5BUe7MxxeMjU28LoH3DYrHX7YuRbPs722yxN+wNi1e+KX4KY++N/MlisTdt2eaJ9o+21WJxt5uMoh/aYxaLrXd/nCJA7OHoyNR0kd9YLL3rIvPjtcgvErXnRu2N4oftIVvbFWF0pPt79914sTt7Quz9s/kB95e21mJP28u2vCh/4zgbs3uLZhfNthF70cbcXHvKXoyUugX2mMVet1/bElcjlRa3KHLO/adb5M5JLWr6X0/V+pxkdXaWrbJfx2udY1lHXSQ7ErIltsVW995edLhbYbFNFtsQebob7U9sg8ViWyIrk4iBRcssFvsMBlM83hIp9ppxLZH3LZEnMJhNE2yrxS7AYLZMi8/JTQ/2JQb6ZU+yuraZZbHYfYnas/+wFxL1++th9u8WSyTUfe9F+baxN3y3AHTnWuwp7w9/ZLH/4XX5c4uttcf9IZy3R/2fv7G4FX3bRNI3AzHRUZH59lN7IzLfze37DMRgIj+1zyW5C9tDFtu0dggGU3y/xf4Bgwln2r/Zetto/8eLDINts7vd20iybKvFxqKD+wwwLTEQE85037dYusa25GNg0pvI2iF2sbvePWFb7Z8ttsb9VfHDJsN+alsiu92N9pRtdddYIv8Z/4MtUyyRl7x56lhsrcVWu2siD/UBYJp2YR9hN1ju+C4cHWSrLLbZHrcLwpn2DXvNYnEXbbzPHrWtFnsy8mRRvv1LezJj/+p6lkJ0UOTzyJOR39p/WSzuiv6VB4Yzi8d/D3lgOLNoUtGk9m/EZGyaUDQpjsuO/q8fdD2VmIz4Mo8jXDsEEx3s5hXP3Dhu4CQyUAYA9h+AaTYT/v/7gVHSaiYAO5J6gne3dCkBfJCFzPNf3RjOXBZykDqWsIS5Hd4wmMqj3ssfhhwexTcTyOUJljAjJYCwN8lnHR11+bi4CXST2cCLPJBUe7MxjOf2zATeAOA6L5LN72gGbnDDfwD4DU9huJc/AXCTMibyR+/1j+1k8EOOAVDPj1MECIcTPsPrrPtNN0/kOuvme7VfJGwvyg0e5hC13SAcye951ys76d1M4AF+SS1wmsuUk884YuxlNrOJcJEYuZziIqUUcAy4zteUoFQCRZzjnxQxJ8Wo2XZVkZO0bhZVfO3VtvWiyyZECS1UJ2hvOBVAE9BAd0e5n9AAQAvJmAksA/9J73jAMxNwgfeBJ7w3FFr9Z27TvDn5YJ9iYNu1J2nd/A61fQnb+wcXEvY7jL8D0IOZQD6NveG7FeBcwDMT+BHgmQn8HKjFNxM4j28m8A1Q0cdNJH0z0DCK+XzKDeaTexsz0GD4KcmaCRwCmhjiPfOFP2AwZPI36mnEMxMYTDPb/bdnWoEYg/sMMD0x0JDJ+wDdxLbkY2DSm8gQFrOeE7TyZ6CGX/EwGXxKC7vZyClaWQN4ZgJTAM9MwPFeOKpmDQ/1AWC6duE2hN1hueO78CCqgGaOs4BM3uAaAIu4j6O0Aid5knz+0iGZ+av/fsIgPudJfsu/AFjRz/LATMZ/H3lgJpOY1OEbyWACkzxco/lBN6eSDHwzgUEMwTCYPGaSkpkw8GbCQDEYzP8Ciu4/UhFmEn8AAAAASUVORK5CYII=';

GM_addStyle('\
    span.xbmc-actions>button { position: static; left: auto; top: auto; right: auto; bottom: auto; } \
    \
    span.xbmc-actions>button.xbmc-button { float: left; } \
    span.xbmc-actions>button.xbmc-dropdown { padding: 0 5px; } \
    \
    span.xbmc-actions>button.xbmc-button>span, span.xbmc-actions>button>span>img { background-image: url("' + BUTTONS_IMG + '"); background-repeat: no-repeat; } \
    span.xbmc-actions>button.xbmc-button>span { display: block; float: left; } \
    span.xbmc-actions>button.xbmc-button>span>img { float: left; } \
    \
    span.xbmc-actions>ul.yt-uix-button-menu {} \
    \
    \
    span.xbmc-actions.small { position: absolute; left: 2px; bottom: 2px; width: 70px; } \
    span.xbmc-actions.small>button>span>img { height: 11px; } \
    span.xbmc-actions.small>button.xbmc-button { width: 58px; } \
    span.xbmc-actions.small>button.xbmc-button>span { width: 56px; height: 11px; background-position: 13px -46px; } \
    span.xbmc-actions.small>button.xbmc-button>span>img { width: 15px; background-position: -99px -46px; } \
    \
    span.xbmc-actions.small>button.xbmc-dropdown { width: 12px; } \
    span.xbmc-actions.small>button.xbmc-dropdown>span>img { width: 6px; background-position: -142px -46px; } \
    span.xbmc-actions.small>button.xbmc-dropdown>div { left: -3px; top: 22px; Xdisplay: block; } \
    \
    span.xbmc-actions.small>ul.yt-uix-button-menu {top: auto !important; bottom: 22px; left: 0 !important; padding: 3px 0; } \
    span.xbmc-actions.small>ul.yt-uix-button-menu>li.yt-uix-button-menu-item {padding: 3px 10px; font-size: 90%; } \
    \
    \
    span.xbmc-actions.large { width: 82px; } \
    /* temp */ span.xbmc-actions.large { float:right; margin-top: 3px; margin-left: 10px; } \
    span.xbmc-actions.large>button>span>img { height: 15px; } \
    span.xbmc-actions.large>button.xbmc-button { width: 66px; } \
    span.xbmc-actions.large>button.xbmc-button>span { width: 64px; height: 15px; background-position: 15px 0; } \
    span.xbmc-actions.large>button.xbmc-button:hover>span { background-position: 15px -15px; } \
    span.xbmc-actions.large>button.xbmc-button>span>img { width: 17px; background-position: -99px 0; } \
    span.xbmc-actions.large>button.xbmc-button:hover>span>img { background-position: -99px -15px; } \
    \
    span.xbmc-actions.large>button.xbmc-dropdown { width: 16px; } \
    span.xbmc-actions.large>button.xbmc-dropdown>span>img { width: 8px; background-position: -142px 0; } \
    span.xbmc-actions.large>button.xbmc-dropdown>div { left: -3px; top: 30px; Xdisplay: block; } \
    \
');


function mkButtons(large) {
    var actions = document.createElement('span');
    actions.setAttribute('class', 'xbmc-actions yt-uix-button-group ' + (large ? 'large' : 'video-actions small'));

    var _button = document.createElement('button');
    _button.setAttribute('class', 'xbmc-button start yt-uix-button yt-uix-button-default yt-uix-tooltip ' + (large ? 'yt-uix-button-empty' : 'addto-button'));
    _button.setAttribute('title', play_button_text);
    _button.setAttribute('type', 'button');
    _button.setAttribute('role', 'button');
    actions.appendChild(_button);

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', large ? 'yt-uix-button-wrapper' : 'yt-uix-button-content');
    _button.appendChild(_wrapper);

    if (!large) {
        var _label = document.createElement('span');
        _label.setAttribute('class', 'addto-label');
        _label.appendChild(document.createTextNode(play_button_text));
        _wrapper.appendChild(_label);
    }

    var _empty = document.createElement('img');
    _empty.setAttribute('src', PIXEL_IMG);
    if (large) _empty.setAttribute('class', 'yt-uix-button-icon');
    _wrapper.appendChild(_empty);

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


    var _menu = document.createElement('ul');
    _menu.setAttribute('class', 'yt-uix-button-menu yt-uix-button-menu-default small'); // !! addClass('small') ...
    _menu.setAttribute('style', 'display: none;');
    _menu.setAttribute('role', 'menu');
    _menu.setAttribute('aria-haspopup', 'true');
    _dropdown.appendChild(_menu);
    //document.body.appendChild(_menu);
    //actions.appendChild(_menu);

// !!!
//delete(ACTIONS['add']);

    for (var action in ACTIONS) {
        var _item = document.createElement('li');
        _item.setAttribute('class', 'yt-uix-button-menu-item ' + action);
        _item.setAttribute('role', 'menuitem');
        _item.appendChild(document.createTextNode(ACTIONS[action].caption));
        _menu.appendChild(_item);
    }

    document.body.appendChild(actions);

    return actions;
}

setTimeout(function(){

    var x = 3;

    if (1 & x) document.getElementById('yt-masthead-content').insertBefore(mkButtons(true), document.getElementById('masthead-upload-button-group'));
    if (2 & x) document.evaluate('/html/body/div/div[6]/div/div[2]/div/div/div[2]/div[2]/div/div/div/div/ul/li/div/div[2]/div[2]/div/div/a', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.appendChild(mkButtons(false));
}, 50);

})();

