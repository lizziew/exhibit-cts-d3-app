Exhibit.D3ScatterPlotView = function(containerElmt, uiContext) {
	var view = this;
	Exhibit.jQuery.extend(this, new Exhibit.View("D3ScatterPlot", containerElmt, uiContext));

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
Exhibit.D3ScatterPlotView._settingSpecs = {
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

Exhibit.D3ScatterPlotView._accessorSpecs = [{
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

Exhibit.D3ScatterPlotView.create = function(configuration, containerElmt, uiContext) {
	var view = new Exhibit.D3ScatterPlotView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
	Exhibit.D3ScatterPlotView._configure(view, configuration);

	view._internalValidate();
	view._initializeUI();
	return view;
};

Exhibit.D3ScatterPlotView.createFromDOM = function(configElmt, containerElmt, uiContext) {
	var configuration = Exhibit.getConfigurationFromDOM(configElmt);
	var view = new Exhibit.D3ScatterPlotView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));

	Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, view.getSettingSpecs(), view._settings);
	Exhibit.D3ScatterPlotView.updateAccessorSpecs(Exhibit.D3ScatterPlotView._accessorSpecs, view._settings['values'], view._settings['stacked'], configElmt);
	Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.D3ScatterPlotView._accessorSpecs, view._accessors);
	Exhibit.D3ScatterPlotView._configure(view, configuration);

	view._internalValidate();
	view._initializeUI();
	return view;
};

Exhibit.D3ScatterPlotView._configure = function(view, configuration) {
	Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.D3ScatterPlotView._accessorSpecs, view._accessors);
	Exhibit.SettingsUtilities.collectSettings(configuration, view.getSettingSpecs(), view._settings);

	view._axisFuncs.x = Exhibit.D3ScatterPlotView._getAxisFunc(view._settings.axisType);
	view._axisInverseFuncs.x = Exhibit.D3ScatterPlotView._getAxisInverseFunc(view._settings.axisType);

	var accessors = view._accessors;

	view._getXY = function(itemID, database, visitor) {
		accessors.getProxy(itemID, database, function(proxy) {
			accessors.getXY(proxy, database, visitor);
		});
	};
};

// Update accessor specs based on values attribute
Exhibit.D3ScatterPlotView.updateAccessorSpecs = function(specs, values, stacked, configElmt){
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
Exhibit.D3ScatterPlotView._getAxisFunc = function(s) {
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
Exhibit.D3ScatterPlotView._getAxisInverseFunc = function(s) {
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

Exhibit.D3ScatterPlotView.evaluateSingle = function(expression, itemID, database) {
	return expression.evaluateSingleOnItem(itemID, database).value;
}

Exhibit.D3ScatterPlotView.prototype.dispose = function() {
	Exhibit.jQuery(this.getUIContext().getCollection().getElement()).unbind("onItemsChanged.exhibit", this._onItemsChanged);

	this._dom.dispose();
	this._dom = null;

	this._dispose();
};

Exhibit.D3ScatterPlotView.prototype._internalValidate = function() {
	if ("getColorKey" in this._accessors) {
		if ("colorCoder" in this._settings) {
			this._colorCoder = this.getUIContext().getMain().getComponent(this._settings.colorCoder);
		}

		if (this._colorCoder == null) {
			this._colorCoder = new Exhibit.DefaultColorCoder(this.getUIContext());
		}
	}
};

Exhibit.D3ScatterPlotView.prototype._initializeUI = function() {
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

Exhibit.D3ScatterPlotView.prototype._reconstruct = function() {
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
					var d;
					accessors.getColorKey(itemID, database, function(v) {
						d = {key:xyData.xy.y, value:xyData.xy.scaledX0, group: v};
					});
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
		container.className = "scatterPlotViewContainer";
		container.style.height = "100%";
		this._dom.plotContainer.appendChild(container);

		this._d3Constructor(d3Data, container);
	}
	
	this._dom.setUnplottableMessage(currentSize, unplottableItems);
};

Exhibit.D3ScatterPlotView.prototype._d3Constructor = function(data, container) {
  var settings= this._settings;
  var valueLabel = settings.valueLabel;
  var keyLabel = settings.groupLabel;

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var svg = d3.select(".scatterPlotViewContainer").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.json("/javascripts/actionmovies.json", function(error, jsonData) {
    if (error) throw error; 

    x.domain(d3.extent(data, function(d) { return d.key; })).nice();
    y.domain(d3.extent(data, function(d) { return d.value; })).nice();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(keyLabel);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(valueLabel); 

    svg.selectAll(".dot")
        .data(data)
      .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) { console.log(d.key); return x(d.key); })
        .attr("cy", function(d) { console.log(d.value); return y(d.value); })
        .style("fill", function(d) { return color(d.group); });

    var legend = svg.selectAll(".legend")
        .data(color.domain())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; }); 

  });  
};