var request = require('request'),
	cheerio = require('cheerio');

//worker
var worker={
	index: 0,
	items: [],
	iterators: [],
	status: false,

	parse: function(code, body, _id) {
		var $ = cheerio.load(body);
		var tracks=[], index=1;

		if (typeof this.iterators[ _id ] == 'undefined')
			this.iterators[ _id ] = 1;

		index = this.iterators[ _id ];

		switch (code) {
			case 'beatport':
				$('.track-grid-content').each( function() {
		        	var temp = {
		        		index: index++,
		        		title: $('td', this).eq(3).find('a').eq(0).text().trim(),
		        		artist: $('td', this).eq(4).find('a').eq(0).text().trim(),
		        		art: $('.tile-image', this).eq(0).attr('src').trim(),
		        		buy: $('td', this).eq(3).find('a').eq(0).attr('href').trim()
		        	}

		        	temp.art = temp.art.replace('24x24', '64x64');
		        	temp.artBig = temp.art.replace('64x64', '500x500');

		        	tracks.push(temp);
		        } );
			break;
			case 'bbc':
				$('.cht-entry').each( function() {
		        	var temp = {
		        		index: index++,
		        		title: $('.cht-entry-title', this).eq(0).text().trim(),
		        		artist: $('.cht-entry-artist', this).eq(0).text().trim(),
		        		art: $('.cht-entry-image', this).eq(0).attr('src').trim(),
		        		//buy: $('td', this).eq(3).find('a').eq(0).attr('href')
		        	}

		        	temp.artBig = temp.art.replace('112x112', '160x160');

		        	tracks.push(temp);
		        } );
			break;
			case 'billboard':
				$('.song_review').each( function() {
					var temp = {
		        		index: index++,
		        		title: $('header h1', this).eq(0).text().trim(),
		        		artist: $('.chart_info a', this).eq(0).text().trim(),
		        		art: $('.img-wrap img', this).eq(0).attr('src').trim(),
		        		//buy: $('td', this).eq(3).find('a').eq(0).attr('href')
		        	}

		        	temp.artBig = temp.art;

		        	tracks.push(temp);
				} );
			break;
			case 'junodownload':
				$('.productlist_widget_container').each( function() {
					var temp = {
		        		index: index++,
		        		title: $('.productlist_widget_product_title span a', this).eq(0).text().trim(),
		        		artist: $('.productlist_widget_product_artists span a', this).eq(0).text().trim().toLowerCase(),
		        		art: $('.productimage img', this).eq(0).attr('rel'),
		        		buy: 'http://www.junodownload.com' + $('.productlist_widget_product_title span a', this).eq(0).attr('href')
		        	}

		        	if (typeof temp.art=='undefined')
		        		temp.art = $('.productimage img', this).eq(0).attr('src');

		        	temp.artBig = temp.art.replace('/75/', '/full/');
		        	temp.artBig = temp.artBig.replace('TN.', 'BIG.');

		        	tracks.push(temp);
				} );
			break;
			case 'itunes':
				$('.main .grid ul li').each( function() {
					var temp = {
		        		index: index++,
		        		title: $('h3', this).eq(0).text().trim(),
		        		artist: $('h4', this).eq(0).text().trim(),
		        		art: $('img', this).eq(0).attr('src'),
		        		buy: $('a', this).eq(0).attr('href')
		        	}

		        	temp.artBig = temp.art;

		        	tracks.push(temp);
				} );
			break;
			case 'djtunes':
				$('.trackListItem_xl').each( function() {
					var temp = {
		        		index: index++,
		        		title: $('.trackName a', this).eq(0).text().trim(),
		        		artist: $('.artistName', this).eq(0).text().trim(),
		        		art: $('.cover img', this).eq(0).attr('src'),
		        		buy: 'http://www.djtunes.com' + $('.trackName a', this).eq(0).attr('href')
		        	}

		        	temp.artBig = temp.art.replace(',60/d/', ',500/d/');

		        	tracks.push(temp);
				} );
			break;
		}

		this.iterators[ _id ]=index;

		return tracks;
	},

	check: function() {
		this.index++;
		if (this.index<this.count)
			this.start();
		else{
			this.index=0;
			this.items=[];
			this.iterators=[];
			this.status=false;
			console.log('end');
			//process.abort();
		}
	},

	start: function() {
		request.get({url: worker.items[worker.index].url, timeout: 5000}, function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		    	var tracks = worker.parse(worker.items[worker.index].code, body, worker.items[worker.index]._id);

		    	if (tracks.length>0){
		    		if (worker.items[worker.index].append){
		    			db.collection('charts').update(
		    				{ '_id': mongodb.ObjectID(worker.items[worker.index]._id.toString()) },
		    				{ $pushAll: { tracks: tracks } },
		    				function(err,item) {
								//console.log('append multi chart: ' + worker.items[worker.index].url);
								worker.check();
								return false;
							}
		    			);
		    		}
		    		else
				    	db.collection('charts').findAndModify(
							{ '_id': mongodb.ObjectID(worker.items[worker.index]._id.toString()) },
							[['_id', 1]],
							{ $set: {"lastUpdate": new Date(), "tracks": tracks} },
							{ new: true },
							function(err,item) {
								//console.log('add single chart: ' + worker.items[worker.index].url);
								worker.check();
								return false;
							}
						);
				}
			   	else
			   		worker.check();
		    }
		    else
		    	worker.check();
		});
	},

	init: function() {
		if (!this.status){
			this.index=0;
			this.items=[];
			this.iterators=[];
			this.status=true;

			db.collection('charts').find({},{_id:1,code:1,url:1}).sort({sort:-1,title:1}).toArray(function(err, results){
				worker.items = [];
				for(var i in results){
					results[i].append = false;

					if (typeof results[i].url == 'string')
						worker.items.push(results[i]);
					else{
						//если много урлов
						for(var u in results[i].url){
							var temp = JSON.parse(JSON.stringify(results[i]));
							temp.url = results[i].url[u];
							if (u>0)
								temp.append = true;

							worker.items.push(temp);
						}
					}
				}
				
				worker.count = worker.items.length;
				worker.start();
			});
		}
	}
}


var cronJob = require('cron').CronJob;
//Start
mongodb = require('mongodb');
mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/db', function(err,clientDb) {
	if(err) throw err;
	db=clientDb;
	db.authenticate("login", "pswd", function(err) {
		if(err) throw err;
		
		new cronJob('00 00 01 * * *', function(){
    		worker.init();
		}, null, true);
	});
});