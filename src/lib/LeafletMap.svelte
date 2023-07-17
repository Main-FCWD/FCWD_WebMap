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

	let mapElement;
	let map;

	onMount(async () => {
		if (browser) {
			const L = await import('leaflet');
			await import('leaflet.locatecontrol');
			await import('leaflet.control.layers.tree');
			await import('leaflet.control.layers.tree/L.Control.Layers.Tree.css');
			await import('leaflet-search');
			await import('@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse.js');
			await import('@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse.css');

			map = L.map(mapElement, { zoomControl: true, maxZoom: 18, minZoom: 11 }).setView(
				[34.330395361608595, -85.2480697631836],
				11
			);

			console.log('Initial Bounds: ', map.getBounds());

			map.setMaxBounds(map.getBounds());

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
					console.log(meterData);
				}

				if (metersError) {
					console.error('Error fetching meters data:', metersError);
				}

				return meterData;
			}

			// Tooltip Label Creation //
			var tooltipThreshold = 18;
			var lastZoom;
			map.on('zoomend', function () {
				var zoom = map.getZoom();
				if (zoom < tooltipThreshold && (!lastZoom || lastZoom >= tooltipThreshold)) {
					map.eachLayer(function (l) {
						if (l.getTooltip()) {
							var tooltip = l.getTooltip();
							l.unbindTooltip().bindTooltip(tooltip, {
								permanent: false
							});
						}
					});
				} else if (zoom >= tooltipThreshold && (!lastZoom || lastZoom < tooltipThreshold)) {
					map.eachLayer(function (l) {
						if (l.getTooltip()) {
							var tooltip = l.getTooltip();
							l.unbindTooltip().bindTooltip(tooltip, {
								permanent: true
							});
						}
					});
				}
				lastZoom = zoom;
			});

			var tooltipOptions = {
				direction: 'auto',
				permanent: lastZoom,
				offset: [10, 0]
			};

			async function addMarkersToMap(map, meters) {
				var routeLayers = {};
				var conditionLayers = {};
				var nullLayer = {};

				function ConditionColor(meterCondition) {
					if (meterCondition == 'Dead Head') {
						return 'DarkRed';
					}
					if (meterCondition == 'Manual Read') {
						return 'GoldenRod';
					}
					if (meterCondition == 'Error Code') {
						return 'Orange';
					}
					if (meterCondition == 'Crew Needed') {
						return 'Black';
					}
				}

				meters.forEach((meter) => {
					var GPSRoute = meter.GPS.Route;
					var meterCondition = [meter.Condition];

					var tooltip = L.tooltip([meter.GPS.Latitude, meter.GPS.Longitude], {
						content: meter.GPS.Address,
						permanent: lastZoom,
						direction: 'auto',
						offset: [10, 0]
					});

					const markerIcon = L.icon({
						iconUrl: `https://raw.githubusercontent.com/Main-FCWD/FloydWebMap/main/static/Data/markers/rt${GPSRoute}.svg`,
						iconSize: [25, 25] // Adjust the size according to your marker images
					});

					const marker = L.marker([meter.GPS.Latitude, meter.GPS.Longitude], { icon: markerIcon })
						.bindTooltip(tooltip)
						.openTooltip();

					if (!routeLayers[meter.GPS.Route]) {
						routeLayers[meter.GPS.Route] = L.layerGroup();
						// console.log(routeLayers[meter.GPS.Route])
					}

					if (marker._latlng !== null) {
						marker.addTo(routeLayers[meter.GPS.Route]);
						// console.log(marker)
					}

					// console.log("meter example: ", meter.GPS.Address)

					const conditionIcon = L.icon.pulse({
						color: ConditionColor(meterCondition),
						fillColor: ConditionColor(meterCondition),
						iconSize: [11, 11],
						animate: true
					});

					const conditionMarker = L.marker([meter.GPS.Latitude, meter.GPS.Longitude], {icon: conditionIcon})
						.bindTooltip(tooltip)
						.openTooltip();

					// console.log(conditionMarker)

					if (!nullLayer._latlng == null) {
						nullLayer[conditionMarker._latlng] = L.layerGroup();
						// console.log(conditionMarker._latlng);
					}

					if (!conditionLayers[meter.Condition]) {
						conditionLayers[meter.Condition] = L.layerGroup();
					}

					if (conditionMarker.Condition !== null || conditionMarker._latlng !== null) {
						conditionMarker.addTo(conditionLayers[meter.Condition]);
					} else {
						conditionMarker.addTo(nullLayer);
					}
				});

				var searchLayer = L.layerGroup(routeLayers).addTo(map);
				//... adding data in searchLayer ...
				map.addControl(
					new L.Control.Search({
						layer: searchLayer,
						initial: false,
						propertyName: name
					})
				);
				//searchLayer is a L.LayerGroup contains searched markers

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
								{ label: 'Error Code', layer: conditionLayers['Error Code'] },
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

				var CollapseBtn = `<div><img class="layerControlToggle" style="float:right;" src="/Data/images/lct_button.png"></div>`;

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
			}

			async function meterAdditionData() {
				try {
					const meters = await fetchData();
					addMarkersToMap(map, meters);
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
	<div bind:this={mapElement} />
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
