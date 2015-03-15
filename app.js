var app = angular.module('visitor', ['luegg.directives']);

var restServer = 'http://10.10.0.20:8080';
var restPath = 'TuringREST/API/1.0';
var restUrl = restServer+'/'+restPath;


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////////FACTORIES/////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.factory('operatorService', function($http) {
  var operatorService = {
    getAvail: function() {
      return $http.get(restUrl+"/op/").then(function(response) {
        return response.data.op_available;
      });
    }
  };
  return operatorService;
});

/*app.factory('getMessageService', function($http,$q,$timeout) {
  var deferred = $q.defer();
  $timeout(function() {
    // Simulated slow fetch from an HTTP server
      deferred.resolve(['Item 1', 'Item 2', 'Item 3'])
  }, 3000);
  return deferred.promise;
}*/

/**
 * Calls the statisticsService
 */
app.factory('statisticsService', function($http) {
  console.log('statisticsService factory called');
  return {
    getStats: function() {
      return $http.get(restUrl + '/stats');
    }
  }
});

///////////////////////////////////////////////////////////////////////////////
////////////////////////////////CONTROLLERS////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * STATE CONTROLLER -----------------------------------------------------------
 * Controls the state of the interface. Is the main entry of the program.
 */
app.controller('StateController', function($scope, $http, $timeout, operatorService, statisticsService) {
  //$scope.opAvailability =  operatorService;
  var stCtrl = this;

  $scope.state = "";
  $http.defaults.useXDomain = true;
  stCtrl.showButton = true;
  console.log("statectrl");

  this.updateState = function(newState) {
    console.log("updating state")
    stCtrl.oldState = $scope.state;
    $scope.state = newState;
    /* display stuff */
    switch ($scope.state) {
      case "running":
        stCtrl.showButton = false;
        stCtrl.showConversation = true;
        stCtrl.showVote = false;
        stCtrl.showResult = false;
      break;
      case "vote":
        stCtrl.showButton = false;
        stCtrl.showConversation = false;
        stCtrl.showVote = true;
        stCtrl.showResult = false;
      break;
      case "results":
        stCtrl.showButton = false;
        stCtrl.showConversation = false;
        stCtrl.showVote = false;
        stCtrl.showResult = true;
      break;
      default:
        stCtrl.showButton = true;
        stCtrl.showConversation = false;
        stCtrl.showVote = false;
        stCtrl.showResult = false;
      break;
    }

    /* Create a conversation */
      console.log("new state is: " +$scope.state);
  }


  statisticsService.getStatistics = function() {
    var promise = statisticsService.getStats();
    promise.then(function(answer) {
      $scope.percentage = Math.ceil(answer.data.percentage * 1000) / 10;
    },
    function(error) {
      console.log("error in statisticsService: "+ error);
    });
  };
  operatorService.getOperator = function() {
    var promise = operatorService.getAvail();
    promise.then(function(answer) {
      console.log(answer);
      if (answer) {
        $scope.op = "humain";
      } else {
        $scope.op = "une I.A.";
      }
    },
    function(error) {
      console.log("error in operatorService: "+ error);
    });
  };

  // UPDATES THE MESSAGES
  this.updateMessages = function() {
    $http({
        url: restUrl+'/conversations/'+ $scope.cid +'/messages',
        method: "GET"
      }).success(function(data,status,headers,config) {
        $scope.allMessages = data; // on remplace la liste des messages par les données trouvées
      }).error(function(data,status,headers,config) {
        console.log("error in updating messages: "+status);
    });
  }
  // LAUNCHES VOTE, STOPS CONVERSATION
  this.launchVote = function() {
    stCtrl.updateState("vote");
    console.log("launchVote is launched");
    $timeout.cancel($scope.countdown);
    $http({
        url: restUrl+'/conversations/'+$scope.cid+'/stop',
        method: "PUT",
        data: {},
        headers: {
            'Content-Type': 'application/json'
        }
    }).success(function(data, status, headers, config) {
       console.log(status + " OK");
    }).error(function(data, status, headers, config) {
      console.log("error: " + status);
    });

  }

  // START THE CONVERSATION (TIMER, UPDATE MESSAGES)
  this.startConversation = function() {
    $scope.opAvailability =  operatorService;
    console.log($scope.opAvailability);
    stCtrl.updateState("running");
    operatorService.getAvail().then(function (asyncOperatorData) {
      if (asyncOperatorData.op_available) {
          $scope.op = "humain";
      } else {
          $scope.op = "I.A.";
      }
      $scope.ai = !asyncOperatorData;
      $http({
        url: restUrl+'/conversations/',
        method: "POST",
        data: {"ai":$scope.ai},
        headers: {
          'Content-Type': 'application/json'
        }
      }).success(function(data, status, headers, config) {
       $scope.cid = data.value.match("[0-9]+$")[0];
      }).error(function(data, status, headers, config) {
        console.log("error: " + status);
      });
    });


    // CONVERSATION DURATION
    $scope.counter = 120; // duree de la conversation en secondes
    var timer;
    function countdown() {
      $scope.counter--;
      // When the timeout is defined, it returns a
      // promise object.
      $scope.countdown = $timeout(function () {

      }, 1000);
      $scope.countdown.then(
        function () {
          countdown();
          stCtrl.updateMessages();
          console.log('should update messages');
        },
        function () {
          console.log("Timer end!");
        }
      );
      if ($scope.counter <= 0) {
        stCtrl.launchVote();

      }
    }
    countdown();
    // When the DOM element is removed from the page,
    // AngularJS will trigger the $destroy event on
    // the scope.
    // Cancel timeout
    $scope.$on("$destroy", function (event) {
        $timeout.cancel($scope.countdown);
    });
    // END TIMER
  }



  this.getResults = function() {
    stCtrl.updateState("results");
    statisticsService.getStatistics();
    operatorService.getOperator();

  }
  this.reset = function() {
    stCtrl.updateState("idle");
    $scope.allMessages = []; // vider les messages lorsqu'on recommence
    location.reload(); // juste pour être sûr.
  }
});



/**
 * MESSAGE CONTROLLER ---------------------------------------------------------
 * Controls the adding of a message
 */

app.controller('MsgController', function($scope, $http) {
  MsgController = this;
  // envoi d'un message
	this.addMessage = function(message) {
    $http({
        url: restUrl+'/messages/'+ $scope.cid,
        method: "POST",
        data: {
          "is_participant": true,
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


/**
 * VOTE CONTROLLER ------------------------------------------------------------
 * Controls the voting system (if the participant thinks it's a bot or not)
 */
app.controller('VoteController', function($scope, $http) {
  this.voteA = function() {
    $scope.vote = "I.A.";
    $http({
        url: restUrl+'/conversations/'+$scope.cid+'/vote/ai',
        method: "PUT",
        data: {},
        headers: {
            'Content-Type': 'application/json'
        }
    }).success(function(data, status, headers, config) {
       console.log(status + " OK");
    }).error(function(data, status, headers, config) {
      console.log("error in VoteController: " + status);
    });
  }
  this.voteH = function() {
    $scope.vote = "humain";
    $http({
        url: restUrl+'/conversations/'+$scope.cid+'/vote/human',
        method: "PUT",
        data: {},
        headers: {
            'Content-Type': 'application/json'
        }
    }).success(function(data, status, headers, config) {
       console.log(status + " OK");
    }).error(function(data, status, headers, config) {
      console.log("error in VoteController: " + status);
    });
  }
});

/**
 * RESULT CONTROLLER-----------------------------------------------------------
 */
/*app.controller('ResultController', function($scope, statisticsService) {
  statisticsService.getStatistics = function() {
    var promise = statisticsService.getStats();
    promise.then(function(answer) {
      $scope.percentage = Math.ceil(answer.data.percentage * 1000) / 10;
    },
    function(error) {
      console.log("error in ResultController: "+ error);
    });
  };
  statisticsService.getStatistics();

  this.vote = $scope.vote;
})
*/


///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// DIRECTIVES ///////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

app.directive("intro", function(){
  return {
    restrict: "E",
    templateUrl:"_1_intro.html"
  };
})

app.directive("conversation", function(){
  return {
    restrict: "E",
    templateUrl:"_2_conversation.html"
  };
});


app.directive("vote", function() {
  return {
    restrict: "E",
    templateUrl:"_3_vote.html"
  }
});

app.directive("result", function(){
  return {
    restrict: "E",
    templateUrl:"_4_result.html"
  };
});


