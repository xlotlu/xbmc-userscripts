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

var PIXEL_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
var BUTTONS_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAArCAYAAAD/uIM2AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABD8SURBVHic7Vx7kFTVnf5+px/zQgSVhZgoMLdHRIcUulWBaG2QiI/CZHeZ6e64yuIkS8QoUID2dPcMlemuAHN7SI1Za1ctjbXjKOp2XyjBDS7qxmg0QVfAAIZF5jbKhIi74hPm0Y/z2z/6dqen59Xdc4fRmvmquu6959zz3d/p+/V53PP1JWbGBCYwVhBjHcC5hsvlCk3wfXlQtADdbvd8l8v1Qk1NzYVmBjTaYOZ6p9P5SDAYNOXHN974zEbRQTFzFTPfQERLzQzoHOHHhw4desbtdtsn+MYWlB4DOp3Oq5j5fgAgok+Z+YDFYvlFOBz+DABcLtc1zOwkorlSyjIiuhhAFYCTAD4yyn3AzK/FYrH7d+3a1ZW+iNPpvJKIVjLzfACdRLQnEolsA4CamprLhBC3A7gGwGdE9KKmaY+wEdjtt98+taen5x4iWgDgG6nL0OZIJBIppsJOpzN70PtCeXl5TXt7+9liuArhyz5P0zQqls/pdCYAxACcJiKNiBrC4XD3SOJzuVwBZj6uadrjtbW1dUKIWZFIJDAYp5nICHD58uWTe3p6dgC4Piv/WDKZvFEI0UhE/wQg/cUdAWAD4ADwBQCJVGt6npF/VEp57Y4dO07X1tZuJKImANas88DMDxLRPgAPAKjIziOiX2ma9n2n03mzlLKdiC4CkADwMYDnhBBrhvrSh0LODQGAvSUlJUu3bdv2yWjyFSnAfny5+UTkiUQiPy+WzxBfE4AuIqpj5jYA5UQUHEqEWeX6Ybiy2ch0wU8++eTnmqYtMb6cmwG8AaDKYrEcJKKVRLSbiJYKIayapl0B4EMAkFLO1jRtiqZpk6WU1wPYC2COEKLR5XKtIqKfAfgjEf1DPB6fwsw/BHCKiO4G8BiAPwGoi8fjUwDcBuAEM99SU1OziZnDRnj3SilnaJo2XdO0lcWKbxAs7O3tfaW2tvZro8HndDo5VwQDpeXLJ4S4UAixAEArADDzbSOJT0r5HoAuAOXG910OoMtIHxSRSCRARMHc9ELEBwwyBtQ0bQ8R/dQ4PA/AQSL6u0gk8nw4HE4aF3IA+HTHjh2n0+V27Njxa6O1A4DrmHkLgIQQwh2JRJ7ZuXPnF9u3b28D8LRxDgNYrmna4zt37vxC07SnkRIliKgBwCQAPk3TWrOvMwqYR0TtXwW+cDj8cTgcflMI8e9G3kUj4du+fXsbEdVlZxJRnXGfhkSuCAsVHzDEJCQejx/JOvSnhQcAbre7jJmnI9V69UEymXzb2D0PwAUAtoXD4aM5p+01trs0TXsrO4OI9mYdnrRYLG3D1mLkOMTMK75ifB3GthgBZvhqa2vT3W4GzNxWW1tblw9RWoTFiA8YQoA2m21DVkBTsvPOnDkjjd0qt9tdlp1HRD8xdjuN7e8GoJ9i8PbLY+bsxzrTSktLSweN3hzsLSkpWbR9+/YPRoNP0zTKHfMNlFZIfC6XKyClTPcIZU6nk10uV6AYPiHELBjdLhG5YXTHRnpeiEQigWInLf0EuHz58slOp3M1M69OpxHRymXLlinp4927d/ci9QsskVJ6VqxYUeF2u+0ul+tWIvIA+ATAKaPsu7nXICIFAIQQuS0jmPmyrEN7V1eX3+12TyqmcnnghfLy8iXFTkDGim8EXV8/viyuuyORSISZ7ym2NSsGVgBwu91fl1LWA1gAYB5Sv4gTAO4E0A5gscViedfpdO4HsN9utzcS0XpmfhZAsKurax0zJ43Z6udCiGVSyiYi+pCI3sq9KDNLAEgmk/3ECSDd1W8FsAFAo5RytdPpPEBEL3700UctL7/8csKEukeEEMvb29tjJnANy1dAi5cXXyQSCbhcrsz+SPiyy+cz9jMTAgCklPcDuIOZFQAHAGwUQlyuadqeeDx+FYAnAOhIPff7QTweXxqJRP5DCHE9M78GwEJEnzFzuxDiinA4/AqAnmQyWRcOh8/0u6gQTwB4w2q16rl5RPQUgNellCEiWgzgVSPO65h587Rp0xaaUO9H582bd2s4HDZLfGPCV0DXZ3Z85oGZx9XH6XSGJvi+PJ/Mg+gJTGAs8KVcoJ7A+MG4E6CiKKbak8Ybn9koWoCzZ8+eryjKC3Pnzv1K2bEA1DscjkeIyKwf33jjMxVFB0VEVQBu6O3t/crZsZj5x4qiPFNdXW2KPWm88ZmJzCSkqqoqY8eSUn5KRAcA/ELX9c8AwOFwXMPMTmaeK4QoY+Z+dixm/gDAa729vfefPHkyY8eqqqq6Ukq5kpnnCyE6mXmPruvbAEBRlMsA9LFj6bqesWPNnDlzqs1mu4eZM3YsZt4cjUaLsmMpitLHnnT27NmaU6dOFW3Hypcv+zxd1wd9Jjgcn6IoGTsWAC0WizV0dnYOas7IJz5FUQJEdLyjo+Nxh8NRx8yzdF0PDMZpJrIFOFlK2c+OJaW80WKxNDJzxo5FREeYeUg7lt1uv/bIkSOnHQ7HRk7ZdvrYsQA8CGBAOxaAX0Wj0e8rinIzM7cjtd6ZsWPFYrE1Q33pQyHnhoCI9sbj8aXvv/9+UasX+fIVKcB+fLn5zOyJRqOD2rHy4AsAaALQxcx1RNSG1EJEcCgRZpUbCEOWzUamCz527Njnuq4v0XWdpJQZO5YQ4iAzrwSwm4iWRqNRa0dHR8aOZbfbZ+u6PkXX9clEdL1hJpgTi8UaHQ7HKmbO2LFsNtsUIvohUst0GTsWEdXZbLaMHQvALYqi9LFj2e32GbquT9d1fWWx4hsIzLzQarW+MmvWLFPsWLl8iqJwrggGSsuXLxaLXWj0Bq3GKQXZsXL5iOg9GOu/RJSxYxnpg8IQWD87FgoQH4DBnwNWVlbeSER7jMOD0Wj0ambOOGIURTkFoETX9akDlWPmA0Q0E8BkZq6ORqNHs8q2AliPlB3rW7quv5WV99PsijHzymg0+li+FRoOQ9z4l3Rdv8FsvqGENlBLmG98lZWV3yKiNwB06rp+abHxGVwuQ3wAAGZ25zvEyWkJCxIfMMQkRAjRx46VLb5LLrmkDMCAdiwhxNvG9jwAFzDztmzxAQAz7zW2u7LFl51n4OTx48fb8q9O0TiUTCZNtU+NNl88Hh+RHSvN53A40t1uBkTU5nA46vIhymoJCxYfMIQAmXlD1mEfO1ZpaWnGjmWIMbvcT4xtJwAIIfpZroQQUwbLI6I+dqzp06ePqh2LiPYmEolF7733nil2rFw+Xdcpt6UbKK2Q+BRFCdjt9owdy+jSA8XwMfMsGN0uM2fsWEZ6XtB1PVDspKWfAKuqqiZXVlauBrA6K3llVVVVxo517NixjB3Lbrd7ZsyYUVFdXW13OBy3AhjWjsUp0wOIqJ8dC0AfO9akSZP81dXVo2bHOnPmzJJiJyBjxTfA+Cvf1qcfX5qLiO6ORqMRIrqnAL4RwwoAc+bM+Xo8Hq83/nk2j4jKAZyQUt4phGgHsFhK+a6iKPuZeb/NZmtEagz3LIBgRUXFuu7u7iRS3cHnUsplQogmAB+WlJT0s2MhNeNFPB4fyCuYNBaqtxLRBmZu7O7uXl1ZWXkAwIszZ840xY5FRJHS0tLluq6b4hAZji/fFq8AvoCiKJn9kfBll+/o6GgrJM6RwgoAyWTyfiK6EUAcwAFmfj4ej7d2dnZ2X3rppVfZ7XaVmRcCqCKiqmQy+bqu6+2zZ8++XgixCcA3AXzMzLttNlvD0aNHTyqK0kNEdYcPHx7QjiWlXDxp0qR+diyLxfJUIpG4uaSkJNTb2/scEW0CcBURXQfguhMnTrwK4LWRVJqIHtV1/S42fIkjxVjx5dtKmR2fqRhrO865/lRWVppqTxpvfGZ/JuxYExhTfCkXqCcwflCwANeuXVsyGoGcK/h8PlPtSeONz2wULMCKigq/z+d7cDSCOUeo93q9j7rdbssE39gjMwb0eDzftFqtF0gpu8rLyw83NTVl3CzBYLC8p6fnSgAVzOwHcDUR/aORfbq3t/dwa2trn/VZr9f7DYvFMlNKeVhV1c/S6Rs2bLigtLR0biKR0FtaWk5ll/H7/bOklIoQwialPB4KhQZ6Tjgi+Hy+9KB3e1lZ2W1NTU0jegwzHF99ff0iIcS3AUBVVbVYPq/XezER3Qqg22Kx/Hbz5s2HTYpvfktLy9sNDQ3TkslkSSgU6re6NZrICNDn820FcJ+R3gtgPTM/abzb5R6kHtnEjXxbDs9pIcSKLVu27Pb5fJcy80NZr22TAP7ZYrGEksnkowC+h7+4ah5QVXWdx+NxCCF+CeA7RplPiOiG5ubmfWZXOOuGAMBLZWVly5qamvo9KjKLz+v1qkTkBQBVVYd9FjgYn9frXUhEv09nMPOPQqHQv40kPr/fH2DmBiHE30gpfwZgNjMvHk6EwWBwUk9PTzP+4n5Kx5Rg5kAhIu4zC25sbKyWUi5kZi9SVqujSK35tkkpn5VSvmO1WjsAvCSl3AQAQogbkfr/bikRzWfm5wFMZeaHDCfNOqSE1YuUh+0hIjoipVxPRNcSUb2Uco0QQgL4VwAvnT179o8PPPBAb76VKAQ5NwQA3ojFYktbW1s/NpPPbrd/DSm3zyUALk7nAXhFVVVvoXw2my0O4CYiuhxAAMBBVVWvLja+888/v6enp2c3My8C0A2gDMBZZr4tFArtyoP3OwB2I2WlA4AkM98RCoW2DVc2G9bsA6NZP1xfX39KCPEcgDkA/l5V1Z0A0NDQME1KeT4z72tpaUm/A+Ztn88nADRLKTcR0eXMvCQUCv0XAHg8ntctFsspACUAfqCq6msAsHHjxjcTicQJZm4hIplIJK7aunXrwUKCNwkL7Hb7wwDcZvIxc6uxstQnD8YSZaF8qqq6AWgA4PP5fgSgWPvYArvd/nBTU5N77dq1N5WXl+8HcAUAMHNdPuIDAFVVX62vr79FCLEbQEkx4gMGmYRYLJYPjd3/SYsPABKJxCUAQEQf5RT5k5G+AMDetPgAYOvWrf8L4M8AfpMWHwBs2rSpE6kWEUT02zESH5BqEe4ym4+IvkCqxftzdh5SvUrBfAAQDAYne73ehUgZcy/0er0L/X7/rGL4gsFgeUVFxR6kxNcNpFwwXq/3b/MlamlpeYWZvwdgRTHiAwYRIDNvNnZnrlq1KjPes1qtPcbut9NpxuzKh5QB4WIAf8jmCgaDVgDTiaiPwDZs2FCG1NuzwMzzjfPONV4qKytbUmz3OxSfqqrvqKq6kJmfSGeqqrpwqO53uPjeeeeds0KI1QD+GoCNiJ6QUhayLp7hMyaZvwEQF0IsBvAigA8A7C+AD6FQ6GVVVZ8qpEw2rACwatUq29SpU79LRFcAqEPq/TC/BvDdqVOn/rff73+YiA40Nze/6fV69wFY4fV6S4UQ+yorK1cCmEOpV/A+xsx9hBaPx6cDsEopj/W5sNV6MVKTkQ4Aju7u7jf9fv+/SCkPhkKhgQwMZsOUWfBwfMz8PBF9agZfOBxOut3uOxRFATMvyGfCMBRfc3NzoL6+/llVVd9uaGi4fUxmwYFAQHR3d/8OqfFJAsBbADzRaPT3lZWVKoC7kHpRJIjopng8ftRqtbYBWISUgA4x873MHBNCbI3FYotyH8n4fL59RNTY3Nz8n+m0YDAourq6/oDUBOYmwwZUalzntubm5qcxCvD5fMzMvzx+/Phd2e88/Crxud1ui8PhuGDLli3/d67jMx0ul8vi8XhmeDyeGYFAwJ67WAyA7rvvvr/yeDwz1q9fX5ZO93q9569bt25K+njNmjUlgy04A6A777zTlpseCAREOj0QCFh9Pp/D7/dffu+99140WovfXq/X1MX58cZn9mfCjDCBMcX/A3j66tGiG8WRAAAAAElFTkSuQmCC';

GM_addStyle('\
    span.xbmc-actions>button { position: static; } \
    span.xbmc-actions>button.xbmc-button { float: left; } \
    span.xbmc-actions>button.xbmc-dropdown { padding: 0 5px; } \
    span.xbmc-actions>button.xbmc-button>span, span.xbmc-actions>button>span>img { background-image: url("' + BUTTONS_IMG + '"); background-repeat: no-repeat; } \
    span.xbmc-actions>button.xbmc-button>span { display: block; float: left; } \
    span.xbmc-actions>button.xbmc-button>span>img { float: left; } \
    \
    span.xbmc-actions.small { position: absolute; left: 2px; bottom: 2px; width: 70px; } \
    span.xbmc-actions.small>button>span>img { height: 11px; } \
    span.xbmc-actions.small>button.xbmc-button { width: 58px; } \
    span.xbmc-actions.small>button.xbmc-button>span { width: 56px; height: 11px; background-position: 13px -31px; } \
    span.xbmc-actions.small>button.xbmc-button>span>img { width: 15px; background-position: -99px -31px; } \
    \
    span.xbmc-actions.small>button.xbmc-dropdown { width: 12px; } \
    span.xbmc-actions.small>button.xbmc-dropdown>span>img { width: 6px; background-position: -142px -31px; } \
    \
    span.xbmc-actions.small>button.xbmc-dropdown>div { left: -3px; top: 22px; display: block; } \
    \
    \
    span.xbmc-actions.large { position: absolute; z-index: 9999; right: 100px; top: 70px; width: 82px; } \
    span.xbmc-actions.large>button>span>img { height: 15px; } \
    span.xbmc-actions.large>button.xbmc-button { width: 66px; } \
    span.xbmc-actions.large>button.xbmc-button>span { width: 64px; height: 15px; background-position: 15px 0; } \
    span.xbmc-actions.large>button.xbmc-button:hover>span { background-position: 15px -15px; } \
    span.xbmc-actions.large>button.xbmc-button>span>img { width: 17px; background-position: -99px 0; } \
    span.xbmc-actions.large>button.xbmc-button:hover>span>img { background-position: -99px -15px; } \
    \
    span.xbmc-actions.large>button.xbmc-dropdown { width: 16px; } \
    span.xbmc-actions.large>button.xbmc-dropdown>span>img { width: 8px; background-position: -142px 0; } \
    span.xbmc-actions.large>button.xbmc-dropdown { width: 16px; } \
    span.xbmc-actions.large>button.xbmc-dropdown>div { left: -3px; top: 30px; display: block; } \
');


function mkButtons(large) {
    var actions = document.createElement('span');
    actions.setAttribute('class', 'xbmc-actions yt-uix-button-group ' + (large ? 'large' : 'small'));

    var _button = document.createElement('button');
    _button.setAttribute('class', 'xbmc-button start yt-uix-button yt-uix-button-default yt-uix-tooltip ' + (large ? 'yt-uix-button-empty yt-uix-tooltip-reverse' : 'addto-button video-actions'));
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
    _dropdown.setAttribute('class', 'xbmc-dropdown end yt-uix-button yt-uix-button-default ' + (large ? 'yt-uix-button-empty' : 'addto-button video-actions'));
    _dropdown.setAttribute('type', 'button');
    _dropdown.setAttribute('role', 'button');
    _dropdown.setAttribute('onclick', ';return false;');
    _dropdown.setAttribute('data-button-has-sibling-menu', 'true');
    actions.appendChild(_dropdown);

    var _wrapper = document.createElement('span');
    _wrapper.setAttribute('class', large ? 'yt-uix-button-wrapper' : 'yt-uix-button-content');
    _dropdown.appendChild(_wrapper);

    var _empty = document.createElement('img');
    _empty.setAttribute('src', PIXEL_IMG);
    if (large) _empty.setAttribute('class', 'yt-uix-button-icon');
    _wrapper.appendChild(_empty);

    var _menuwrapper = document.createElement('div');
    _menuwrapper.setAttribute('class', 'yt-uix-button-menu yt-uix-button-menu-default');
    _dropdown.appendChild(_menuwrapper);

    var _menu = document.createElement('ul');
    _menuwrapper.appendChild(_menu);

    // TODO: add these things dinamically
    var _item1 = document.createElement('li');
    _menu.appendChild(_item1);

    var _item1_text = document.createElement('li');
    _item1_text.setAttribute('class', 'yt-uix-button-menu-item');
    _item1_text.appendChild(document.createTextNode('menu stuff 1'));
    _item1.appendChild(_item1_text);

    document.body.appendChild(actions);
    // this needs to be set after the element has been added to the dom
    _dropdown.widgetMenu = _menuwrapper;

    return actions;
}

setTimeout(function(){
    var xpathExpression = '/html/body/div/div[3]/div/div[3]/div/div[2]/div[2]/div[2]/div[1]/a'
    var elem = document.evaluate(xpathExpression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    elem.appendChild(mkButtons(false));
    document.body.appendChild(mkButtons(true));
}, 50);

