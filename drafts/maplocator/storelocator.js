/**
 * Blue Fountain Media
 *
 * NOTICE OF LICENSE
 *
 * <notice_of_license>
 *
 * @category    BFM
 * @package     BFM_<ModuleName>
 * @copyright   Copyright (c) 2011 Blue Fountain Media (http://www.bluefountainmedia.com/). All Rights Reserved.
 * @license     <license_url>
 * @version     0.0.2
 */
;
(function($){

    var mapContainer        = "#map";
    var directionsContainer = "#directions-map";
    var storesList          = "#stores-list";
    var storesAll           = ".store";

    var searchInput         = "#search-address";
    var searchMessage       = "#search-message";
    var searchRadius        = "#search-radius";
    var searchState         = "#search-state";
    var searchButton        = "#search-button";
    var searchShowAll       = "#search-show-all";

    var defaults = {
        "container": null,
        "showAll": true,
        "showDirections": false
    };



    StoreLocator = function(stores, options){

        this.options = $.extend({
            "container": $(mapContainer).get(0)
        }, defaults, options);

        this.stores = stores;

        // init map locator
        this.maplocator = new MapLocator({
            "container":  this.options.container,
            "locations":  stores,

            "onSearchError": function(){
                alert('Address not found');
            },

            "onSearchSuccess": function(locations, address, radius, storeLocator){

                var address = locations[0].address;
                var latlng = locations[0].latlng;
                var map = this.map;
                var marker = this.map.marker;

                console.log(latlng);

                // set marker
                marker.setIcon(this.markerIcon);
                marker.setPosition(latlng);
                marker.setMap(map);

                var filtered = this.getInRadius(latlng, radius);
                if(filtered.length){
                    storeLocator.showStores(filtered, true, latlng, radius);
                } else {
                    $(searchMessage).html('No stores found');
                    $(mapContainer).hide();
                    $(storesList).hide();
                }
            }
        });

        // init directions
        if(this.options.showDirections){
            this.directions = new MapLocator({
                "container": $(directionsContainer).get(0)
            });
        }

        // init search handlers
        $(searchInput).change(this.proxy('search'));
        $(searchButton).click(this.proxy('search'));
        $(searchShowAll).click(this.proxy('showStores', [stores]));

        // show all locations
        if(this.options.showAll){
            this.showStores(this.stores);
        }
    };

    StoreLocator.prototype = {

        search: function(){

            var address = $.trim($(searchInput).val());
            var radius = $(searchRadius).val();
            var state = $(searchState).val();

            if(!address && !state){
                alert('Please, enter the address or select state');
                return false;
            }

            if(address){
                this.maplocator.search(address + ', USA', radius, this);
            } else {
                this.showStores(this.maplocator.filterLocations(function(location){
                    return location.state == state;
                }));
            }
        },

//        showDirections: function(store){
//
//            var direction = true;
//            var location = false;
//            var self = this;
//
//            store.latlng = new google.maps.LatLng(store.lat, store.lng);
//
//            var showRoute = function(){
//                self.directions.showRoute({
//                    "origin": direction ? location : store.latlng,
//                    "destination": direction ? store.latlng : location,
//                    "onSuccess": function(result){
//                        var steps = result.routes[0].legs[0].steps;
//                        jQuery('#route_path').empty();
//                        var ul = jQuery('<ul>').appendTo('#route_path');
//                        for(var i=0; i<steps.length; i++){
//                            var instruction = steps[i].instructions;
//                            jQuery('<li>').html(instruction).appendTo(ul);
//                        }
//                    },
//                    "onError": function(){}
//                });
//            };
//
//            jQuery('#popup_title').html(store.title);
//            jQuery('#popup_address').html(store.address);
//            jQuery('#start_address').empty().append('<input type="text" id="source_address" />');
//            jQuery('#end_address').html(store.address);
//            jQuery('#route_path').empty();
//            jQuery('#directions').show().modal({
//                "clone":false,
//                "close":".b-popup__close"
//            });
//            jQuery('#getDirections').unbind('click').click(function(){
//                var address = jQuery('#source_address').val();
//                if(!address) return;
//                self.directions.search(address + ', USA');
//            });
//            jQuery('#direction_reverse').unbind('click').click(false).click(function(){
//                direction = !direction;
//                var content = jQuery('#start_address').html();
//                var address = jQuery('#source_address').val();
//                jQuery('#start_address').html(jQuery('#end_address').html());
//                jQuery('#end_address').html(content);
//                jQuery('#source_address').val(address);
//                if(location){
//                    showRoute();
//                }
//            });
//
//            this.directions.onSearchSuccess = function(locations){
//                location = locations[0].latlng;
//                showRoute();
//            };
//            this.directions.onSearchError = function(){
//                alert('Entered address not found');
//            };
//            this.directions.onMapClick = function(latlng, geocode){
//                if(geocode) jQuery('#source_address').val(geocode.address);
//                location = latlng;
//                showRoute();
//            };
//            this.directions.reinit([store]);
//        },



        /**
         * Shows message text in form
         *
         * @param {string} message
         * @param {bool} is error
         */
        showMessage: function(message, error){
            $(searchMessage).html(message).show();
            if(error){
                $(mapContainer).hide();
                $(storesList).hide();
            }
        },



        /**
         * Shows requested stores on the map
         *
         * @param {array} locations
         * @param {bool} show main marker
         * @param {object} google.maps.LatLng
         * @param {int} radius to show in meters
         */
        showStores: function(stores, showMarker, center, radius){

            var ml = this.maplocator;

            if(typeof showMarker == 'undefined')
                showMarker = true;

            $(searchMessage).empty().hide();
            $(mapContainer).show();
            $(storesList).show();
            $(storesAll).hide();

            if(center && radius){
                ml.showInRadius(center, radius, stores);
            } else {
                ml.hideLocations(!showMarker);
                ml.fitLocations(stores);
            }

            $.each(stores, function(i, store){
                $('#store-' + store.id).show();
            });
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
})(jQuery);