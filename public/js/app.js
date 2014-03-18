var app = angular.module("fulltrack", ["ui.router", "fulltrack.services", "pasvaz.bindonce"]);

app.config(function($locationProvider, $stateProvider, $urlRouterProvider) {
	$locationProvider.html5Mode(true);
	$urlRouterProvider.otherwise("/app");
	
	$stateProvider
	.state('welcome', {
		url: "/",
		templateUrl: "/templates/welcome.html?",
		controller: Welcome
    })
	.state('app', {
		url: "/app",
		templateUrl: "/templates/app.html?",
		controller: App
    })
    .state('frame', {
		url: "/frame?tracks",
		templateUrl: "/templates/frame.html?",
		controller: App
    });
});

app.run(function($rootScope, $state) {
	$rootScope.$state = $state;
});

var Welcome = function($scope, $social) {
	/* USER */
	$scope.user = {
		logged: false,
		login: function() {
			$social.login( function(status) {
				if (status)
					$scope.$state.transitionTo('app');
			} );
		}
	}

	$social.init(function(status) {
		$scope.user.logged = status;
		if (status)
			$scope.$state.transitionTo('app');
	});
}

var App = function($scope, $social, $lastFm, Api, $rootScope, Boot, durationFilter, $stateParams) {
	var apply=function() {
		try {if(!$scope.$$phase) $scope.$apply()} catch(e) {}
	}

	var player = document.getElementById('player');

	/* USER */
	$scope.user = {
		logged: false,
		logout: function() {
			$social.logout(function(){
				$scope.$state.transitionTo('welcome');
			});
		}
	}

	$social.init(function(status) {
		$scope.user.logged = status;
		if (!status)
			$scope.$state.transitionTo('welcome');
		else
			$scope.user.current = status;
	});

	$scope.charts={
		//id: 0,
		tab: 0,

		current: {},
		chart: {},
		playing: false,

		items: [],
		tracks: [],
		tags: [],
		countries: [],
		sites: [],

		filter: {
			
		},
		sort: 'index',
		sortDirection: false,
		view: 'sidebar',

		loading: false,

		setChartsFilter: function(index,val){
			if (val!='')
				this.filter[index] = val;
			else
				delete this.filter[index];

			Boot.broadcast("App-Scrollbar-Changed", true);
		},

		load: function() {
			$scope.charts.loading=true;

			Api.get("charts", function(json){
				$scope.charts.items = json.items;
				$scope.charts.loadTags();
				Boot.broadcast("App-Scrollbar-Changed", true);
				$scope.charts.loading=false;
				//$scope.charts.id = json.items[0]._id;
				//$scope.charts.openChart();
			});
		},

		loadTags: function() {
			this.tags = [];
			this.countries = [];

			for(var i in this.items){
				//tag
				for(var j in this.items[i].tags){
					var no=true;
					for(var t in this.tags)
						if (this.items[i].tags[j] == this.tags[t])
							no=false;

					if (no)
						this.tags.push(this.items[i].tags[j]);
				}

				//country
				var no=true;
				for(var c in this.countries)
					if (this.countries[c] == this.items[i].country)
						no=false;

				if ((no)&&($.trim(this.items[i].country)!=''))
					this.countries.push(this.items[i].country);

				//sites
				no=true;
				for(var c in this.sites)
					if (this.sites[c] == this.items[i].code)
						no=false;

				if ((no)&&($.trim(this.items[i].code)!=''))
					this.sites.push(this.items[i].code);
			}

			this.tags = this.tags.sort();
			this.countries = this.countries.sort();
			this.sites = this.sites.sort();
		},

		openChart: function(autoplay) {
			$scope.charts.loading=true;

			this.reset();
			this.pause();

			for(var i in this.items)
				if (this.items[i]._id == this.id){
					this.chart = this.items[i];
					break;
				}

			Api.get("charts/"+this.id, function(json){
				$scope.charts.tracks = json.items;
				
				if (typeof autoplay != 'undefined'){
					$scope.charts.view = '';
					$scope.charts.play();
				}

				$scope.charts.loading=false;
			});
		},

		reset: function() {
			if (!$scope.user.logged) return false;

			this.playing = false;
			this.current = {};
			apply();
		},

		open: function(index, callback){
			if (!$scope.user.logged) return false;

			this.pause();
			this.current = this.tracks[ index ];
			this.current.index = index;

			if (typeof this.current.url == 'undefined'){
				$social.getTrack( this.current, $scope.user.logged, function(json) {
					if (json){
						$scope.charts.current.url = json.url;
						$scope.charts.current.duration = parseInt(json.duration);
						$scope.charts.current.vk = json.vk;
						$scope.charts.play();

						if (!$scope.charts.current.buy)
							$social.itunesBuyUrl($scope.charts.current.artist + ' ' + $scope.charts.current.title, function(buyLink){
								if (buyLink){
									$scope.charts.current.buy = buyLink;
									apply();
								}
							});
					}
					else{
						$scope.charts.current.status = 'no';
						//$scope.charts.current={}
						apply();
					}

					if (typeof callback != 'undefined')
						callback(json!=false);
					else{
						if (!json) $scope.charts.reset();
					}
				});
			}else{
				this.play();
				if (typeof callback != 'undefined')
					callback(json!=false);
				else{
					//$scope.charts.reset();
				}
			}
		},

		play: function() {
			if (!$scope.user.logged) return false;

			if (typeof this.current.index == 'undefined'){
				this.next();
			}
			else{
				this.playing = true;
				apply();
				player.play();
			}
		},

		pause: function() {
			if (!$scope.user.logged) return false;

			this.playing = false;
			player.pause();
		},

		prev: function() {
			if (!$scope.user.logged) return false;

			var index=-1;
			if (typeof this.current.index != 'undefined')
				index = this.current.index - 1;

			if (index >= 0)
				this.open( index, function(result) {
					if (!result)
						$scope.charts.prev();
				} );
			else{
				this.reset();
				this.pause();
			}
		},

		next: function() {
			if (!$scope.user.logged) return false;

			var index=0;
			if (typeof this.current.index != 'undefined')
				index = this.current.index + 1;

			if (index < this.tracks.length)
				this.open( index, function(result) {
					if (!result)
						$scope.charts.next();
				} );
			else{
				this.reset();
				this.pause();
			}
		},

		addToVk: function(index) {
			$social.vkAudioAdd(this.tracks[index].vk, function(status) {
				console.log(status);
				if (!status.error){
					delete $scope.charts.tracks[index].vk;
					apply();
				}
			});
		}
	};


	$scope.lastFm = {
		artists: [],
		albums: [],
		tags: [],

		tab: '',
		search: {
			artist: '',
			genre: ''
		},

		ratingFilter: 0,

		openArtist: function(q) {
			$scope.charts.loading=true;

			var _this = this;

			$scope.charts.view = 'sidebar';

			this.currentArtist = {name: q};
			this.albums = [];
			delete this.currentAlbum;
			$scope.charts.tab = 2;

			$lastFm.getTopAlbums(q, function(json) {
				_this.albums = json;
				Boot.broadcast("App-Scrollbar-Changed", true);
				$scope.charts.loading=false;
			});

			$lastFm.getAboutArtist(q, function(json) {
				_this.currentArtist = json;
				Boot.broadcast("App-Scrollbar-Changed", true);
				$scope.charts.loading=false;
			});
		},

		load: function(rF) {
			$scope.charts.loading=true;

			this.ratingFilter = rF || 0;

			var _this = this;

			switch(this.ratingFilter){
				case 0:
					$lastFm.getTopArtists(function(json) {
						_this.artists = json;
						Boot.broadcast("App-Scrollbar-Changed", true);
						$scope.charts.loading=false;
					});
				break;
				case 1:
					$lastFm.getHypedArtists(function(json) {
						_this.artists = json;
						Boot.broadcast("App-Scrollbar-Changed", true);
						$scope.charts.loading=false;
					});
				break;
				case 2:
					$lastFm.getGeoTopArtists('russia', function(json) {
						_this.artists = json;
						Boot.broadcast("App-Scrollbar-Changed", true);
						$scope.charts.loading=false;
					});
				break;
			}

			$lastFm.getTopTags(function(json){
				_this.tags = json;
				apply();
			});
		},

		openTopTracks: function() {
			$scope.charts.loading=true;

			var _this = this;

			$scope.charts.reset();
			$scope.charts.pause();

			$scope.charts.chart = {
				title: this.currentArtist.name
			}

			this.currentAlbum = -1;

			$lastFm.getTopTracks(this.currentArtist.name, function(json) {
				$scope.charts.tracks = json;

				$scope.charts.view = '';
				$scope.charts.play();
				$scope.charts.loading=false;
			});
		},

		openAlbum: function(index) {
			$scope.charts.loading=true;

			var _this = this;

			$scope.charts.reset();
			$scope.charts.pause();

			$scope.charts.chart = {
				title: this.albums[index].name
			}

			this.currentAlbum = index;

			$lastFm.getTracksFromAlbum(this.currentArtist.name, this.albums[index].name, function(json) {
				$scope.charts.tracks = json;

				$scope.charts.view = '';
				$scope.charts.play();
				$scope.charts.loading=false;
			});
		},

		searchArtist: function() {
			$scope.charts.loading=true;

			this.ratingFilter = -1;

			var _this = this;

			if (this.tab=='artist')
			$lastFm.searchArtist(this.search.artist, function(json) {
				_this.artists = json;
				Boot.broadcast("App-Scrollbar-Changed", true);
				$scope.charts.loading=false;
			});
			else if (this.tab=='genre')
			$lastFm.getArtistsByGenre(this.search.genre, function(json) {
				_this.artists = json;
				Boot.broadcast("App-Scrollbar-Changed", true);
				$scope.charts.loading=false;
			});
		}
	}


	//player
	$("#volume").val( player.volume*10 );
	$("#volume").bind("change", function() {
        player.volume = parseInt($(this).val())*0.1;
    });
    $("#seek").bind("mousedown", function() {
        $scope.charts.pause();
    });
	$("#seek").bind("change", function() {
        player.currentTime = $(this).val();
        $scope.charts.play();
    });
	player.addEventListener("timeupdate", function(){
		$("#seek").val(parseInt(player.currentTime, 10));
		$('#seekLeftTime').html( '-' + durationFilter(player.duration - player.currentTime) );
	});
	player.addEventListener("loadedmetadata", function() {
		$scope.charts.current.duration = player.duration;
		$("#seek").attr("max", player.duration);
		$("#volume").val( player.volume*10 );
	});
	player.addEventListener("ended", function() {
		if ($scope.charts.playing)
			$scope.charts.next()
	});

	//init
	if (typeof $stateParams.tracks != 'undefined'){
		$scope.charts.tracks = JSON.parse($stateParams.tracks);
		$scope.charts.play();
	}
	else{
		$scope.charts.load();
		$scope.lastFm.load();
	}
}