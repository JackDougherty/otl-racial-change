$(document).ready(function() {

  // Edit the initial year and number of tabs to match your GeoJSON data and tabs in index.html
  var tabs = 13;
  var choroplethLayer;
  var townBoundariesLayer;
  var choroplethOpacity = 1;

  // Edit the center point and zoom level
  var map = L.map('map', {
    center: [41.79, -72.6],
    zoom: 10,
    scrollWheelZoom: false,
    keyboard: false,
  });

  // Edit links to your GitHub repo and data source credit
  map.attributionControl.setPrefix('Sources: <a href="https://www.census.gov/prod/www/decennial.html" target="_blank">US Census</a>, \
    <a href="https://socialexplorer.org" target="_blank">Social Explorer</a>, \
    <a href="https://www.nhgis.org" target="_blank">IPUMS NHGIS</a>. \
    View <a href="http://github.com/ontheline/otl-racial-change" target="_blank"> \
    data and code on GitHub</a>; design by \
    <a href="http://ctmirror.org">CT Mirror</a>');

  // Basemap CartoDB layer with no labels
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright"> \
    OpenStreetMap</a> contributors, &copy; \
    <a href="http://cartodb.com/attributions">CartoDB</a>'
  }).addTo(map);

  // CartoDB Labels only, put in marker pane so they're above choropleth
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'markerPane',
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright"> \
    OpenStreetMap</a> contributors, &copy; \
    <a href="http://cartodb.com/attributions">CartoDB</a>'
  }).addTo(map);

  // Add town boundaries geojson layer
  $.getJSON('layers/towns.geojson', function (data) {
    townBoundariesLayer = L.geoJson(data, {
      style: {
        color: 'black',
        fillOpacity: 0,
        opacity: 1,
        weight: 1,
        interactive: false,
      },
    }).addTo(map);

    //resetChoropleth('1900');

  });

  // Edit range cutoffs and colors to match your data; see http://colorbrewer.org
  // colors drawn from http://colorbrewer2.org/?type=sequential&scheme=Oranges&n=9
  // Any values not listed in the ranges below displays as the last color
  function getColor(d) {
    return d > 95 ? '#fff5eb' :
      d > 90 ? '#fee6ce' :
      d > 75 ? '#fdd0a2' :
      d > 60 ? '#fdae6b' :
      d > 40 ? '#fd8d3c' :
      d > 25 ? '#f16913' :
      d > 10 ? '#d94801' :
      d > 5 ? '#a63603' :
      d >= 0 ? '#7f2704' :
      'gray' ;
  }

  // Edit the getColor property to match data properties in your GeoJSON layers
  function style(feature) {
    return {
      fillColor: getColor(parseFloat(feature.properties.pctwnh)),
      weight: 0.5,
      opacity: 1,
      color: 'black',
      fillOpacity: choroplethOpacity
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
    choroplethLayer.setStyle(style);
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
    this._div = L.DomUtil.create('div', 'control-custom info');
    this.update();
    return this._div;
  };

  // Edit info box labels (such as props.name) to match properties of the GeoJSON data
  info.update = function (props) {

    if (props) {
      this._div.innerHTML = '<h2>'
        + (props.town || '') + ' '
        + (props.area || '') + ' '
        + (props.num || '')
        + '</h2>';

      // In the info window, we want to display
      // "X % White" for 1900 thru 1950
      // "X % White (non-Hispanic)" for 1960 thru 1990
      // "X % White alone (non-Hispanic) for 2000 onward
      var year = parseInt($('.tabItem.selected').html());
      var whiteSuffix = '';
      var whiteSuffix = year >= 1960 && year <= 1990 ? '(non-Hispanic)' : whiteSuffix;
      whiteSuffix = year >= 2000 ? 'alone (non-Hispanic)' : whiteSuffix;

      this._div.innerHTML += '<p>' + props.pctwnh + '% White ' + whiteSuffix + '</p>';
      this._div.innerHTML += '<p style="margin-bottom: 7px;">' + props.pop.toLocaleString() + ' population</p>';

      for (var prop in props) {
        // Only show properties thare are not null and start with the capital letter (apart from Source)
        if (props[prop] && prop[0] === prop[0].toUpperCase() && prop !== 'Source') {
          this._div.innerHTML += '<p>' + props[prop].toLocaleString() + ' ' + prop + '</p>';
        }
      }

      // Add Source as the final property, with reverse order and a colon
      if (props['Source']) {
        this._div.innerHTML += '<p style="margin-top: 7px; color: gray;">Source: ' + props['Source'] + '</p>';
      }

    }

    // If not hovering a polygon
    else {
      this._div.innerHTML = '<h2 class="f5 fw7 mv1"> Hover over areas </h2>';
    }

  };

  info.addTo(map);

  function resetChoropleth(year) {
    if (choroplethLayer && map.hasLayer(choroplethLayer)) {
      map.removeLayer(choroplethLayer);
    }

    $.getJSON("layers/" + year + ".geojson", function (data) {
      choroplethLayer = L.geoJson(data, {
        style: style,
        onEachFeature: onEachFeature
      }).addTo(map);

      // Keep town boundaries on top
      if (map.hasLayer(townBoundariesLayer)) {
        townBoundariesLayer.bringToFront();
      }
    });
  }

  // When a new tab is selected, this removes/adds the GeoJSON data layers
  $(".tabItem").click(function() {

    $(".tabItem").removeClass("selected");
    $(this).addClass("selected");

    resetChoropleth( $(this).html() );

    // Manually trigger "moveend" so that hash updates, without really moving
    map.setZoom(map.getZoom());
  });


  // Edit grades in legend to match the range cutoffs inserted above
  // In this example, the last grade will appear as "98+"
  var legend = L.control({position: 'bottomright'});

  function getHTMLScale() {
    var grades = [0, 5, 10, 25, 40, 60, 75, 90, 95];
    var labels = [];

    for (var i = 0; i < grades.length; i++) {
      var from = grades[i];
      var to = grades[i + 1];
      labels.push(
        '<i style="background:' + getColor(from + 0.5) + ';opacity:' + choroplethOpacity + '"></i> ' +
        from + (to ? '&ndash;' + to : '+'));
    }

    return '<h4>% White</h4>' + labels.join('<br>');
  }

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'control-custom legend');
    div.innerHTML = getHTMLScale();
    return div;
  };

  legend.update = function(props) {
    legend._container.innerHTML = getHTMLScale();
  }

  legend.addTo(map);


  // This watches for arrow keys to advance the tabs
  $("body").keydown(function(e) {
    var selectedTab = parseInt( $(".selected").attr('id').replace('tab', '') );
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


  // Add Opacity control
  var opacity = L.control({position: 'bottomleft'});
  opacity.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'control-custom range');
    div.innerHTML = '<h4>Opacity</h4>';
    div.innerHTML += '<input id="rangeSlider" type="range" min="0" max="100" value="100">';

    // Make sure the map doesn't move with slider change
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  opacity.addTo(map);

  $('#rangeSlider').on('input', function() {
    choroplethOpacity = $(this).val() / 100;

    if (choroplethLayer) {
      choroplethLayer.setStyle(style);
      // Sync legend colors with opacity slider
      //legend.update();

      // Manually trigger "moveend" so that hash updates, without really moving
      map.setZoom(map.getZoom());
    }
  })

  var hash = new L.Hash(map);

});
