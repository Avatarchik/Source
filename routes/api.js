exports.getCharts = function(req, res) {
	db.collection('charts').find(/*{},{tracks:0}*/).sort({sort:-1,title:1}).toArray(function(err, results){
		for (var i in results){
			results[i].arts=[];
			
			for(var j in results[i].tracks){
				results[i].arts.push(results[i].tracks[j].art);
				if (j>=2) break;
			}

			delete results[i].tracks;
		}
		res.json({result:true, items:results });
	});
}

exports.getTracks = function(req, res) {
	var id = mongodb.ObjectID(req.params.id);
	db.collection('charts').findOne({'_id':id}, function(err, item) {
		res.json({result:true, items: item.tracks });
	});
}