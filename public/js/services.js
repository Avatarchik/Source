var helpers = {
	plainString: function(s) {
		s = s.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
		s = s.trim().toLowerCase();
		return s;
	}
};

var services = angular.module("fulltrack.services", ['ngSanitize']);

services.filter("duration", function() {
  return function(s) {
    if (typeof s === 'undefined') {
      s = '0';
    }
    return moment(s*1000).format('mm:ss');
  };
});

services.factory("$social", ["$sce", function($sce) {
	return {
		init: function(callback) {
			var _this = this;

			VK.init({
				apiId: 4227084
			});

			VK.Auth.getLoginStatus(function (response) {
				if (response.session!=null)
					_this.getCurrentUser(callback);
				else
					callback(false);
			});
		},

		login: function(callback) {
			var _this = this;

			VK.Auth.login(function(response) {
				if (response.session!=null)
					_this.getCurrentUser(callback);
				else
					callback(false);
			}, 8);
		},

		logout: function(callback) {
			VK.Auth.logout(callback);
		},

		getCurrentUser: function(callback) {
			VK.Api.call('users.get',{fields:'photo_50'}, function(json) {
				callback(json.response[0]);
			});
		},

		getTrack: function(track, vk, callback) {
			var _this = this;

			//clean
			var temp = {
				artist: helpers.plainString(track.artist),
				title: helpers.plainString(track.title),
				duration: parseInt(track.duration)
			};

			if (vk)
			VK.Api.call('audio.search', {q: track.artist+' - '+track.title, count:20}, function(json) {
				if (json.response.length>1){
					for(var i in json.response)
						if (i>0){
							if (typeof json.response[i].points == 'undefined') json.response[i].points=0;

							//clean
							json.response[i].artist = helpers.plainString(json.response[i].artist);
							json.response[i].title = helpers.plainString(json.response[i].title);
							json.response[i].duration = parseInt(json.response[i].duration);

							//исполнитель
							if (json.response[i].artist == temp.artist)
								json.response[i].points+=10;
							else if (json.response[i].artist.indexOf(temp.artist)!=-1)
								json.response[i].points+=5;

							//название
							if (json.response[i].title == temp.title)
								json.response[i].points+=11;
							else if (json.response[i].title.indexOf(temp.title)!=-1)
								json.response[i].points+=5;

							//длина
							if ((json.response[i].duration >= temp.duration-3)&&(json.response[i].duration <= temp.duration+3))
								json.response[i].points+=10;
						}

					var max={val:0, index:1};
					for(var i in json.response){
						if (i>0)
						if (json.response[i].points>max.val){
							max.val = json.response[i].points;
							max.index = i;
						}
					}

					callback({
						url: $sce.trustAsResourceUrl(json.response[max.index].url),
						duration: json.response[max.index].duration,
						artist: json.response[max.index].artist,
						vk: {
							aid: json.response[max.index].aid,
							owner_id: json.response[max.index].owner_id
						}
					});
				}
				else
					//_this.getTrack(q,false, callback);
		    		callback(false);
		    });
			else
				$.getJSON("//ex.fm/api/v3/song/search/"+track.artist+' - '+track.title+'?callback=?', function(json) {
					if (json.results>0){
						var finded=false;
						for(var i in json.songs)
							if (json.songs[i].url.indexOf('soundcloud.com')==-1){
								callback({
									url: $sce.trustAsResourceUrl(json.songs[i].url),
									duration: 0,
									artist: json.songs[i].artist
								});
								finded=true;
								break;
							}

						if (!finded)
							callback(false);
					}
					else
						callback(false);
				});
		},

		vkAudioAdd: function(params,callback) {
			VK.Api.call('audio.add', params, function(res){
				callback(res);
			});
		},

		itunesBuyUrl: function(q, callback) {
			$.getJSON("https://itunes.apple.com/search?term="+q+'&callback=?', function(json) {
				if (json.resultCount>0)
					callback(json.results[0].trackViewUrl);
				else
					callback(false);
			});
		}
	};
}]);


services.factory("$lastFm", ["$sce", function($sce) {
	return {
		key: 'a8243337530b2a27bd52e0bf7ecef793',

		prepareTracks: function(json) {
			var clean = [];

			if (typeof json.name != 'undefined')
				json=[json];
			
			for(var i in json){
				var temp={
					index: i+1,
					title: json[i].name,
					artist: json[i].artist.name,
					duration: json[i].duration
				}
				if (json[i].image){
					temp.art = json[i].image[1]['#text'];
					temp.artBig = json[i].image[3]['#text'];
				}

				clean.push(temp);
			}

			return clean;
		},

		getTopArtists: function(callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key="+this.key+"&format=json&callback=?", function(json) {
				callback(json.artists.artist);
			});
		},

		getHypedArtists: function(callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=chart.gethypedartists&api_key="+this.key+"&format=json&callback=?", function(json) {
				callback(json.artists.artist);
			});
		},

		getGeoTopArtists: function(c, callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=geo.gettopartists&country="+c+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				callback(json.topartists.artist);
			});
		},

		getTopAlbums: function(q,callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist="+q+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				if (typeof json.topalbums.album.name != 'undefined')
					json.topalbums.album=[json.topalbums.album];
				callback(json.topalbums.album);
			});
		},

		getTopTracks: function(q,callback) {
			var _this = this;

			$.getJSON("//ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist="+q+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				callback(_this.prepareTracks(json.toptracks.track));
			});
		},

		getTracksFromAlbum: function(artist, album, callback) {
			var _this = this;

			$.getJSON("//ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key="+this.key+"&format=json&callback=?&artist="+artist+"&album="+album, function(json) {
				var tracks = _this.prepareTracks(json.album.tracks.track);

				if (json.album.image)
				for(var i in tracks){
					tracks[i].art = json.album.image[1]['#text'];
					tracks[i].artBig = json.album.image[3]['#text'];
				}

				callback(tracks);
			});
		},

		getAboutArtist: function(q, callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist="+q+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				callback(json.artist);
			});
		},

		getTopTags: function(callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=chart.gettoptags&api_key="+this.key+"&format=json&callback=?", function(json) {
				var temp=[];
				for(var i in json.tags.tag)
					temp.push(json.tags.tag[i].name);
				callback(temp);
			});
		},

		searchArtist: function(q,callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=artist.search&artist="+q+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				if (typeof json.results.artistmatches.artist.name != 'undefined')
					json.results.artistmatches.artist=[json.results.artistmatches.artist];
				callback(json.results.artistmatches.artist);
			});
		},

		getArtistsByGenre: function(q,callback) {
			$.getJSON("//ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag="+q+"&api_key="+this.key+"&format=json&callback=?", function(json) {
				if (!json.error){
					if (typeof json.topartists.artist.name != 'undefined')
						json.topartists.artist=[json.topartists.artist];
					callback(json.topartists.artist);
				}
				else
					callback([]);
			});
		} 
	};
}]);


services.directive("nanoScroller", [
	"$timeout", function($timeout) {
		return {
			link: function($scope, elem, attrs) {
				$timeout(function() {
					$(elem).nanoScroller({contentClass: 'nano-content', iOSNativeScrolling: true, alwaysVisible: attrs.nanoScroller=='1' });
				}, 0);

				$scope.$parent.$on("App-Scrollbar-Changed", function() {
					$timeout(function() {
						$(elem).nanoScroller({contentClass: 'nano-content', iOSNativeScrolling: true, alwaysVisible: attrs.nanoScroller=='1' });
					}, 0);
				});
			}
		};
	}
]);

services.factory("Boot", [
  "$rootScope", function($rootScope) {
    return {
      broadcast: function(event, msg) {
        return $rootScope.$broadcast(event, msg);
      }
    };
  }
]);

services.factory("Api", [
  "$http", function($http) {
	return {
	  path: "/api/",
	  timeout: 5000,
	  check: function(json, config) {
		if (json == null) {
		  json = [];
		}
		if (config == null) {
		  config = [];
		}
		/*if (config.mustAuth && json.auth === false) {
		  return window.location = '/account';
		}*/
	  },
	  get: function(url, callback, config) {
		var _this;
		_this = this;
		return $http.get(this.path + url, {
		  timeout: this.timeout
		}).success(function(json) {
		  _this.check(json, config);
		  return callback(json);
		}).error(function() {
		  return callback({
			result: false,
			error: ''
		  });
		});
	  },
	  create: function(url, params, callback, config) {
		var _this;
		_this = this;
		return $http({
		  url: this.path + url,
		  method: "POST",
		  data: params,
		  timeout: this.timeout,
		  headers: {
			"Content-Type": "application/json; charset=UTF-8"
		  }
		}).success(function(json) {
		  _this.check(json, config);
		  return callback(json);
		}).error(function() {
		  return callback({
			result: false,
			error: ''
		  });
		});
	  },
	  update: function(url, params, callback, config) {
		var _this;
		_this = this;
		return $http({
		  url: this.path + url,
		  method: "PUT",
		  data: params,
		  timeout: this.timeout,
		  headers: {
			"Content-Type": "application/json; charset=UTF-8"
		  }
		}).success(function(json) {
		  _this.check(json, config);
		  return callback(json);
		}).error(function() {
		  return callback({
			result: false,
			error: ''
		  });
		});
	  },
	  del: function(url, callback, config) {
		var _this;
		_this = this;
		return $http["delete"](this.path + url, {
		  timeout: this.timeout
		}).success(function(json) {
		  _this.check(json, config);
		  return callback(json);
		}).error(function() {
		  return callback({
			result: false,
			error: ''
		  });
		});
	  }
	};
  }
]);