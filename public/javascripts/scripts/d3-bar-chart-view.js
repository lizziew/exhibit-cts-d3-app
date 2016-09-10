Exhibit.D3BarChartView = function(containerElmt, uiContext) {
	var view = this;
	Exhibit.jQuery.extend(this, new Exhibit.View("D3BarChart", containerElmt, uiContext));

	this.addSettingSpecs(Exhibit.D3BarChartView._settingSpecs);

	this._accessors = {
		getPointLabel : function(itemID, database, visitor) {
			visitor(database.getObject(itemID, "label"));
		},
		getProxy : function(itemID, database, visitor) {
			visitor(itemID);
		},
		getColorKey : null
	};

	// Function maps that allow for other axis scales (logarithmic, etc.), defaults to identity/linear
	//this._axisFuncs = { x: function (x) { return x; }, y: function (y) { return y; } };
	this._axisFuncs = {
		x : function(x) {
			return x;
		}
	};
	this._axisInverseFuncs = {
		x : function(x) {
			return x;
		}
	};
	//this._axisInverseFuncs = { x: function (x) { return x; }, y: function (y) { return y; } };

	this._colorKeyCache = new Object();
	this._maxColor = 0;

	this._onItemsChanged = function() {
		view._reconstruct();
	};

	Exhibit.jQuery(uiContext.getCollection().getElement()).bind("onItemsChanged.exhibit", view._onItemsChanged);

	this.register();
};
Exhibit.D3BarChartView._settingSpecs = {
	"plotHeight" 		: {type : "int", 	 defaultValue : 400},
	"plotWidth"			: {type : "int"},
	"xAxisMin" 			: {type : "float", 	 defaultValue : Number.POSITIVE_INFINITY},
	"xAxisMax" 			: {type : "float", 	 defaultValue : Number.NEGATIVE_INFINITY},
	"axisType" 			: {type : "enum", 	 defaultValue : "linear",choices : ["linear", "logarithmic", "log"]},
	"yAxisMin" 			: {type : "float",	 defaultValue : Number.POSITIVE_INFINITY},
	"yAxisMax" 			: {type : "float",	 defaultValue : Number.NEGATIVE_INFINITY},
	"yAxisType" 		: {type : "enum",	 defaultValue : "linear",choices : ["linear", "logarithmic", "log"]},
	"valueLabel" 		: {type : "text",	 defaultValue : "x"},
	"groupLabel" 		: {type : "text",	 defaultValue : "y"},
	"color" 			: {type : "text",	 defaultValue : "#FF9000"},
	"colorCoder" 		: {type : "text",	 defaultValue : null},
	"scroll" 			: {type : "boolean", defaultValue : false},
	"verticalChart"  	: {type : "boolean", defaultValue : true},
	"lineChart"			: {type : "boolean", defaultValue : false},
	"tickNum"			: {type : "int"},
	"barWidth"			: {type : "float",   defaultValue : 0.8},
	"values"			: {type : "text"},
	"stacked"			: {type : "boolean", defaultValue : false},
	"stackLabels"		: {type : "text", 	 defaultValue : ""}
};

Exhibit.D3BarChartView._accessorSpecs = [{
	accessorName : "getProxy",
	attributeName : "proxy"
}, {
	accessorName : "getPointLabel",
	attributeName : "pointLabel"
}, {
	accessorName : "getXY",
	alternatives : [{
		bindings : [{
			attributeName : "axisData",
			types : ["float", "text"],
			bindingNames : ["values", "groupedBy"]
		}]
	}]
}, {
	accessorName : "getColorKey",
	attributeName : "colorKey",
	type : "text"
}];

Exhibit.D3BarChartView.create = function(configuration, containerElmt, uiContext) {
	var view = new Exhibit.D3BarChartView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
	Exhibit.D3BarChartView._configure(view, configuration);

	view._internalValidate();
	view._initializeUI();
	return view;
};

Exhibit.D3BarChartView.createFromDOM = function(configElmt, containerElmt, uiContext) {
	var configuration = Exhibit.getConfigurationFromDOM(configElmt);
	var view = new Exhibit.D3BarChartView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));

	Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, view.getSettingSpecs(), view._settings);
	Exhibit.D3BarChartView.updateAccessorSpecs(Exhibit.D3BarChartView._accessorSpecs, view._settings['values'], view._settings['stacked'], configElmt);
	Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.D3BarChartView._accessorSpecs, view._accessors);
	Exhibit.D3BarChartView._configure(view, configuration);

	view._internalValidate();
	view._initializeUI();
	return view;
};

Exhibit.D3BarChartView._configure = function(view, configuration) {
	Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.D3BarChartView._accessorSpecs, view._accessors);
	Exhibit.SettingsUtilities.collectSettings(configuration, view.getSettingSpecs(), view._settings);

	view._axisFuncs.x = Exhibit.D3BarChartView._getAxisFunc(view._settings.axisType);
	view._axisInverseFuncs.x = Exhibit.D3BarChartView._getAxisInverseFunc(view._settings.axisType);

	var accessors = view._accessors;

	//itemID is an item in _uiContext.getCollection().getRestrictedItems()'s _hash, for example.
	//database comes from _uiContext.getDatabase()
	//visitor is a function that takes one argument. In this case it will be:
	// function(xy) { if ("x" in xy && "y" in xy) xys.push(xy); }

	view._getXY = function(itemID, database, visitor) {
		accessors.getProxy(itemID, database, function(proxy) {
			accessors.getXY(proxy, database, visitor);
		});
	};
};

// Update accessor specs based on values attribute
Exhibit.D3BarChartView.updateAccessorSpecs = function(specs, values, stacked, configElmt){
	var valuesList = values.split(",");
	var binding = [];
	// one value given
	if (!stacked) {
		binding = [{
			attributeName : "values",
			type : "float",
			bindingName : "x0"
		}, {
			attributeName : "groupedBy",
			type : "text",
			bindingName : "y"
		}]
	} else{
		// multiple values given
		for (var i = 0; i < valuesList.length; i++){
			var value = valuesList[i].trim();
			(function (value){
				binding.push({
					attributeName: function(){return value},
					type: "float",
					bindingName : "x" + i.toString()
				});
			})(value);
		}
		binding.push({
			attributeName : "groupedBy",
			type : "text",
			bindingName : "y"
		});
	}
	specs[2].alternatives.push({bindings : binding});
}

// Convenience function that maps strings to respective functions
Exhibit.D3BarChartView._getAxisFunc = function(s) {
	if (s == "logarithmic" || s == "log") {
		return function(x) {
			return (Math.log(x) / Math.log(10.0));
		};
	} else {
		return function(x) {
			return x;
		};
	}
}
// Convenience function that maps strings to respective functions
Exhibit.D3BarChartView._getAxisInverseFunc = function(s) {
	if (s == "log" || s == "logarithmic") {
		return function(x) {
			return Math.pow(10, x);
		};
	} else {
		return function(x) {
			return x;
		};
	};
}

Exhibit.D3BarChartView.evaluateSingle = function(expression, itemID, database) {
	return expression.evaluateSingleOnItem(itemID, database).value;
}

Exhibit.D3BarChartView.prototype.dispose = function() {
	Exhibit.jQuery(this.getUIContext().getCollection().getElement()).unbind("onItemsChanged.exhibit", this._onItemsChanged);

	this._dom.dispose();
	this._dom = null;

	this._dispose();
};

Exhibit.D3BarChartView.prototype._internalValidate = function() {
	if ("getColorKey" in this._accessors) {
		if ("colorCoder" in this._settings) {
			this._colorCoder = this.getUIContext().getMain().getComponent(this._settings.colorCoder);
		}

		if (this._colorCoder == null) {
			this._colorCoder = new Exhibit.DefaultColorCoder(this.getUIContext());
		}
	}
};

Exhibit.D3BarChartView.prototype._initializeUI = function() {
	var self = this;
	var legendWidgetSettings = "_gradientPoints" in this._colorCoder ? "gradient" : {}

	this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(this.getContainer(), this.getUIContext(), true, // showSummary
	{
		onResize : function() {
			self._reconstruct();
		}
	}, legendWidgetSettings);
	this._dom.plotContainer.className = "exhibit-barChartView-plotContainer";
	this._dom.plotContainer.style.height = this._settings.plotHeight + "px";
	if (this._settings.plotWidth){
		this._dom.plotContainer.style.width = this._settings.plotWidth + "px";
	}
	
	this._reconstruct();
};

Exhibit.D3BarChartView.prototype._reconstruct = function() {
	var self, d3Data, colorCodingFlags, collection, container, database, settings, unplottableItems, color, accessors, vertical_chart, scaleX, unscaleX, currentSize, xyDataPub;
	self = this;
	colorCodingFlags = {
		mixed : false,
		missing : false,
		others : false,
		keys : new Exhibit.Set()
	};
	
	collection = this.getUIContext().getCollection();
	database = this.getUIContext().getDatabase();
	settings = this._settings;
	accessors = this._accessors;
	vertical_chart = settings.verticalChart;
	this._dom.plotContainer.innerHTML = "";

	scaleX = self._axisFuncs.x;
	unscaleX = self._axisInverseFuncs.x;

	currentSize = collection.countRestrictedItems();
	xyDataPub = [];
	unplottableItems = [];
	color = settings.color;
	this._dom.legendWidget.clear();
	d3Data = []; 
	prepareData = function() {
		var index, xAxisMin, xAxisMax, hasColorKey, currentSet, xDiff, numStacks;
		currentSet = collection.getRestrictedItems();
		hasColorKey = (self._accessors.getColorKey != null);
		index = 0;
		xAxisMin = settings.xAxisMin;
		xAxisMax = settings.xAxisMax;
		numStacks = settings.values.split(",").length

		currentSet.visit(function(itemID) {
    		var group, xys, colorKeys, xy, xyKey, xyData, barSum;

    		group = [];
	    		if (hasColorKey){
					accessors.getColorKey(itemID, database, function(item) {
						group.push(item);
				});
			}
			if (group.length > 0) {
				colorKeys = null;

				//console.log("group:")
				//console.log(group); //ratings 
				
				if (hasColorKey) {
					colorKeys = new Exhibit.Set();
					accessors.getColorKey(itemID, database, function(v) {
						colorKeys.add(v);
					});
					color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
				}
			};			
			
			xys = [];
			
			self._getXY(itemID, database, function(axisData) {
				xys.push(axisData);
			});

			if (xys.length > 0) {
				colorKeys = null;
				if (hasColorKey) {
					colorKeys = new Exhibit.Set();
					accessors.getColorKey(itemID, database, function(v) {
						colorKeys.add(v);
					});
					color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
				}
				else {
					color = settings.color;
				}
				
				for (var i = 0; i < xys.length; i++) {
					xy = xys[i];
					if (!settings.stacked){
						try {
							xy['scaledX0'] = scaleX(xy['x0']);
							if (!isFinite(xy['scaledX0'])) {
								continue;
							}
						} catch (e) {
							continue;
						}
						xAxisMin = Math.min(xAxisMin, xy['scaledX0']);
						xAxisMax = Math.max(xAxisMax, xy['scaledX0']);
					} else{
						barSum = 0;
						for (var j = 0; j < numStacks; j++){
							xy['scaledX' + j.toString()] = xy['x' + j.toString()];
							barSum = barSum + xy['scaledX' + j.toString()];
						}
						xAxisMin = Math.min(xAxisMin, barSum);
						xAxisMax = Math.max(xAxisMax, barSum);
					}
										

					xyData = {
						xy : xy,
						items : [itemID]

					};
					if (hasColorKey) {
						xyData.colorKeys = colorKeys;
					}
				}
			} else {
				unplottableItems.push(itemID);
			}
			if ( typeof xyData == "object") {
				xyData.xy.z=index;
				index++;
				if (!settings.stacked){
					var d = {key:xyData.xy.y, value:xyData.xy.scaledX0};
					try {
						d3Data.push(d); 
					}
					catch(e){
						d3Data = [d]; 
					}
				} 
			};
			xyData.xy.color = color;
			xyDataPub.push(xyData);
		});
	}
	
	if (currentSize > 0){
		prepareData();

		container = document.createElement("div");
		container.className = "barChartViewContainer";
		container.style.height = "100%";
		this._dom.plotContainer.appendChild(container);

		console.log(container); 

		this._d3Constructor(d3Data, container);
	}
	
	this._dom.setUnplottableMessage(currentSize, unplottableItems);
};

Exhibit.D3BarChartView.prototype._d3Constructor = function(data, container) {
  var settings= this._settings;
  var xLabel = settings.groupLabel;
  var yLabel = settings.valueLabel;

  /*console.log(xLabel); 
  console.log(yLabel);
  console.log(data); */ 

  var margin = {top: 20, right: 20, bottom: 300, left: 40},
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10, "");

  var svg = d3.select(".barChartViewContainer").append("svg")
  	.classed('svg-container', true)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain(data.map(function(d) { return d.key; }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
  .selectAll("text")
    .attr("y", 0)
    .attr("x", 9)
    .attr("dy", ".35em")
    .attr("transform", "rotate(90)")
    .style("text-anchor", "start"); 

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(yLabel);

  svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.key); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });

  function type(d) {
    d.value = +d.value;
    return d;
  }
};