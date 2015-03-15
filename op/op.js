var app = angular.module('operator', ['luegg.directives']);

var restServer = 'http://10.10.0.20:8080/';
var restPath = 'TuringREST/API/1.0/';
var restUrl = restServer+restPath;


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////////FACTORIES/////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.factory('OperatorService', function($http) {
	var operatorService = {
		getAvail: function() {
			return $http.get(restUrl + "op/").then(function(response) {
				return response.data;
			});
		}
	};
	return operatorService;
});

/**
 * Gets the latest conversation
 */
app.factory('ConversationService', function($http) {

	var conversationService = {
		getConversations: function() {
			return $http.get(restUrl+'conversations').then(function(response) {
				var conversation = response.data[response.data.length-1];
				return conversation;
			});
		}
	}
	return conversationService;
});
/*
app.factory('MessagesService',function($http) {
	// Needs $scope.cid to be defined in order to work.
	var messagesService = {
		getAllMessages: function() {
			return $http.get(restUrl+'conversations/'+ $scope.cid +'/messages').then(function(response) {
				return response.data;
			});
		}
	}
	return messagesService;
});
*/
///////////////////////////////////////////////////////////////////////////////
/////////////////////////////////CONTROLLERS///////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


/**
 *  Main controller
 */
app.controller('OperatorController',
 function ($scope, $http, $timeout, OperatorService, ConversationService) {

	/**
	 *  FUNCTIONS !! ============================================================
	 *  All the fonctions used in this program
	 */

		 // gets the status of the conversation
		ConversationService.getConvStatus = function() {
    	var promise = ConversationService.getConversations();
    	var promiseMsg;
    	promise.then(function(answer) {
    		$scope.running = answer.running;
    		$scope.cid = answer.cid;
    		// update messages list
    		$http.get(restUrl+'conversations/'+ $scope.cid +'/messages').then(function(response) {
    			$scope.allMessages = response.data;
    		});
    	},
    	function(error) {
      	console.log("error while getting conv status: "+ error);
    	});
  	};



	/**
	 * Change the availability of the operator -----------
	 */

		// Assign service to scope if you'd like to be able call it from your view also
    $scope.opAvailability =  OperatorService;

    // Call the async method and then do stuff with what is returned inside the function
    OperatorService.getAvail().then(function (asyncOperatorData) {
      $scope.opAvailability.opAvailable = asyncOperatorData;
      $scope.avail = $scope.opAvailability.opAvailable.op_available;
      if ($scope.avail) {
					console.log("loaded and scope.avail is true")
					$scope.opAvailabilityClass = "btn-warning";
					$scope.opAvailabilityText = "Rendre l'operateur indisponible";
					$scope.statusClass = "bg-success";
					$scope.statusMsg = "Operator online !";
				} else {
					console.log("loaded and scope.avail is false")
					$scope.opAvailabilityClass = "btn-success";
					$scope.opAvailabilityText = "Rendre l'operateur disponible";
					$scope.statusClass = "bg-danger";
					$scope.statusMsg = "Operator not available";
			}

  		$scope.changeAvailability = function() {
				if ($scope.avail) {
					$scope.newOpAvailable = false;
				} else {
					$scope.newOpAvailable = true;
				}
				console.log($scope.newOpAvailable);
				// send request to webservice
				$http({
		        url: restUrl+"op/",
		        method: "POST",
		        data: {"op_available":$scope.newOpAvailable},
		        headers: {
		            'Content-Type': 'application/json'
		        }
		    }).success(function(data, status, headers, config) {
	        console.log(data);
		      console.log("sent request to server")
					if ($scope.newOpAvailable) {
						$scope.avail = true;
						$scope.opAvailabilityClass = "btn-warning";
						$scope.opAvailabilityText = "Rendre l'operateur indisponible";
						$scope.statusClass = "bg-success";
						$scope.statusMsg = "Operator online !";
					} else {
						$scope.avail = false;
						$scope.opAvailabilityClass = "btn-success";
						$scope.opAvailabilityText = "Rendre l'operateur disponible";
						$scope.statusClass = "bg-danger";
						$scope.statusMsg = "Operator not available";
					}
		    }).error(function(data, status, headers, config) {
		      console.log(config);
		    });
			}
    });



	/**
	 *  TIMER !! ================================================================
	 *  Everything here is executed every second.
	 */
		var timer;
    function chrono() {
      // When the timeout is defined, it returns a
      // promise object.
      $scope.chrono = $timeout(function () {

      }, 1000);
      $scope.chrono.then(
      	// success:
        function () {
        	// List of functions that are executed
        	chrono();
     	  	ConversationService.getConvStatus();
        },
        // Error:
        function () {
          console.log("Timer end!");
        }
      );
    }
    // launch the timer
    chrono();
});

/**
 *  Send messages controller
 */
app.controller('MsgController',
	function($scope, $http) {
  // envoi d'un message
	this.addMessage = function(message) {
    $http({
        url: restUrl+'messages/'+ $scope.cid,
        method: "POST",
        data: {
          "is_participant": false,
          "messageContent": this.message.messageContent,
          },
        headers: {
            'Content-Type': 'application/json'
        }
    }).success(function(data, status, headers, config) {
      console.log("ok, message added");
    }).error(function(data, status, headers, config) {
        console.log("error occured"+ data);
    });
   	this.message = {};
  }


});


app.directive("conversation", function(){
  return {
    restrict: "E",
    templateUrl:"_conversation.html"
  };
});