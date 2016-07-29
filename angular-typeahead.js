//requires jquery scrollintoview

angular.module("angularTypeaheadModule", ['ui.bootstrap']).directive("angularTypeahead", function ($filter, $timeout) {
    return {
        restrict: 'E',
        template: "<div>"+
                    "<div class=\"input-group\" style=\"width: 100%\">"+
                        "<input autocomplete=\"off\" id={{name}} class=form-control placeholder=\"Válasszon vagy gépeljen\" ng-model=inlineModel ng-mousedown=\"onBlur()\" ng-blur=\"onBlurWithTimeout()\" ng-focus=\"onFocus()\" ng-required=\"required\" ng-disabled=\"disabled\" ng-keydown=\"keyPressed($event)\" ng-class=\"ngClass\" >"+
                        "<span class=input-group-btn>"+
                            "<button class=\"btn btn-default dropdown-toggle\" ng-disabled=\"disabled\" ng-click=\"changeDropdown()\" type=\"button\">"+
                                "<span class=caret></span>"+
                            "</button>"+
                        "</span>"+
                    "</div>"+
                    "<ul id=\"{{name + 'Dropdown'}}\" class=dropdown-menu role=menu style=max-height:200px;overflow-y:auto ng-class=\"{open : dropdownOpen, closed: !dropdownOpen }\">"+
                        "<li ng-repeat=\"op in filtered\" id=\"{{name + $index}}\" >"+
                            "<a href ng-click=\"onSelect(op, $event)\" ng-class=\"{highlighted : active===$index}\">{{op[config.label]}}</a>"+
                        "</li>"+
                    "</ul>"+
                "</div>",
        scope: {
            options: "=",
            required: "=?ngRequired",
            disabled: "=?ngDisabled",
            mdl: "=ngModel",
            name: "@",
            ngClass:"=?ngClass",
            config: "=?",
        },
        controller: function($scope) {
            //dropdown is closed and no active element is shown at the moment
            $scope.dropdownOpen = false;
            $scope.filtered = angular.copy($scope.options);
            $scope.active=-1;
            //if config object is not defined, we create a default one
            if (!angular.isDefined($scope.config)) {
                $scope.config = {
                    id : 'id',
                    label: 'label'
                };
            }

            var getId = function(e) {
                return e[$scope.config.id];
            };

            //setting this true can disable the default dropdown opeing mechanism. Must be set back to false after used
            var disableOpeningDropdown = false;
            //options can be loaded via promise this way.
            var optionsLoaded = false;

            var defaultModelExist = $scope.mdl !== null && angular.isDefined($scope.mdl);
            var startup = true;
            $scope.dropDownFilter = "";


            //options changing
            $scope.$watch("options", function(n, o){
                defaultModelExist = $scope.mdl !== null && angular.isDefined($scope.mdl);
                if (angular.isDefined($scope.options) && $scope.options.length > 0){
                    optionsLoaded = true;
                    if (defaultModelExist){
                        //when we have default model to choose from
                        var l = false;
                        for (var i = 0; i < $scope.options.length && !l; ++i){
                            if ($scope.options[i][$scope.config.id] === $scope.mdl){
                                $scope.inlineModel = $scope.options[i][$scope.config.label];
                                $scope.active = i;
                                l = true;
                            }
                        }
                        if (!l){
                            disableOpeningDropdown = true;
                            $scope.inlineModel = "";
                            $scope.active = -1;
                        }
                    }
                    else{
                        //setting default inlineModel -> will trigger inlineModel watch, and set the startu properties
                        $scope.inlineModel = "";
                        $scope.active = -1;
                    }
                }
            });

            $scope.$watch("active", function(newValue, oldValue) {
                if(newValue < 0) return;

                $('#' + $scope.name +''+ $scope.active).scrollintoview({
                    duration: 10
                });
            });

            var closedOnBlur = false;
            $scope.onBlur = function(){
                $scope.dropdownOpen = false;
            };

            $scope.onBlurWithTimeout = function(){
                $scope.dropdownOpen = false;
            };


            $scope.changeDropdown = function(){
                if ($scope.dropdownOpen){
                    //if open, we just close it
                    $scope.dropdownOpen = false;
                }else{
                    //if closed, we open it

                    angular.element('#' + $scope.name).focus();
                    $scope.dropdownOpen = true;

                    //if we have a valid selection, we should set the focus there
                    if ($scope.mdl !== null) {
                        $scope.active = $scope.filtered.map(getId).indexOf($scope.mdl);
                    }
                }
            };

            var optionSelected = false;
            $scope.onSelect = function(option, e){
                optionSelected = true;
                $scope.mdl = option[$scope.config.id];
                $scope.inlineModel = option[$scope.config.label];
                $scope.dropdownOpen = false;
            };

            var selectExactMatch = function() {
                var pat = $scope.inlineModel.toLowerCase();

                for(var i = 0; i<$scope.options.length; ++i) {
                    if(pat === $scope.options[i][$scope.config.label].toLowerCase()) {
                        optionSelected = true;
                        $scope.mdl = $scope.options[i][$scope.config.id];
                        $scope.active = $scope.filtered.map(getId).indexOf($scope.mdl);
                        return;
                    }
                }

                $scope.mdl = null;
                $scope.active = -1;
            };

            var filterOptions = function(val) {
                if(!angular.isDefined(val) || val === "") {
                    $scope.filtered = $scope.options;
                    return;
                }

                var fil = val.toLowerCase();
                $scope.filtered = _.filter($scope.options, function(value) {
                    return (value[$scope.config.label].toLowerCase().indexOf(fil)) != -1;
                });
            };

            $scope.$watch("inlineModel", function(newValue, oldValue){
                //when options no loaded yet, we do not care about this
                if(!optionsLoaded) return;

                filterOptions(newValue);

                //if we have default model, dropdown needs to be closed at startup
                if (defaultModelExist && startup){
                    startup = false;
                    //opening dropdown
                    $scope.dropdownOpen = false;
                    return;
                }

                //we do not have a default model and we have at startup
                if (startup){
                    $scope.dropdownOpen = false;
                    startup = false;
                    return;
                }

                if (!optionSelected){
                    //changing model to null. model can only be active when we are straight after click or after enter event
                    $scope.dropdownOpen = true && !disableOpeningDropdown;
                    disableOpeningDropdown = false;
                    $scope.mdl = null;
                    $scope.inlineModel = $scope.inlineModel;
                    $scope.active = -1;

                    selectExactMatch();
                    return;
                }

                optionSelected = false;
                selectExactMatch();
            });

            $scope.keyPressed = function(e){
                switch(e.keyCode){
                    case 40: {
                        e.preventDefault();
                        if (!$scope.dropdownOpen){
                            $scope.dropdownOpen = true;
                        }else{
                            if($scope.active < $scope.filtered.length -1 ) {
                                $scope.active++;
                            }
                        }
                        break;
                    }
                    case 38: {
                        e.preventDefault();
                        if($scope.active > 0) {
                            $scope.active--;
                        }
                        break;
                    }
                    case 13: {
                        e.preventDefault();
                        if ($scope.active > -1){
                            $scope.onSelect($scope.filtered[$scope.active]);
                        }
                        break;
                    }
                }
            };

            $(document).ready(function() {
                $timeout(function(){
                    $('#' + $scope.name + 'Dropdown').bind('mousedown',function(e){
                        e.preventDefault();
                    });
                }, 1000);
            });
        }
     };
});
