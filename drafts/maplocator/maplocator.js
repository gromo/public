/**
 * Google Maps API wrapper: Map Locator
 *      http://maps.google.co.uk/maps/api/js?sensor=false&libraries=geometry
 *
 * Blue Fountain Media
 *
 * NOTICE OF LICENSE
 *
 * <notice_of_license>
 *
 * @category    BFM
 * @package     BFM_MAP_LOCATOR
 * @copyright   Copyright (c) 2012 Blue Fountain Media (http://www.bluefountainmedia.com/). All Rights Reserved.
 * @license     <license_url>
 * @version     0.1.3
 */
(function(){

    var defaults = {
        "container":  null,  // HTML element with map; css height/width required
        "locations":  [],    // array with locations
        "mapOptions": {},   // google maps options: center, mapTypeId, zoom, etc...
        "markerIcon": "http://maps.google.com/mapfiles/ms/icons/blue-pushpin.png",

        "onFilterLocation": function(location){ // return true if location match
            return true;
        },

        "onGetLocationInfo": function(location){
            return '<h2>' + location.title + '</h2>';
        },

        "onMapClick": function(latlng, geocode){
            var map = this.map;
            var marker = this.marker;

            marker.setIcon(this.markerIcon);
            marker.setMap(map);

            if(geocode){
                marker.setPosition(geocode.latlng);
                marker.showInfo(geocode.address);
            } else {
                marker.setPosition(latlng);
            }
        },

        "onMarkerClick": function(location){
            location.showInfo();
        },

        "onSearchError": function(status, address){
            console.log("Map Locator search response: " + status);
        },

        "onSearchSuccess": function(locations, address){
            console.log(locations);
        }
    };


    /**
     *
     * init
     * search
     * setLocations
     * fitLocations
     * hideLocations
     * showLocations
     * showInRadius
     * getInRadius
     * showLocationById
     * showRoute
     * hideRoute
     * showInfo
     * resizeMap
     * proxy
     */
    MapLocator = function(options){

        this.locations = [];
        this.map = null;

        if(typeof options.container == "string"){
            options.container = document.getElementById(options.container);
        }

        if(!options.container){
            console.log("Google Map container is not set");
            return false;
        }

        var timer = setInterval(this.proxy(function(){
            if(window.google && google.maps){
                clearInterval(timer);
                this.init(options);
            }
        }), 200);
    };



    MapLocator.prototype = {

        init: function(options){

            var self = this;
            var o = extend({}, defaults, {
                "mapOptions": {
                    "center": new google.maps.LatLng(40, -70),
                    "mapTypeId": google.maps.MapTypeId.ROADMAP,
                    "zoom": 13
                }
            }, this, options);

            var map = this.map;
            if(!map){
                map = new google.maps.Map(o.container, o.mapOptions);
                var circle = new google.maps.Circle({
                    "fillOpacity": 0,
                    "strokeOpacity": 0,
                    "map": map
                });
                var directionsRenderer = new google.maps.DirectionsRenderer();
                var directionsService  = new google.maps.DirectionsService();
                var geocoder   = new google.maps.Geocoder();
                var infoWindow = new google.maps.InfoWindow();
                var marker     = new google.maps.Marker({
                    "icon": o.markerIcon
                });

                marker.showInfo = function(content){
                    if(typeof content != 'undefined' && content){
                        infoWindow.setContent(content);
                        infoWindow.open(map, this); // this - marker
                    } else {
                        infoWindow.close();
                    }
                };

                this.map = extend(map, {
                    "_click": false,
                    "circle": circle,
                    "directionsRenderer": directionsRenderer,
                    "directionsService":  directionsService,
                    "geocoder": geocoder,
                    "infoWindow": infoWindow,
                    "marker": marker
                });
                this.marker = marker;
            }

            // extend current object with defined settings
            this.mapOptions = o.mapOptions;
            this.markerIcon = o.markerIcon;

            // SET CALLBACK FUNCTIONS
            for(var func in o){
                if(/^on.*/.test(func)){
                    this[func] = o[func];
                }
            }

            // HIDE DIRECTIONS RENDERER
            map.directionsRenderer.setMap(null);

            // RESIZE MAP - REINIT MAP SIZE
            this.resizeMap();

            // SET & SHOW ALL LOCATIONS IF DEFINED
            if(options.locations){
                this.setLocations(options.locations);
                this.fitLocations();
            }

            // REGISTER MAP CLICK HANDLER IF DEFINED
            if(this.onMapClick && !map._click){
                map._click = true; // do not add listener on reinit
                google.maps.event.addListener(map, 'click', function(e){
                    geocoder.geocode({
                        "latLng": e.latLng
                    }, function(response, status){
                        status = (status == google.maps.GeocoderStatus.OK);
                        isFunc(self.onMapClick) && self.onMapClick(e.latlng, status ? {
                            "latlng":  response[0].geometry.location,
                            "address": response[0].formatted_address
                        } : null);
                    });
                });
            }
        },



        /**
         * Search location by address;
         *    all additional parameters will be available in callback function
         *    onSearchSuccess after locations & address
         * @param {string} search address
         * @param {mixed} additional parameters
         */
        search: function(address){

            var args = Array.prototype.slice.call(arguments);
            args.unshift(null, null); // set first variables to be result, status

            this.map.geocoder.geocode({
                "address":address
            }, this.proxy(function(results, status){
                var args = Array.prototype.slice.call(arguments, 2);
                if (status == google.maps.GeocoderStatus.OK){
                    var locations = [];
                    for(var i=0; i<results.length; i++){
                        locations.push({
                            "latlng": results[i].geometry.location,
                            "address": results[i].formatted_address
                        });
                    }
                    args.unshift(locations);
                    isFunc(this.onSearchSuccess) && this.onSearchSuccess.apply(this, args);
                } else {
                    args.unshift(status);
                    isFunc(this.onSearchError) && this.onSearchError.apply(this, args);
                }
            }, args));
        },



        setLocations: function(locations){

            var i, latlng, location;

            for(i=0; i<this.locations.length; i++)
                this.locations[i].marker.setMap(null);

            this.locations = [];

            for(i=0; i<locations.length; i++){

                location = extend({
                    "lat": 0,
                    "lng": 0
                }, locations[i]);

                latlng = new google.maps.LatLng(location.lat, location.lng);

                extend(location, {
                    "latlng": latlng,
                    "marker": new google.maps.Marker({
                        "position": latlng,
                        "map": this.map
                    }),
                    "showInfo": this.proxy('showInfo', [location])
                });

                google.maps.event.addListener(location.marker, 'click', this.proxy(function(location){
                    isFunc(this.onMarkerClick) && this.onMarkerClick(location);
                }, [location]));

                this.locations.push(location);
            }
        },



        fitLocations: function(locations){

            var bounds = new google.maps.LatLngBounds();
            var map = this.map;

            if(!isArray(locations))
                locations = this.locations.slice();

            // show marker if visible
            map.marker.getMap() && locations.push({
                'latlng': map.marker.getPosition()
            });

            if(locations.length == 0)
                return;

            if(locations.length > 1){
                for(var i=0; i<locations.length; i++)
                    bounds.extend(locations[i].latlng ||
                        new google.maps.LatLng(locations[i].lat, locations[i].lng));
                map.setCenter(bounds.getCenter());
                map.fitBounds(bounds);
            } else {
                map.setZoom(this.mapOptions.zoom);
                map.setCenter(locations[0].latlng ||
                    new google.maps.LatLng(locations[0].lat, locations[0].lng));
            }
        },

        /**
         * @param {func} function to filter that returns true (if match), false otherwise
         */
        filterLocations: function(callback){

            if(!isFunc(callback))
                return this.locations;

            var locations = [];
            for(var i=0; i<this.locations.length; i++)
                callback(this.locations[i]) && locations.push(this.locations[i]);

            return locations;
        },



        /**
         * Hide all locations marker from map
         * @param {bool} includeMarker - hide map marker too
         */
        hideLocations: function(includeMarker){
            includeMarker && this.map.marker.setMap(null);
            for(var i=0; i<this.locations.length; i++){
                this.locations[i].marker.setMap(null);
            }
        },


        /**
         * @param {array} array of locations
         */
        showLocations: function(locations){

            if(!isArray(locations))
                locations = this.locations;

            for(var i=0; i<locations.length; i++){
                locations[i].marker.setMap(this.map);
            }
        },



        /**
         * @public
         * @param {google.maps.LatLng} map center
         * @param {int} radius in meters
         */
        showInRadius: function(center, radius, locations){

            this.map.circle.setCenter(center);
            this.map.circle.setRadius(parseInt(radius));
            this.map.fitBounds(this.map.circle.getBounds());

            this.hideLocations();
            this.showLocations(locations || this.getInRadius(center, radius));
        },



        /**
         * Get array of locations
         *
         * @param {object} google.maps.LatLng
         * @param {int} radius in meters
         * @return {array} locations located in selected radius from center
         */
        getInRadius: function(center, radius){
            var distance, location, locations = [];
            for(var i=0; i<this.locations.length; i++){
                location = this.locations[i];
                distance = google.maps.geometry.spherical.computeDistanceBetween(center, location.latlng);
                distance < radius && this.onFilterLocation(location) && locations.push(location);
            }
            return locations;
        },



        /**
         * @public
         * @param {mixed} location id
         * @param {bool}
            */
        showLocationById: function(id, thisOnly){
            var location, found = false;
            for(var i=0; i<this.locations.length; i++){
                location = this.locations[i];
                thisOnly && location.marker.setMap(null);
                if(location.id && location.id == id){
                    this.map.setCenter(location.latlng);
                    location.marker.setMap(this.map);
                    location.showInfo();
                    found = true;
                }
            }
            return found;
        },



        /**
         * @param {array} options {
         "origin":      google.maps.LatLng
         "destination": google.maps.LatLng
         "travelMode":  "DRIVING"      // optional
         "onSuccess":   func(result)   // optional
         "onError":     func(status)   // optional
         }
         */
        showRoute: function(options){

            var map = this.map;
            var dr = map.directionsRenderer;
            var ds = map.directionsService;

            var request = {
                "origin": options.origin,
                "destination": options.destination,
                "travelMode": google.maps.TravelMode[options.travelMode || "DRIVING"]
            };

            ds.route(request, function(result, status){
                if (status == google.maps.DirectionsStatus.OK) {
                    dr.setMap(map);
                    dr.setDirections(result);
                    isFunc(options.onSuccess) && options.onSuccess(result);
                } else {
                    isFunc(options.onError) && options.onError(status);
                }
            });
        },



        hideRoute: function(){
            this.map.directionsRenderer.setMap(null);
        },



        showInfo: function(location){
            var info = this.onGetLocationInfo(location);
            if(info){
                this.map.infoWindow.setContent(info);
                this.map.infoWindow.open(this.map, location.marker);
            } else {
                this.map.infoWindow.close();
            }
        },

        resizeMap: function(){
            google.maps.event.trigger(this.map, 'resize');
        },



        /**
         * Proxy to call function in context of current object
         * @param {mixed} function or string
         * @param {array} function arguments; use null to define incoming arguments
         * @param {object} context
         */
        proxy: function(func, args, context){
            context = context || this;
            args = args || [];
            if(typeof func == 'string')
                func = context[func];
            return function(){
                var a = args.slice();
                for(var i=0; i<arguments.length; i++)
                    if(typeof a[i]=='undefined' || a[i]===null)
                        a[i] = arguments[i];
                return func.apply(context, a);
            };
        }
    };



    if(typeof console == "undefined"){
        console = {
            log: function(msg){
                var debug = document.getElementById('console');
                if(debug) debug.innerHTML += '<div>' + msg + '</div>';
            }
        };
    }


    function extend(){
        var target = arguments[0] || {};
        for(var i=1; i<arguments.length; i++){
            if(arguments[i] && typeof arguments[i] == 'object'){
                for(var name in arguments[i]){
                    if(typeof arguments[i][name] === "object"){
                        target[name] = isArray(arguments[i][name]) ?
                            arguments[i][name].slice() : extend(arguments[i][name]);
                    } else {
                        target[name] = arguments[i][name];
                    }
                }
            }
        }
        return target;
    }

    function isArray(o){
        return Object.prototype.toString.call(o) === "[object Array]";
    }

    function isFunc(o){
        return Object.prototype.toString.call(o) === "[object Function]";
    }

})();