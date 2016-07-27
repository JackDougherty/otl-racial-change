// Edit the initial year and number of tabs to match your GeoJSON data and tabs in index.html
var year = "1900";
var tabs = 12;

// Edit the center point and zoom level
var map = L.map('map', {
  center: [41.79, -72.6],
  zoom: 10,
  scrollWheelZoom: false
});

// Edit links to your GitHub repo and data source credit
map.attributionControl.setPrefix('View \
<a href="http://github.com/jackdougherty/otl-racial-change" target="_blank"> \
data and code on GitHub</a>, created with <a href="http://leafletjs.com" \
title="A JS library for interactive maps">Leaflet</a>; design by \
<a href="http://ctmirror.org">CT Mirror</a>');

// Basemap layer
new L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright"> \
  OpenStreetMap</a> contributors, &copy; \
  <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

// Edit to upload GeoJSON data from layers folder
$.getJSON("layers/" + year + ".geojson", function (data) {
  geoJsonLayer = L.geoJson(data, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);
});

// Edit range cutoffs and colors to match your data; see http://colorbrewer.org
// colors drawn from http://colorbrewer2.org/?type=sequential&scheme=Oranges&n=9
// Any values not listed in the ranges below displays as the last color
function getColor(d) {
  return d > 98 ? '#fff5eb' :
  d > 90 ? '#fee6ce' :
  d > 75 ? '#fdd0a2' :
  d > 60 ? '#fdae6b' :
  d > 40 ? '#fd8d3c' :
  d > 25 ? '#f16913' :
  d > 10 ? '#d94801' :
  d > 02 ? '#a63603' :
  d >= 0 ? '#7f2704' :
  'gray' ;
}

// Edit the getColor property to match data properties in your GeoJSON layers
// In this example, columns follow this pattern: index1910, index1920...
function style(feature) {
  return {
    fillColor: getColor(parseFloat(feature.properties.pctw)),
    weight: 1,
    opacity: 1,
    color: 'black',
    fillOpacity: 0.9
  };
}

// This highlights the polygon on hover, also for mobile
function highlightFeature(e) {
  resetHighlight(e);
  var layer = e.target;
  layer.setStyle({
    weight: 4,
    color: 'black',
    fillOpacity: 0.7
  });
  info.update(layer.feature.properties);
}

// This resets the highlight after hover moves away
function resetHighlight(e) {
  geoJsonLayer.setStyle(style);
  info.update();
}

// This instructs highlight and reset functions on hover movement
function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: highlightFeature
  });
}

// Creates an info box on the map
var info = L.control();
info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};

// Edit info box labels (such as props.name) to match properties of the GeoJSON data
info.update = function (props) {
  var areaName = "Hover over areas";
  var areaValueP = " ";
  var areaValueW = " ";
  var areaValueNW = " ";
  var areaLabelP = "population";
  var areaLabelW = "white";
  var areaLabelNW = "non-white";

  if (props) {
    areaName = props.town + " " + props.area + " " + checkNull(props.num);
    areaValueP = checkNull(props.pop);
    areaValueW = checkNull(props.pctw);
    areaValueNW = checkNull(props.pctnw);
  }

  this._div.innerHTML = '<div class="areaName">' + areaName +
  '</div><div class="areaLabel"><div class="areaValue">' +
  areaValueP + ' ' + areaLabelP + '<br />' +
  areaValueW + '&#37; ' + areaLabelW + '<br />' +
  areaValueNW + '&#37; ' + areaLabelNW + '</div>';
};
info.addTo(map);

// When a new tab is selected, this removes/adds the GeoJSON data layers
$(".tabItem").click(function() {
  $(".tabItem").removeClass("selected");
  $(this).addClass("selected");
  year = $(this).html();
  // year = $(this).html().split("-")[1];  /* use for school years, eg 2010-11 */

  map.removeLayer(geoJsonLayer);

  $.getJSON("layers/" + year + ".geojson", function (data) {
    geoJsonLayer = L.geoJson(data, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);
  });

  geoJsonLayer.setStyle(style);
});

// Edit grades in legend to match the range cutoffs inserted above
// In this example, the last grade will appear as "98+"
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend'),
  grades = [0, 2, 10, 25, 40, 60, 75, 90, 98],
  labels = [],
  from, to;
  for (var i = 0; i < grades.length; i++) {
    from = grades[i];
    to = grades[i + 1];
    labels.push(
      '<i style="background:' + getColor(from) + '"></i> ' +
      from + (to ? '&ndash;' + to : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
  };
  legend.addTo(map);

  // In info.update, this checks if GeoJSON data contains a null value, and if so displays a blank space (" ")
  function checkNull(val) {
    if (val != null || val == "NaN") {
      return comma(val);
    } else {
      return " ";
    }
  }

  // Use in info.update if GeoJSON data needs to be displayed as a percentage
  function checkThePct(a,b) {
    if (a != null && b != null) {
      return Math.round(a/b*1000)/10 + "%";
    } else {
      return "--";
    }
  }

  // Use in info.update if GeoJSON data needs to be displayed with commas (such as 123,456)
  function comma(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
      val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return val;
  }

  // This watches for arrow keys to advance the tabs
  $("body").keydown(function(e) {
    var selectedTab = parseInt($(".selected").attr('id').replace('tab', ''));
    var nextTab;

    // previous tab with left arrow
    if (e.keyCode == 37) {
      nextTab = (selectedTab == 1) ? tabs : selectedTab - 1;
    }
    // next tab with right arrow
    else if (e.keyCode == 39)  {
      nextTab = (selectedTab == tabs) ? 1 : selectedTab + 1;
    }

    $('#tab' + nextTab).click();
  });
