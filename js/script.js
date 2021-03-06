//
// Start Game
//

(function ( mySettings ) {

	function createNewCriminal(criminalType, criminalSettings, thisFloor, $myCharacterObject){
		var tempObject = {
			characterType: criminalType,
			$characterObject: $myCharacterObject,
			myFloor: thisFloor
		};
		$myCharacterObject.draggable({
			revert: 'invalid'
		}).data(
			'modelReference', tempObject
		);
		thisFloor.floorCharacters.push(tempObject);
		return tempObject;
	}

	function createNewFloor(floorType, floorSettings, thisFloorArray, $myFloorObject){
		var tempObject = {
			floorType: floorType,
			floorCharacters: [],
			floorCapacity: floorSettings.capacity,
			floorData: floorSettings.templateData(),
			$floorObject: $myFloorObject
		};
		$myFloorObject.data('modelReference', tempObject);
		thisFloorArray.push(tempObject);
		return tempObject;
	}

	function changeFloor(thisCharacter, thisFloor, originFloor) {
		originFloor.floorCharacters.splice(originFloor.floorCharacters.indexOf(thisCharacter), 1);
		thisFloor.floorCharacters.push(thisCharacter);
		thisCharacter.myFloor = thisFloor;
		if (thisFloor.floorCharacters.length === thisFloor.floorCapacity) {
			thisFloor.$floorObject.droppable( "disable" );
		}
		if (originFloor.$floorObject.hasClass( 'ui-droppable' )) {
			originFloor.$floorObject.droppable( "enable" );
		}
	}

	function thisFloorIsAvailable( thisFloor ) {
		if (thisFloor.floorCharacters.length < thisFloor.floorCapacity) {
			return true;
		} else {
			return false;
		}
	}


	//
	// Controller & View Functions
	//

	function $createNewCharacterDOM(characterType, characterSettings, $floor){
	// Creates new $char object, inserts it into dom, inserts it into data structures, returns $object
		return $('<div>', {
			'class': characterType + ' character'
		})
		.append($('<div>', {
			'class': 'charinfo',
			text: characterSettings.statName + ': ' + characterSettings.statValue
		}))
		.appendTo( $floor );
	}

	function $createNewFloorDOM(floorType, floorSettings, $container){
	//Creates new floor object, inserts it into dom, creates new object and adds to array, makes drop target, returns $object
		return $('<div>', {
			'class': floorType + ' floor'
		})
		.append( $($( floorSettings.template.selector ).html()).clone() )
		.appendTo( $container );
	}


	var subPub = (function() {
		var listeners = {};

		function install(eventName){
			if (listeners.hasOwnProperty(eventName)) {
				return false;
			} else {
				listeners[eventName] = [];
				return true;
			}
		}

		function publish(eventName){
			if (listeners.hasOwnProperty(eventName)) {
				var args = [].slice.call(arguments, 1);
				listeners[eventName].forEach(function(element){
					element.call(args);
				});
				return true;
			} else {
				return false;
			}
		}

		function subscribe(eventName, callback){
			if (listeners.hasOwnProperty(eventName)) {
				listeners[eventName].push(callback);
				return true;
			} else {
				return false;
			}
		}

		function unsubscribe(eventName, callback){
			var index = listeners[eventName].indexOf(callback);
			if (index === -1) {
				return false;
			} else {
				listeners[eventName].splice(index, 1);
				return true;
			}
		}

		return {
			install: install,
			publish: publish,
			subscribe: subscribe,
			unsubscribe: unsubscribe
		};
	})();

	var money = mySettings.start.money;
	
	function updateMoney(){
		$( '#store .money').text( 'Money: ' + money );
	}

	// Timer Stuff
	var timer = (function(clockSpeed){
		var timerList = [];
		var isPaused = false;

		function newTimer(thisTimerType, thisTimerData) {
			var thisNewTimer = {
				timer: thisTimerType.count,
				timerType: thisTimerType,
				timerData: thisTimerData
			};
			timerList.push(thisNewTimer);
			return thisNewTimer;
		}

		function removeTimer(myFunction) {
			var index = timerList.indexOf(myFunction);
			if (index === -1) {
				return false;
			} else {
				timerList.splice(index, 1);
				return true;
			}
		}

		function setPause(toBePaused){
			if (toBePaused) {
				isPaused = true;
				return true;
			} else if (!toBePaused){
				isPaused = false;
				return true;
			} else {
				return false;
			}
		}

		function timerLoop() {
			if (!isPaused) {
				timerList.forEach( function( element ) {
					element.timer = element.timer - element.timerType.increment(element);
					if (element.timer <= 0) {
						element.timer = 0;
						element.timerType.finalStep( element );
					} else if (element.timerType.hasOwnProperty( 'step' )) {
						element.timerType.step( element );
					}
				});
			}
			setTimeout( timerLoop, clockSpeed );
		}

		// Start Timer
		setTimeout( timerLoop, clockSpeed );

		return {
			newTimer: newTimer,
			removeTimer: removeTimer,
			setPause: setPause
		};
	})( mySettings.timer.clockSpeed );
	

	var timerInfo = {
		research: {
			count: 25,
			increment: function(element) {
				return element.timerData.timerObject.$floorObject.children('.scientist').length;
			},
			step: function(element) {
				element.timerData.timerObject.$floorObject
				.find('.meter')
				.children('span')
				.css( 'width', (100 - element.timer / element.timerType.count * 100) + '%' );
			},
			finalStep: function(element) {
				element.timerData.timerObject.$floorObject
				.find('.meter')
				.children('span')
				.css( 'width', '100%' );
				element.timer = element.timerType.count + 1;
			}
		},
		criminalSpawn: {
			count: 15,
			increment: function() { return 1; },
			finalStep: function(element){
				if (thisFloorIsAvailable( floorArray[0] )) {
					var criminalType = mySettings.start.criminals[ Math.floor( Math.random() * mySettings.start.criminals.length )];
					createNewCriminal(
						criminalType,
						mySettings.criminal[ criminalType ],
						floorArray[0],
						$createNewCharacterDOM(
							criminalType,
							mySettings.criminal[ criminalType ],
							floorArray[0].$floorObject
						)
					);
				}
				element.timer = element.timerType.count;
			}
		},
		thieving: {
			count: 6,
			increment: function(element) {
				if (element.timerData.thisWarehouse.floorData.fencing) {
					return 0;
				} else {
					return 1;
				}
			},
			finalStep: function(element) {
				var myWarehouse = element.timerData.thisWarehouse;
				myWarehouse.floorData.loot += 1;
				myWarehouse.$floorObject.find('.goods').text( myWarehouse.floorData.loot );
				element.timer = element.timerType.count;
			}
		},
		fencing: {
			count: 10,
			increment: function() {return 1;},
			step: function(element) {
				element.timerData.timerObject.$floorObject
				.find('.meter')
				.children('span')
				.css( 'width', (100 - (element.timer - 1) / (element.timerType.count - 1) * 100) + '%' );
			},
			finalStep: function(element) {
				var thisObject = element.timerData.timerObject;
				thisObject.$floorObject.find('.meter').children('span').css( 'width', '0%' );
				money += thisObject.floorData.loot * 100;
				thisObject.floorData.loot = 0;
				thisObject.$floorObject.find('.goods').text( thisObject.floorData.loot );
				updateMoney();
				timer.removeTimer(element);
				thisObject.floorData.fencing = false;
			}
		}
	};

	function $makeDroppable($object, dropAccept){
		return $object.droppable({
			accept: dropAccept.join(', '),
			drop: function( event, ui ) {
				var oldParent = ui.draggable.parent();
				ui.draggable.removeAttr( 'style' ).appendTo( $(this) );
				changeFloor(
					ui.draggable.data('modelReference'),
					$(this).data('modelReference'),
					oldParent.data('modelReference')
				);
				if (ui.draggable.data('modelReference').characterType === 'thief') {
					if (oldParent.data('modelReference').floorType === 'warehouse') {
						timer.removeTimer(ui.draggable.data('modelReference').timer);
					}
					if ($(this).data('modelReference').floorType === 'warehouse') {
						var newTimer = timer.newTimer( timerInfo.thieving, {
							thisThief: ui.draggable.data('modelReference'),
							thisWarehouse: $(this).data('modelReference')
						});
						ui.draggable.data('modelReference').timer = newTimer;
					}
				}
			}
		});
	}

	timer.newTimer( timerInfo.criminalSpawn, {} );



	// Spawn & Setup Primary Assets

	var floorArray = [{
		floorType: 'yard',
		$floorObject: $('#spawnBox'),
		floorCharacters: [],
		floorCapacity: mySettings.floor.yard.capacity
	}];

	$('#spawnBox').data( 'modelReference', floorArray[0] );

	function initNewFloorOfType( floorType ){
		var thisFloorSettings = mySettings.floor[ floorType ];
		var thisNewObject = createNewFloor(
			floorType,
			thisFloorSettings,
			floorArray,
			$makeDroppable(
				$createNewFloorDOM(
					floorType,
					thisFloorSettings,
					$('#floorBox')
				),
				thisFloorSettings.dropAccept
			)
		);
		if (thisFloorSettings.hasOwnProperty( 'onCreate' )) {
			timer.newTimer(
				timerInfo[ thisFloorSettings.onCreate ],
				{timerObject: thisNewObject}
			);
		}
		if (thisFloorSettings.template.hasOwnProperty( 'button' )) {
			$(thisNewObject.$floorObject.find( thisFloorSettings.template.button.selector )).on("click", function(){
				thisNewObject.floorData.fencing = true;
				timer.newTimer(
					timerInfo[ thisFloorSettings.template.button.type ],
					{timerObject: thisNewObject}
				);
			});
		}
	}


	mySettings.start.criminals.forEach( function( criminalType ){
		if (thisFloorIsAvailable( floorArray[0])) {
			createNewCriminal(
				criminalType,
				mySettings.criminal[ criminalType ],
				floorArray[0],
				$createNewCharacterDOM(
					criminalType,
					mySettings.criminal[ criminalType ],
					floorArray[0].$floorObject
				)
			);
		}
	});

	mySettings.start.floors.forEach( initNewFloorOfType );

	$('#buyLaboratory').on("click", function(){
		var thisPrice = mySettings.floor.laboratory.price;
		if (money >= thisPrice) {
			money -= thisPrice;
			updateMoney();
			initNewFloorOfType('laboratory');
		}
	});

	$('#buyWarehouse').on("click", function(){
		var thisPrice = mySettings.floor.laboratory.price;
		if (money >= thisPrice) {
			money -= thisPrice;
			updateMoney();
			initNewFloorOfType('warehouse');
		}
	});

})({

	//Settings
	criminal: {
		thief: {
			statName: 'stealth',
			statValue: 1,
			statMax: 6
		},
		scientist:{
			statName: 'genius',
			statValue: 1,
			statMax: 6
		},
		thug:{
			statName: 'power',
			statValue: 1,
			statMax: 6
		}
	},
	hero: {
		police: {
			statName: 'power',
			statValue: 1,
			statMax: 18,
			statVariation: 0.2
		},
		superhero: {
			statName: 'power',
			statValue: 1,
			statMax: 18,
			statVariation: 0.2
		}
	},
	floor: {
		yard: {
			capacity: 3,
			maxCapacity: 6
		},
		laboratory: {
			price: 1000,
			capacity: 2,
			maxCapacity: 5,
			actionName: 'research',
			actionCooldown: 30,
			dropAccept: [ '.scientist', '.thug'],
			onCreate: 'research',
			template: {
				selector: '#laboratoryTemplate',
				progressBar: '.researchProgress'
			},
			templateData: function() {
				return {};
			}
		},
		warehouse: {
			price: 1000,
			capacity: 2,
			maxCapacity: 5,
			actionName: 'fence',
			actionCooldown: 30,
			dropAccept: [ '.thief', '.thug'],
			template: {
				selector: '#warehouseTemplate',
				progressBar: '.fenceProgress',
				button: {
					selector: '.fenceActivate',
					type: 'fencing'
				}
			},
			templateData: function() {
				return {
					fencing: false,
					loot: 0
				};
			}
		}
	},
	store: {
		moneySelector: '.money'
	},
	start: {
		criminals: ['thief', 'scientist', 'thug'],
		floors: ['laboratory', 'warehouse'],
		money: 1500
	},
	timer: {
		clockSpeed: 1000,
		criminalSpawnTime: 2
	},
	researchTree: [
	//Warehouse max
	//Laboratory max
	//Yard max
	//Scientist +stat
	//Thug +stat
	//Thief +stat
	]
});
