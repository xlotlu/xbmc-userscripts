// ==UserScript==
// @name            YouTube » XBMC
// @namespace       http://userscripts.org/users/53793/scripts
// @description     Play YouTube videos on your XBMC
// @include         *youtube.tld/*
// @version         1.0.2
// @date            2012-07-11
// @author          xlotlu
// @updateURL       http://userscripts.org/scripts/source/136934.meta.js
// ==/UserScript==

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

function status(type, response) {
    console.log(type);
    console.log(response);
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
    }/*,
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
    }*/];

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

    GM_xmlhttpRequest(details);
}


/*
Going playlisty:

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
        "playlistid": 1,
        // when position is -1, a single video is playing,
        // NOT the video playlist (id 1).
        // NB: playlist positions start from 0.
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
if (thumbs.length) {
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
            this._thumb.appendChild(our_button);
            our_button.style.display = 'block';
        }, false);
        target.addEventListener('mouseleave', function() {
            var our_button = document.getElementById(play_button_id);
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
if (video_id) {
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

