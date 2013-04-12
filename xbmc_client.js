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

