/* global settings */
'use strict';

const settings = require('./settings');
const Error = require('./error');

let http = require('../deps/follow-redirects').http;  // Non-const enables test mocking
let https = require('../deps/follow-redirects').https;  // Non-const enables test mocking

function httpGetWithProxy(targetUrl, callback) {    
    if (!targetUrl) throw Error('target url is not valid');
    
    var targetParsed = parseUrl(targetUrl);
    var targetClient = targetParsed.scheme === 'https' ? https : http;
    
    var proxy = settings.getProxy();
    var proxyOptions = getProxyOptions(targetUrl);
    if (!proxy || !proxyOptions) return targetClient.get(targetUrl, callback);
    
    var proxyParsed = parseUrl(proxy);
    var proxyClient = proxyParsed.scheme === 'https' ? https : http;
    
    return proxyClient.get(proxyOptions, callback);
}

function getProxyOptions(targetUrl) {
    if (!targetUrl) return null;
    
    var proxy = settings.getProxy();
    if (!proxy) return null;
    
    var targetParsed = parseUrl(targetUrl);
    var nextParsed = parseUrl(proxy);
    
    if (!nextParsed.port) {
        const schemePortDict = {
            'http': 80,
            'https': 443,
            'ftp': 21,
            'ftps': 990,
            'tftp': 69,
        };
        if (nextParsed.scheme in schemePortDict) {
            nextParsed.port = schemePortDict[nextParsed.scheme];
        }
    }
    
    var options = {
        host: nextParsed.hostname,
        path: targetUrl,
    };
    
    if (!isNaN(nextParsed.port)) {
        options.port = nextParsed.port;
    }
    
    if (nextParsed.username) {
        // options.headers = options.headers || {};
        // options.headers['Proxy-Authorization'] = 
            // 'Basic ' + Buffer.from(nextParsed.auth).toString('base64');
        options.auth = nextParsed.auth;
    }
    
    return options;
}

function parseUrl(url) {
    if (!url) throw Error('url is not valid');
    
    var result = {};
    var schemeMarkAfterIndex = -1;
    var start = 0;
    
    var findOne = function(markList, startIndex, callback) {
        var markIndex = -1;
        var mark = null;
        for (var i = 0; i < markList.length; i++) {
            var index = url.indexOf(markList[i], startIndex);
            if (-1 !== index) {
                if (-1 === markIndex || index < markIndex) {
                    markIndex = index;
                    mark = markList[i];
                }
            }
        }
        
        if (-1 !== markIndex) {
            if(callback) callback(mark, markIndex);
            return true;
        }
        
        return false;
    };
    
    if (start < url.length && !result.scheme) {
        findOne([':///', '://', ':/', ':\\', '//', '\\\\'], start, function(schmark, schindex) {
            var found = true;
            findOne(['/', '\\'], start, function(slash, slashIndex) {
                if (slashIndex < schindex) found = false;
            });
            if (!found) return;
            
            result.scheme = url.slice(start, schindex);
            if ('' === result.scheme) result.scheme = 'file';
            result.protocol = result.scheme + ':';
            
            start = schemeMarkAfterIndex = schindex + schmark.length;
        });
    }
    
    if (start < url.length && !result.auth) {
        findOne(['@'], start, function(at, atIndex) {
            var semicolonIndex = url.indexOf(':', start);
            var slashIndex = url.indexOf('/', Math.max(schemeMarkAfterIndex, 0));
            
            var hasPassword = -1 !== semicolonIndex && semicolonIndex < atIndex;
            if (-1 == slashIndex || atIndex < slashIndex) {
                result.auth = url.slice(start, atIndex);
                
                if (result.auth) {
                    result.username = url.slice(start, hasPassword ? semicolonIndex : atIndex);
                    if (hasPassword) result.password = url.slice(semicolonIndex + 1, atIndex);
                    else result.auth += ':';
                } else {
                    delete result['auth'];
                }
                
                start = atIndex + 1;
            }
        });
    }
    
    var setHost = function(startIndex, nextIndex) {
        var semicolonIndex = url.indexOf(':', startIndex);
        if (-1 != semicolonIndex && semicolonIndex < nextIndex) {
            result.hostname = url.slice(startIndex, semicolonIndex);
            result.port = url.slice(semicolonIndex + 1, nextIndex);
        }
        result.host = url.slice(startIndex, nextIndex);
        if (!result.hostname) result.hostname = result.host;
        
        start = nextIndex;
    };
    if (start < url.length && !result.host) {
        findOne(['/', '\\'], start, function(slash, slashIndex) {
            setHost(start, slashIndex);
        });
    }
    
    if (start < url.length && !result.pathname) {
        findOne(['?'], start, function(question, qindex) {
            if (!result.host) setHost(start, qindex);
            else {
                result.pathname = url.slice(start, qindex);
                start = qindex;
            }
        });
    }
    
    if (start < url.length && !result.search) {
        findOne(['?'], start, function(question, qindex) {
            result.search = url.slice(qindex + 1);
            start = url.length;
        });
    }
    
    if (start < url.length) {
        if (!result.host) setHost(start, url.length);
        else if (!result.pathname) result.pathname = url.slice(start);
    }
    
    return result;
}

module.exports = {
    httpGetWithProxy,
	getProxyOptions,
    parseUrl,
};