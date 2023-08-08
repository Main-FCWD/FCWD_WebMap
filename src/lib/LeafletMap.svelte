<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { createClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	// Initialize Supabase client
	const supabaseUrl = 'https://nkkzwoydapppptjcjqsm.supabase.co';
	const supabaseKey = PUBLIC_SUPABASE_ANON_KEY;
	const supabase = createClient(supabaseUrl, supabaseKey);

	// console.log(supabase);

	let map;

	onMount(async () => {
		if (browser) {
			const L = await import('leaflet');
			await import('leaflet.locatecontrol');
			await import('leaflet.control.layers.tree');
			await import('leaflet.control.layers.tree/L.Control.Layers.Tree.css');
			await import('leaflet-search/dist/leaflet-search.min.js');
			await import('leaflet-search/dist/leaflet-search.min.css');
			await import('@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse.js');
			await import('@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse.css');
			await import('leaflet.markercluster/dist/leaflet.markercluster.js');
			await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
			await import('https://api.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v1.0.1/Leaflet.fullscreen.min.js')
			await import('leaflet-fullscreen/dist/leaflet.fullscreen.css')

			// initailizing map //
			map = L.map(map, { zoomControl: true, maxZoom: 18, minZoom: 10 }).setView(
				[34.330395361608595, -85.2480697631836],
				0
			);

			// Create a function to set different maxBounds for different devices //
			function setMaxBoundsForDevice(map) {
				// Get the screen width
				const screenWidth = window.innerWidth;

				// Set different maxBounds based on the screen width (you can adjust the values)
				if (screenWidth < 900) {
					// Mobile or small screen devices
					map.setMaxBounds([
						[33.810772, -85.775532],
						[34.765142, -84.741472]
					]);
					map.setView([34.330395361608595, -85.2480697631836], 10);
					console.log('little screen');
				} else {
					// Desktop or larger screen devices
					map.setMaxBounds([
						[34.978092874, -84.6065642812],
						[33.6857261568, -85.8973345757]
					]);
					map.setView([34.330395361608595, -85.2480697631836], 11);
				}
			}
			// calling max boundaries //
			setMaxBoundsForDevice(map);

			// Attribution creation //
			L.control
				.attribution({
					prefix: '<span>v 0.0.8</span>',
					position: 'bottomleft'
				})
				.addTo(map);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

			// Open Street Map Creation //
			map.createPane('pane_OSM');
			var layer_OSM = L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				pane: 'pane_OSM',
				opacity: 1.0,
				attribution:
					'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors, CC-BY-SA</a>',
				minZoom: 8,
				maxZoom: 18,
				minNativeZoom: 8,
				maxNativeZoom: 18
			});

			// Dark Map Layer Creation // 
			map.createPane('pane_OSM_dark');
			var layer_OSM_dark = L.tileLayer(
				'https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
				{
					className: 'map-tiles',
					pane: 'pane_OSM_dark',
					opacity: 1.0,
					minZoom: 8,
					maxZoom: 16,
					minNativeZoom: 8,
					maxNativeZoom: 16
				}
			);

			// Google Satellite Base Map Creation //
			map.createPane('pane_GoogleSat');
			var layer_GoogleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
				pane: 'pane_GoogleSat',
				opacity: 1.0,
				attribution: '',
				minZoom: 1,
				maxZoom: 18,
				minNativeZoom: 0,
				maxNativeZoom: 18
			});
			layer_GoogleSat;

			// Base Layers Added to Base Layers //
			var baseTree = {
				label: 'Base Maps',
				children: [
					{ label: 'OpenStreetMap', layer: layer_OSM },
					{ label: 'Google Satellite', layer: layer_GoogleSat },
					{
						label: 'OpenStreetMap Dark Mode',
						layer: layer_OSM_dark
					}
					/* ... */
				]
			};

			var options = {
				collapseAll: '',
				collapsed: false
			};

			// Addition of Floyd County Border Outline //
			map.createPane('pane_FloydBorder');
			// Load and display your JSON file using Leaflet.js
			fetch(
				'https://raw.githubusercontent.com/Main-FCWD/FloydWebMap/main/static/Data/FloydBorder.json'
			)
				.then((response) => response.json())
				.then((data) => {
					L.geoJSON(data, {
						style: {
							pane: 'pane_FloydBorder',
							opacity: 1,
							color: 'rgba(188,35,35,1.0)',
							dashArray: '',
							lineCap: 'square',
							lineJoin: 'bevel',
							weight: 5.0,
							fillOpacity: 0,
							interactive: false
						}
					}).addTo(map);
				});

			async function fetchData() {
				// Fetch data from 'Meters' and 'GPS' tables
				const { data: meterData, error: metersError } = await supabase.from('Meters').select(`
					*,
					GPS (
						*
					)
					`);

				if (meterData) {
					// console.log(meterData);
				}

				if (metersError) {
					console.error('Error fetching meters data:', metersError);
				}

				return meterData;
			}


			// Addition of ALL Markers Upon Promise //
			async function addMarkersToMap(map, meterGeoJSON) {

				var routeLayers = {};
				var conditionLayers = {};
				var markerCluster = new window.L.markerClusterGroup();
				

				function ConditionColor(meterCondition) {
					if (meterCondition == 'Dead Head') {
						return 'DarkRed';
					}
					if (meterCondition == 'Manual Read') {
						return 'Orange';
					}
					if (meterCondition == 'Crew Needed') {
						return 'Black';
					}
				}

				// Iterating Over Each Meter in Database to a Marker //
				var i, features;
				for (i = 0; i < meterGeoJSON.features.length; i++) {
					features = meterGeoJSON.features[i];

					var GPSRoute = features.properties.Route;
					var meterCondition = [features.properties.Condition];

					var tooltip = L.tooltip(features.geometry.coordinates, {
						content: features.properties.Address,
						permanent: false,
						direction: 'auto',
						offset: [10, 0]
					});

					const markerIcon = L.icon({
						iconUrl: `https://raw.githubusercontent.com/Main-FCWD/FloydWebMap/main/static/Data/markers/rt${GPSRoute}.svg`,
						iconSize: [25, 25] // Adjust the size according to your marker images
					});

					const marker = L.marker(features.geometry.coordinates, {
						icon: markerIcon
					}).bindTooltip(tooltip).openTooltip()
						

					if (!routeLayers[features.properties.Route]) {
						routeLayers[features.properties.Route] = window.L.markerClusterGroup();

					}

					if (marker._latlng !== null) {
						marker.addTo(routeLayers[features.properties.Route]);
						
					}

					const conditionIcon = L.icon.pulse({
						color: ConditionColor(meterCondition),
						fillColor: ConditionColor(meterCondition),
						iconSize: [9, 9],
						animate: true
					});

					const conditionMarker = L.marker(features.geometry.coordinates, {
						icon: conditionIcon
					})
						.bindTooltip(tooltip)
						.openTooltip();


					if (!conditionLayers[features.properties.Condition]) {
						conditionLayers[features.properties.Condition] = L.layerGroup();
					}

					conditionMarker.addTo(conditionLayers[features.properties.Condition]);

					var popupContent = `<table><thead><tr><th colspan="2" style="padding-bottom:1em">${features.properties.Address}</th></tr></thead><tbody><tr><td style="text-align: left">Route: </td><td>${features.properties.Route}</td><tr><td style="text-align: left">Account #: </td><td>${features.properties['Account #']}</td></tr><tr><td style="padding-bottom: 1em; text-align: left">CID #: </td><td style="padding-bottom: 1em">${features.properties['CID #']}</td></tr><tr><td style="padding-bottom: 1em; text-align: left">Meter #: </td><td style="padding-bottom: 1em">${features.properties['Meter #']}</td></tr><tr><td style="text-align: left">Condition: </td><td>${features.properties.Condition}</td></tr></tbody><tfoot><tr style="font-size:.75em;padding-top:1em"><td style="text-align:right">Updated: </td><td style="color:Red">${features.properties['Last Read']}</td></tr></tfoot></table>`;

					marker.bindPopup(popupContent);
					conditionMarker.bindPopup(popupContent);

					markerCluster.addLayer(marker);
				}


				// map.addLayer(markerCluster);


				var mapRoutes = {
					label: 'Meters',
					children: [
						{
							label: 'Routes',
							children: [
								{
									label: 'Silver Creek',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 10', layer: routeLayers[10] },
										{ label: 'Route 11', layer: routeLayers[11] },
										{ label: 'Route 12', layer: routeLayers[12] },
										{ label: 'Route 13', layer: routeLayers[13] },
										{ label: 'Route 14', layer: routeLayers[14] },
										{ label: 'Route 15', layer: routeLayers[15] },
										{ label: 'Route 16', layer: routeLayers[16] },
										{ label: 'Route 17', layer: routeLayers[17] },
										{ label: 'Route 18', layer: routeLayers[18] },
										{ label: 'Route 19', layer: routeLayers[19] },
										{ label: 'Route 20', layer: routeLayers[20] },
										{ label: 'Route 23', layer: routeLayers[23] },
										{ label: 'Route 24', layer: routeLayers[24] },
										{ label: 'Route 25', layer: routeLayers[25] },
										{ label: 'Route 26', layer: routeLayers[26] },
										{ label: 'Route 27', layer: routeLayers[27] },
										{ label: 'Route 28', layer: routeLayers[28] },
										{ label: 'Route 29', layer: routeLayers[29] }
									]
								},
								{
									label: 'Lindale',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 21', layer: routeLayers[21] },
										{ label: 'Route 22', layer: routeLayers[22] },
										{ label: 'Route 30', layer: routeLayers[30] },
										{ label: 'Route 31', layer: routeLayers[31] },
										{ label: 'Route 32', layer: routeLayers[32] },
										{ label: 'Route 33', layer: routeLayers[33] }
									]
								},
								{
									label: 'Kingston',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 42', layer: routeLayers[42] },
										{ label: 'Route 43', layer: routeLayers[43] },
										{ label: 'Route 44', layer: routeLayers[44] },
										{ label: 'Route 45', layer: routeLayers[45] },
										{ label: 'Route 46', layer: routeLayers[46] },
										{ label: 'Route 47', layer: routeLayers[47] },
										{ label: 'Route 48', layer: routeLayers[48] }
									]
								},
								{
									label: 'Shannon',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 50', layer: routeLayers[50] },
										{ label: 'Route 51', layer: routeLayers[51] },
										{ label: 'Route 52', layer: routeLayers[52] },
										{ label: 'Route 53', layer: routeLayers[53] },
										{ label: 'Route 61', layer: routeLayers[61] },
										{ label: 'Route 62', layer: routeLayers[62] }
									]
								},
								{
									label: 'Armuchee',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 68', layer: routeLayers[68] },
										{ label: 'Route 69', layer: routeLayers[69] },
										{ label: 'Route 70', layer: routeLayers[70] },
										{ label: 'Route 71', layer: routeLayers[71] },
										{ label: 'Route 72', layer: routeLayers[72] },
										{ label: 'Route 73', layer: routeLayers[73] },
										{ label: 'Route 74', layer: routeLayers[74] },
										{ label: 'Route 75', layer: routeLayers[75] },
										{ label: 'Route 77', layer: routeLayers[77] },
										{ label: 'Route 78', layer: routeLayers[78] },
										{ label: 'Route 79', layer: routeLayers[79] }
									]
								},
								{
									label: 'Coosa',
									selectAllCheckbox: false,
									collapsed: true,
									children: [
										{ label: 'Route 80', layer: routeLayers[80] },
										{ label: 'Route 81', layer: routeLayers[81] },
										{ label: 'Route 82', layer: routeLayers[82] },
										{ label: 'Route 83', layer: routeLayers[83] },
										{ label: 'Route 84', layer: routeLayers[84] },
										{ label: 'Route 85', layer: routeLayers[85] },
										{ label: 'Route 91', layer: routeLayers[91] }
									]
								}
							]
						},
						{
							label: 'Problems',
							selectAllCheckbox: false,
							collapsed: false,
							children: [
								{ label: 'Dead Head', layer: conditionLayers['Dead Head'] },
								{ label: 'Manual Read', layer: conditionLayers['Manual Read'] },
								{ label: 'Crew', layer: conditionLayers['Crew Needed'] }
							]
						}
					]
				};
				const treeLayerControl = L.control.layers.tree(baseTree, mapRoutes, options);

				treeLayerControl.addTo(map);

				var LayerControlContainer = document.querySelector(
					'body > div > main > section > div > div.leaflet-control-container > div.leaflet-top.leaflet-right > div > section'
				);

				var CollapseBtn = `<div><img class="layerControlToggle" style="float:right;" src="https://raw.githubusercontent.com/Main-FCWD/FCWD_WebMap/main/static/Data/images/lct_button.png"></div>`;

				LayerControlContainer.insertAdjacentHTML('afterbegin', CollapseBtn);

				var layerCollapseBtn = document.querySelector(
					'body > div > main > section > div > div.leaflet-control-container > div.leaflet-top.leaflet-right > div > section > div:nth-child(1)'
				);

				layerCollapseBtn.addEventListener('click', () => {
					document
						.querySelector('div.header-bg > span')
						.removeAttribute('leaflet-control-layers-expanded');
					document
						.querySelector(
							'body > div > main > section > div > div.leaflet-control-container > div.leaflet-top.leaflet-right > div'
						)
						.setAttribute(
							'class',
							'leaflet-control-layers leaflet-control-layers-collapsed leaflet-control'
						);
				});

				var titleSpan = document.querySelector('div.header-bg');

				titleSpan.addEventListener('click', () => {
					document.querySelector('body > div > main > section').removeChild(titleSpan);
					console.log('Title Span Clicked!');
				});

				// console.log("GeoJSON Data: ", geojson);
			}

			async function meterAdditionData() {
				try {
					const meters = await fetchData();
					// console.log('Meters: ', meters, typeof meters);

					var meterGeoJSON = {};
					meterGeoJSON['type'] = 'FeatureCollection';
					meterGeoJSON['features'] = [];

					var i;
					for (i = 0; i < meters.length; i++) {
						var newFeature = {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [meters[i].GPS.Latitude, meters[i].GPS.Longitude]
							},
							properties: {
								Address: meters[i].GPS.Address,
								Route: meters[i].GPS.Route,
								'Account #': meters[i].ACCOUNT_NO,
								'CID #': meters[i].CID_NO,
								'Meter #': meters[i].Meter_no,
								Service: meters[i].Service_Type,
								Condition: meters[i].Condition,
								'Last Read': meters[i].New_Date,
								Count: meters[i].Count,
								'Min Value': meters[i]['MIN VALUE'],
								Average: meters[i].MEAN,
								Median: meters[i].Median,
								'Max Value': meters[i]['MAX VALUE']
							}
						};

						meterGeoJSON['features'].push(newFeature);
					}
					console.log('GeoJSON Data: ', meterGeoJSON);

					addMarkersToMap(map, meterGeoJSON);
				} catch (error) {
					console.error('Error: ', error);
				}
			}

			meterAdditionData();

			L.control
				.locate({
					icon: 'leaflet-control-locate-location-arrow',
					initialZoomLevel: 18
				})
				.addTo(map);

			map.addControl(new L.Control.Fullscreen());
		}
	});

	onDestroy(async () => {
		if (map) {
			console.log('Unloading Leaflet map.');
			map.remove();
		}
	});
</script>

<section>
	<div bind:this={map} />
	<div class="header-bg">
		<span>Floyd County Water Department</span>
	</div>
</section>

<style>
	@import 'leaflet/dist/leaflet.css';
	section div {
		height: 100vh;
	}

	.header-bg {
		position: fixed;
		display: flex;
		top: 1rem;
		left: 5rem;
		background: rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
		backdrop-filter: blur(4.5px);
		-webkit-backdrop-filter: blur(4.5px);
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		z-index: 999;
		height: fit-content;
	}

	.header-bg > span {
		padding-left: 1rem;
		padding-right: 1rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		font-size: x-large;
		font-weight: normal;
		color: #415462;
		font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
	}
</style>
