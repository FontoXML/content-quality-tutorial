define([
    './api/registerAnnotationTypes.jsx'
], function (
    registerAnnotationTypes
    ) {
    'use strict';
 
    return function install () {
        registerAnnotationTypes.default();
    };
});